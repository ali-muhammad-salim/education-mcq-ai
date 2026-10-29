const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const boards = await prisma.board.findMany({
    include: {
      programmes: {
        include: {
          academicClasses: {
            select: { id: true, name: true, level: true }
          }
        }
      }
    }
  });

  console.log('=== BOARDS AND PROGRAMMES ===');
  for (const b of boards) {
    console.log(`Board: ${b.name} (${b.shortCode}) [status: ${b.status}]`);
    for (const p of b.programmes) {
      console.log(`  Programme: ${p.name}`);
      for (const c of p.academicClasses) {
        console.log(`    Class: ${c.name} (level: ${c.level}) [id: ${c.id}]`);
      }
    }
  }

  // Also check if there are standalone classes or subjects without board relations
  const allAcademicClasses = await prisma.academicClass.findMany({
    include: { subjects: true, pastPapers: true }
  });
  console.log('\nTotal AcademicClasses in DB:', allAcademicClasses.length);
  for (const c of allAcademicClasses) {
    console.log(`Class: ${c.name} (level: ${c.level}) - Subjects: ${c.subjects.map(s => s.name).join(', ')} - Papers: ${c.pastPapers.length}`);
  }

  const allSubjects = await prisma.subject.findMany({
    include: { pastPapers: true }
  });
  console.log('\nTotal Subjects in DB:', allSubjects.length);
  for (const s of allSubjects) {
    console.log(`Subject: ${s.name} [id: ${s.id}, classId: ${s.classId}] - Papers: ${s.pastPapers.map(p => p.code).join(', ')}`);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
