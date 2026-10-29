import prisma from '../lib/prisma';
async function main() {
  const duplicates = await prisma.$queryRaw<{ duplicates: number }[]>`SELECT COUNT(*)::int AS duplicates FROM (SELECT 1 FROM "QuizAttempt" GROUP BY "quizId","studentId","attemptNumber" HAVING COUNT(*) > 1) t`;
  const size = await prisma.$queryRaw<{ size: string }[]>`SELECT pg_size_pretty(pg_database_size(current_database())) AS size`;
  const curriculum = await prisma.$queryRaw<{ conflicts: number }[]>`SELECT COUNT(*)::int AS conflicts FROM (SELECT "subjectId" FROM "SyllabusVersion" WHERE "isLatest" = true GROUP BY "subjectId" HAVING COUNT(*) > 1) versions`;
  const study = await prisma.$queryRaw<{ conflicts:number }[]>`SELECT COUNT(*)::int AS conflicts FROM "StudyNote" n JOIN "Topic" t ON t.id=n."topicId" WHERE n."syllabusVersionId" IS NOT NULL AND n."syllabusVersionId"<>t."syllabusVersionId"`;
  const columns = await prisma.$queryRaw<{ column_name: string }[]>`SELECT column_name FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'QuizAttempt'`;
  console.log(JSON.stringify({ duplicateAttemptGroups: duplicates[0].duplicates, ambiguousCurrentCurricula: curriculum[0].conflicts, studyNoteScopeConflicts:study[0].conflicts, databaseSize: size[0].size, hardeningAlreadyApplied: columns.some(c => c.column_name === 'questionSnapshot') }));
  if(study[0].conflicts)throw new Error('Resolve legacy notes with inconsistent chapter/syllabus scopes before applying study-library constraints.');
  if (curriculum[0].conflicts) throw new Error('Resolve ambiguous current syllabus versions before applying the knowledge-scope migration.');
  if (duplicates[0].duplicates) console.log('The hardening migration will preserve these attempts, audit their previous numbering and assign distinct attempt numbers.');
}
main().catch(() => { console.error('Database preflight failed. Verify connectivity and schema.'); process.exitCode = 1; }).finally(() => prisma.$disconnect());
