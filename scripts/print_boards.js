const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const boards = await prisma.board.findMany({
    include: {
      programmes: {
        include: {
          academicClasses: true
        }
      }
    }
  });

  console.log('=== BOARDS ===');
  for (const b of boards) {
    console.log(`Board: "${b.name}" (${b.shortCode}) [id: ${b.id}] status: ${b.status}`);
    for (const p of b.programmes) {
      console.log(`  Programme: "${p.name}" (id: ${p.id})`);
      for (const c of p.academicClasses) {
        console.log(`    Class: "${c.name}" level: ${c.level} (id: ${c.id})`);
      }
    }
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
