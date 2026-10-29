import prisma from '@/lib/prisma';
import { Prisma } from '@prisma/client';
import { AuthUser } from '@/lib/auth';
import { InsightAttempt } from './insights';
// Project metadata inside PostgreSQL so profile analytics never download large
// diagrams, stems and marking guides from thirty complete exam snapshots.
export async function insightSample(actor:AuthUser,studentId:string):Promise<InsightAttempt[]>{
 return prisma.$queryRaw<InsightAttempt[]>`WITH recent AS (
  SELECT a."id", a."questionSnapshot" FROM "QuizAttempt" a JOIN "Quiz" exam ON exam."id"=a."quizId"
  WHERE a."studentId"=${studentId} AND a."status"='GRADED'
    ${actor.role==='ADMIN'?Prisma.empty:Prisma.sql`AND exam."teacherId"=${actor.id}`}
  ORDER BY a."submittedAt" DESC, a."id" DESC LIMIT 30
 ) SELECT r."id", jsonb_agg(jsonb_build_object('id',item->>'id','orderIndex',item->'orderIndex','marks',item->'marks',
   'content',jsonb_strip_nulls(jsonb_build_object('stemText','Recorded item','questionType','SHORT_ANSWER','topicName',item->'content'->'topicName','sloCode',item->'content'->'sloCode')))) AS "questionSnapshot",
   jsonb_agg(jsonb_build_object('questionId',answer."questionId",'score',answer."score")) AS "answers"
 FROM recent r CROSS JOIN LATERAL jsonb_array_elements(CASE WHEN jsonb_typeof(r."questionSnapshot")='array' THEN r."questionSnapshot" ELSE '[]'::jsonb END) item
 JOIN "QuizAnswer" answer ON answer."attemptId"=r."id" AND answer."questionId"=item->>'id'
 GROUP BY r."id"`;
}
export async function revisionSample(actor:AuthUser,studentId:string,topic?:string):Promise<InsightAttempt[]>{
 const rows=await prisma.$queryRaw<{id:string;question:Prisma.JsonValue;questionId:string;score:number}[]>`WITH recent AS (
  SELECT a."id",a."questionSnapshot",a."submittedAt" FROM "QuizAttempt" a JOIN "Quiz" exam ON exam."id"=a."quizId"
  WHERE a."studentId"=${studentId} AND a."status"='GRADED'
    ${actor.role==='ADMIN'?Prisma.empty:Prisma.sql`AND exam."teacherId"=${actor.id}`}
  ORDER BY a."submittedAt" DESC,a."id" DESC LIMIT 30
 ) SELECT r."id",item AS "question",answer."questionId",answer."score"
 FROM recent r CROSS JOIN LATERAL jsonb_array_elements(CASE WHEN jsonb_typeof(r."questionSnapshot")='array' THEN r."questionSnapshot" ELSE '[]'::jsonb END) item
 JOIN "QuizAnswer" answer ON answer."attemptId"=r."id" AND answer."questionId"=item->>'id'
 WHERE answer."score" IS NOT NULL AND answer."score" < (item->>'marks')::numeric
 ${topic?Prisma.sql`AND COALESCE(NULLIF(btrim(item->'content'->>'topicName'),''),NULLIF(btrim(item->'content'->>'sloCode'),''),'Topic not mapped')=${topic}`:Prisma.empty}
 ORDER BY r."submittedAt" DESC,r."id" DESC,(item->>'orderIndex')::integer LIMIT 60`;
 return rows.map(row=>({id:row.id,questionSnapshot:[row.question],answers:[{questionId:row.questionId,score:row.score}]}));
}
