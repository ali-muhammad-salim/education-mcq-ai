import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { PrismaClient } from '@prisma/client';
import { createHash, randomUUID } from 'node:crypto';
import { NextRequest } from 'next/server';
const url=process.env.TEST_DATABASE_URL;
if(url&&!new URL(url).pathname.includes('_test'))throw Error('Dedicated test database required');
const storage=vi.hoisted(()=>vi.fn(async()=>({storageKey:'private/resources/00000000-0000-0000-0000-000000000000-source.pdf',url:'/api/assets/test',fileSize:20,mimeType:'application/pdf'})));
vi.mock('@/lib/storage',()=>({uploadEducationalAsset:storage}));
describe.skipIf(!url)('Reviewed folder import',()=>{
  let db:PrismaClient,owner:string,student:string,documentId:string,artifactId:string;
  const suffix=randomUUID(),name='Import fixture '+suffix,token=randomUUID(),studentToken=randomUUID(),batch='a'.repeat(64),sha=(s:string)=>createHash('sha256').update(s).digest('hex');
  const subjects:string[]=[];
  const pdf='%PDF-1.4\nSynthetic intake fixture';
  beforeAll(async()=>{
    process.env.DATABASE_URL=url;vi.stubEnv('APP_URL','http://localhost');vi.stubEnv('GEMINI_EMBEDDING_MODEL','fixture-embedding');
    db=new PrismaClient({datasources:{db:{url}}});
    owner=(await db.user.create({data:{name:'Import administrator',email:'bulk-'+suffix+'@example.test',role:'ADMIN'}})).id;
    student=(await db.user.create({data:{name:'Import student',email:'bulk-student-'+suffix+'@example.test',role:'STUDENT'}})).id;
    for(const [userId,value]of [[owner,token],[student,studentToken]])await db.userSession.create({data:{userId,token:sha(value),expiresAt:new Date(Date.now()+600000)}});
  });
  afterAll(async()=>{
    if(!db)return;
    if(!owner||!student){await db.$disconnect();vi.unstubAllEnvs();return;}
    await db.durableJob.deleteMany({where:{ownerId:{in:[owner,student]}}});
    await db.auditLog.deleteMany({where:{userId:{in:[owner,student]}}});
    await db.knowledgeDocument.deleteMany({where:{ownerId:owner}});
    await db.subject.deleteMany({where:{name}});
    await db.userSession.deleteMany({where:{userId:{in:[owner,student]}}});
    await db.user.deleteMany({where:{id:{in:[owner,student]}}});
    const limits=[owner,student].flatMap(id=>['bulk-upload:','bulk-upload-bytes:'].map(prefix=>sha(prefix+id))).concat(sha('weighted:'+suffix));
    await db.requestLimit.deleteMany({where:{key:{in:limits}}});
    await db.$disconnect();await (await import('@/lib/prisma')).default.$disconnect();vi.unstubAllEnvs();
  });
  function request(credential=token,expected=sha(pdf),origin='http://localhost'){
    const form=new FormData();form.set('file',new File([pdf],'source.pdf',{type:'application/pdf'}));
    for(const [key,value]of Object.entries({resourceType:'resource_guide',subject:name,board:'AKU-EB',classLevel:'Class IX',classLevels:'[9,10]',expectedSha256:expected,importBatchId:batch,publishAfterReview:'true'}))form.set(key,value);
    return new NextRequest('http://localhost/api/admin/material-import',{method:'POST',headers:{authorization:'Bearer '+credential,origin},body:form});
  }
  it('hash-checks the source, isolates admin access, and resumes without another upload',async()=>{
    const {POST,GET}=await import('@/app/api/admin/material-import/route');
    expect((await POST(request(studentToken))).status).toBe(403);
    expect((await POST(request(token,sha(pdf),'https://untrusted.example'))).status).toBe(403);
    expect((await POST(request(token,'b'.repeat(64)))).status).toBe(422);expect(storage).not.toHaveBeenCalled();
    const first=await POST(request());expect(first.status).toBe(202);const body=await first.json();
    const repeated=await POST(request());expect(repeated.status).toBe(200);expect((await repeated.json()).jobId).toBe(body.jobId);expect(storage).toHaveBeenCalledTimes(1);
    expect(await db.durableJob.count({where:{ownerId:owner}})).toBe(1);
    const status=await GET(new NextRequest('http://localhost/api/admin/material-import?batch='+batch,{headers:{authorization:'Bearer '+token}}));
    expect(status.headers.get('cache-control')).toBe('no-store');expect((await status.json()).jobs[0].sha256).toBe(sha(pdf));
    const rows=await db.subject.findMany({where:{name},include:{academicClass:true}});subjects.push(...[9,10].map(grade=>rows.find(row=>row.academicClass.level===grade)!.id));
    expect(subjects).toHaveLength(2);
  });
  it('defers dependent papers before reading assets or calling a provider',async()=>{
    const original=await db.durableJob.findFirstOrThrow({where:{ownerId:owner}});
    const {ingestTrustedDocument}=await import('@/services/ingestion/trusted');
    const {JobDeferred}=await import('@/services/jobs/deferred');
    const job={...original,payload:{resourceType:'model_paper',storageKey:'private/resources/00000000-0000-0000-0000-000000000000-source.pdf',meta:{board:'AKU-EB',subject:name,classLevel:'Class IX',syllabusSourceSha256:'c'.repeat(64)}}};
    await expect(ingestTrustedDocument(job,new AbortController().signal)).rejects.toBeInstanceOf(JobDeferred);
    expect(await db.knowledgeDocument.count({where:{ownerId:owner}})).toBe(0);
  });
  it('publishes shared guides only after every source page is approved',async()=>{
    documentId=(await db.knowledgeDocument.create({data:{ownerId:owner,subjectId:subjects[0],sha256:sha(suffix),storageKey:'private/resources/00000000-0000-0000-0000-000000000000-source.pdf',resourceType:'resource_guide',pipelineVersion:'test',totalPages:1,status:'NEEDS_REVIEW',publishAfterReview:true,catalogMetadata:{scopeSubjectIds:subjects}}})).id;
    artifactId=(await db.knowledgeArtifact.create({data:{documentId,pageNumber:1,content:'Verified source',contentHash:sha('page'),sourceImageKey:'private/resources/00000000-0000-0000-0000-000000000000-page.png',data:{}}})).id;
    const {materialScopeWhere,publicMaterialWhere}=await import('@/services/materials/catalog');
    for(const id of subjects)expect(await db.knowledgeDocument.count({where:{...publicMaterialWhere,...materialScopeWhere([id]),id:documentId}})).toBe(0);
    const {approveCheckedPage}=await import('@/services/ingestion/publication');
    const data={checksComplete:true,conflicts:[],extractionModel:'gemini-extractor',verificationModel:'gemini-verifier',verification:{faithful:true,complete:true,mappingsCorrect:true,conflicts:[]}};
    const approve=(contentHash:string,value:unknown)=>db.$transaction(tx=>approveCheckedPage(tx,{id:artifactId,documentId,ownerId:owner,contentHash,data:value,index:false}));
    expect(await approve(sha('stale'),data)).toBe(false);
    expect(await approve(sha('page'),{...data,verificationModel:'gemini-extractor'})).toBe(false);
    expect(await approve(sha('page'),{...data,conflicts:['Missing label']})).toBe(false);
    expect(await approve(sha('page'),data)).toBe(true);expect(await approve(sha('page'),data)).toBe(false);
    expect(await db.auditLog.count({where:{resourceId:artifactId,action:'KNOWLEDGE_AUTO_APPROVED'}})).toBe(1);
    for(const id of subjects)expect(await db.knowledgeDocument.count({where:{...publicMaterialWhere,...materialScopeWhere([id]),id:documentId}})).toBe(1);
    expect(await db.knowledgeDocument.count({where:{...publicMaterialWhere,...materialScopeWhere(['unrelated-subject']),id:documentId}})).toBe(0);
    await db.knowledgeArtifact.update({where:{id:artifactId},data:{status:'PENDING_REVIEW',reviewerId:null,reviewedAt:null}});
    expect(await db.knowledgeDocument.count({where:{...publicMaterialWhere,...materialScopeWhere([subjects[1]]),id:documentId}})).toBe(0);
    await expect(db.$transaction(async tx=>{await approveCheckedPage(tx,{id:artifactId,documentId,ownerId:owner,contentHash:sha('page'),data,index:true});throw Error('Simulated transaction failure');})).rejects.toThrow('Simulated transaction failure');
    expect((await db.knowledgeArtifact.findUniqueOrThrow({where:{id:artifactId}})).status).toBe('PENDING_REVIEW');
    expect(await db.auditLog.count({where:{resourceId:artifactId,action:'KNOWLEDGE_AUTO_APPROVED'}})).toBe(1);
    expect(await db.durableJob.count({where:{ownerId:owner,kind:'AI_EMBEDDING'}})).toBe(0);
  });
  it('enforces a cumulative byte allowance across requests',async()=>{
    const {rateLimit}=await import('@/lib/security');
    await rateLimit('weighted:'+suffix,10,3600,6);await rateLimit('weighted:'+suffix,10,3600,4);
    await expect(rateLimit('weighted:'+suffix,10,3600,1)).rejects.toMatchObject({code:'RATE_LIMITED'});
  });
});
