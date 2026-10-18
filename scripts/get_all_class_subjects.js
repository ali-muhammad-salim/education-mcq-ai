const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const classes = await prisma.academicClass.findMany({
    orderBy: { level: 'asc' },
    include: {
      subjects: {
        include: {
          pastPapers: {
            select: { id: true, paperCode: true, examYear: true, examType: true, title: true }
          },
          syllabusVersions: {
            select: { id: true, versionName: true }
          }
        }
      }
    }
  });

  for (const c of classes) {
    console.log(`\n=== CLASS ${c.name} (level: ${c.level}, id: ${c.id}) ===`);
    console.log(`Total subjects: ${c.subjects.length}`);
    for (const s of c.subjects) {
      console.log(`  - ${s.name} (${s.pastPapers.length} papers)`);
    }
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
