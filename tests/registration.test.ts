import { beforeAll,afterAll,describe,it,expect } from 'vitest';
import { PrismaClient } from '@prisma/client';
import { randomUUID,createHash } from 'node:crypto';
import { NextRequest } from 'next/server';
const url=process.env.TEST_DATABASE_URL;
if(url&&!new URL(url).pathname.includes('_test'))throw new Error('A dedicated test database is required.');
describe.skipIf(!url)('Duplicate registration',()=>{
  const suffix=randomUUID(),existing='existing-'+suffix+'@example.test',fresh='fresh-'+suffix+'@example.test';
  let db:PrismaClient;
  beforeAll(async()=>{process.env.DATABASE_URL=url;db=new PrismaClient({datasources:{db:{url}}});await db.user.create({data:{email:existing,name:'Original learner',passwordHash:'original-test-hash'}});});
  afterAll(async()=>{if(!db)return;const users=await db.user.findMany({where:{email:{in:[existing,fresh]}}});await db.userSession.deleteMany({where:{userId:{in:users.map(u=>u.id)}}});await db.user.deleteMany({where:{email:{in:[existing,fresh]}}});await db.requestLimit.deleteMany({where:{key:{in:[existing,fresh].map(email=>createHash('sha256').update('register:'+email).digest('hex'))}}});await db.$disconnect();const {default:shared}=await import('@/lib/prisma');await shared.$disconnect();});
  const request=(email:string)=>new NextRequest('http://localhost/api/auth/register',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email,name:'New learner',password:'Separate-test-only-password!123',role:'STUDENT'})});
  it('returns a sign-in conflict for an existing email without changing credentials or creating a session',async()=>{
    const {POST}=await import('@/app/api/auth/register/route');const r=await POST(request('  '+existing.toUpperCase()+'  '));expect(r.status).toBe(409);expect((await r.json()).error.code).toBe('ACCOUNT_EXISTS');expect(r.headers.get('set-cookie')).toBeNull();const user=await db.user.findUniqueOrThrow({where:{email:existing}});expect(user.name).toBe('Original learner');expect(user.passwordHash).toBe('original-test-hash');expect(await db.userSession.count({where:{userId:user.id}})).toBe(0);
  });
  it('creates only one account and session when simultaneous sign-ups use the same email',async()=>{
    const {POST}=await import('@/app/api/auth/register/route');const results=await Promise.all([POST(request(fresh)),POST(request(fresh))]);expect(results.map(r=>r.status).sort()).toEqual([200,409]);const conflict=results.find(r=>r.status===409)!;expect((await conflict.json()).error.code).toBe('ACCOUNT_EXISTS');const users=await db.user.findMany({where:{email:fresh}});expect(users).toHaveLength(1);expect(await db.userSession.count({where:{userId:users[0].id}})).toBe(1);
  });
});
