import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireUser, rateLimit } from "@/lib/security";
import { ApiError, apiError } from "@/lib/api";
import { uploadEducationalAsset } from "@/lib/storage";
import { enqueueJob } from "@/services/jobs/queue";
import { assertAIWorkerAvailable } from "@/services/ai/readiness";
import { ensureUploadScope } from "@/services/materials/scope";
import { materialResourceTypes } from '@/lib/materialTypes';
import { createHash } from 'node:crypto';
import prisma from '@/lib/prisma';
export const ingestionPayloadSchema = z
  .object({
    resourceType: z.enum([...materialResourceTypes,'all_defaults']),
    storageKey: z.string().optional(),
    keyStorageKey: z.string().optional(),
    parentDocumentId: z.string().max(80).optional(),
    publishAfterReview: z.boolean().default(false),
    reprocess: z.boolean().default(false),
    studyResources: z.boolean().default(false),
    meta: z
      .object({
        title: z.string().max(240).optional(),
        classLevels:z.array(z.number().int().min(9).max(12)).min(1).max(4).optional(),
        importBatchId:z.string().regex(/^[a-f0-9]{64}$/).optional(),
        sourceSha256:z.string().regex(/^[a-f0-9]{64}$/).optional(),
        importNote:z.string().max(2000).optional(),
        syllabusSourceSha256:z.string().regex(/^[a-f0-9]{64}$/).optional(),
        studyKinds:z.array(z.enum(['CHAPTER_NOTES','NUMERICAL_GUIDE','FORMULA_SHEET','CHEAT_SHEET','FLASHCARDS','PRACTICE_SET','CHAPTER_READER'])).min(1).max(7).optional(),
        syllabusEffectiveFrom:z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
        subject: z.string().max(160).default("Physics"),
        board: z.string().max(160).default("AKU-EB"),
        classLevel: z.string().max(80).default("Class IX"),
        paperCode: z.string().max(160).optional(),
        paperComponent: z.string().max(80).optional(),
        solutionStatus: z.string().max(80).optional(),
        examYear: z.string().max(20).optional(),
        fileUrl: z.string().max(2000).optional(),
      })
      .default(() => ({
        subject: "Physics",
        board: "AKU-EB",
        classLevel: "Class IX",
      })),
  })
  .refine(
    (v) => v.resourceType === "all_defaults" || Boolean(v.storageKey),
    "A source file is required.",
  );
export async function handleUpload(req: NextRequest, options?:{bulk?:boolean}) {
  try {
    const user = await requireUser(req, ["ADMIN"]);
    const bulk=options?.bulk===true;
    await rateLimit((bulk?'bulk-upload:':'upload:') + user.id, bulk?200:20, 3600);
    await assertAIWorkerAvailable("INGESTION");
    const form = await req.formData(),
      file = form.get("file"),
      keyFile = form.get("keyFile");
    if (
      !(file instanceof File) ||
      file.type !== "application/pdf" ||
      file.size > 50 * 1024 * 1024
    )
      throw new ApiError(
        400,
        "INVALID_FILE",
        "Choose a PDF smaller than 50 MB.",
      );
    const resourceType = z
      .enum(materialResourceTypes)
      .parse(form.get("resourceType") || form.get("type") || "syllabus");
    if(['answer_key','e_marking'].includes(resourceType)&&!form.get('parentDocumentId'))throw new ApiError(422,'PAPER_REFERENCE_REQUIRED','Choose the matching original paper before uploading its answer key or marking notes.');
    const bytes=Buffer.from(await file.arrayBuffer());
    const sha256=createHash('sha256').update(bytes).digest('hex');
    if(bulk){
      const expected=z.string().regex(/^[a-f0-9]{64}$/).parse(form.get('expectedSha256'));
      if(expected!==sha256)throw new ApiError(422,'SOURCE_HASH_CHANGED','This file no longer matches the reviewed import manifest.');
    }
    const classes=form.get('classLevels')?z.array(z.number().int().min(9).max(12)).min(1).max(4).parse(JSON.parse(String(form.get('classLevels')))):undefined;
    const batchId=bulk?z.string().regex(/^[a-f0-9]{64}$/).parse(form.get('importBatchId')):undefined;
    const identity={ownerId:user.id,sha256,resourceType,subject:String(form.get('subject')||'Physics'),board:String(form.get('board')||'AKU-EB'),classLevel:String(form.get('classLevel')||'Class IX'),classLevels:classes?[...new Set(classes)].sort():undefined,effectiveFrom:form.get('syllabusEffectiveFrom')||null,paperComponent:form.get('paperComponent')||null,examYear:form.get('examYear')||null,publishAfterReview:form.get('publishAfterReview')==='true',syllabusSourceSha256:form.get('syllabusSourceSha256')||null,studyKinds:form.get('studyKinds')||null};
    const bulkJobId='bulk-ingest-'+createHash('sha256').update(JSON.stringify(identity)).digest('hex');
    if(bulk){
      const existing=await prisma.durableJob.findFirst({where:{id:bulkJobId,ownerId:user.id,kind:'INGESTION'},select:{id:true,status:true}});
      if(existing)return NextResponse.json({success:true,jobId:existing.id,status:existing.status,duplicate:true,message:'This exact source and scope are already queued or processed.'},{status:200});
      await rateLimit('bulk-upload-bytes:'+user.id,512*1024*1024,3600,file.size);
    }
    const asset = await uploadEducationalAsset(bytes,file.name,file.type);
    let keyStorageKey: string | undefined;
    if (keyFile instanceof File && keyFile.size) {
      if (keyFile.type !== "application/pdf" || keyFile.size > 50 * 1024 * 1024)
        throw new ApiError(
          400,
          "INVALID_KEY_FILE",
          "Choose a PDF answer key smaller than 50 MB.",
        );
      keyStorageKey = (
        await uploadEducationalAsset(
          Buffer.from(await keyFile.arrayBuffer()),
          keyFile.name,
          keyFile.type,
        )
      ).storageKey;
    }
    const payload = ingestionPayloadSchema.parse({
      resourceType,
      publishAfterReview: form.get("publishAfterReview") === "true",
      reprocess: form.get("reprocess") === "true",
      studyResources:
        resourceType === "textbook" && form.get("studyResources") === "true",
      storageKey: asset.storageKey,
      parentDocumentId:form.get('parentDocumentId') || undefined,
      keyStorageKey,
      meta: {
        title: String(form.get('title')||file.name).slice(0, 240),
        classLevels:classes,
        importBatchId:batchId,
        sourceSha256:bulk?sha256:undefined,
        importNote:bulk?form.get('importNote')||undefined:undefined,
        syllabusSourceSha256:form.get('syllabusSourceSha256')||undefined,
        studyKinds:form.get('studyKinds')?JSON.parse(String(form.get('studyKinds'))):undefined,
        syllabusEffectiveFrom:form.get('syllabusEffectiveFrom') || undefined,
        paperCode: form.get("paperCode") || undefined,
        subject: form.get("subject") || "Physics",
        board: form.get("board") || "AKU-EB",
        classLevel:
          form.get("classLevel") || "Class " + (form.get("grade") || "IX"),
        paperComponent: form.get("paperComponent") || undefined,
        solutionStatus: form.get("solutionStatus") || undefined,
        examYear: form.get("examYear") || undefined,
        fileUrl: asset.url,
      },
    });
    payload.meta = {
      ...payload.meta,
      ...(await ensureUploadScope(payload.meta)),
    };
    for(const grade of classes||[])await ensureUploadScope({board:payload.meta.board,subject:payload.meta.subject,classLevel:String(grade)});
    const job = bulk?await prisma.durableJob.upsert({where:{id:bulkJobId},create:{id:bulkJobId,ownerId:user.id,kind:'INGESTION',payload},update:{}}):await enqueueJob(user.id, "INGESTION", payload);
    return NextResponse.json(
      {
        success: true,
        jobId: job.id,
        status: job.status,
        fileName: file.name,
        fileUrl: asset.url,
        url: asset.url,
        message: "File stored. Processing is queued.",
      },
      { status: 202 },
    );
  } catch (error) {
    return apiError(error);
  }
}
