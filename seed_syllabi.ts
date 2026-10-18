import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

async function main() {
  const dir = path.join(__dirname, 'data', 'parsed_syllabi');
  const files = fs.readdirSync(dir);
  
  let board = await prisma.board.findUnique({ where: { shortCode: 'AKU-EB' } });
  if (!board) {
    board = await prisma.board.create({
      data: { name: 'Aga Khan University Examination Board', shortCode: 'AKU-EB', country: 'Pakistan' }
    });
  }
  
  for (const file of files) {
    if (!file.endsWith('.json')) continue;
    
    console.log(`Seeding ${file}...`);
    const nameWithoutExt = path.parse(file).name;
    let programName = 'SSC';
    let gradeName = 'IX';
    let level = 9;
    
    if (nameWithoutExt.includes('HSSC')) programName = 'HSSC';
    
    if (nameWithoutExt.includes(' I ')) {
       gradeName = programName === 'HSSC' ? 'XI' : 'IX';
       level = programName === 'HSSC' ? 11 : 9;
    } else if (nameWithoutExt.includes(' II ')) {
       gradeName = programName === 'HSSC' ? 'XII' : 'X';
       level = programName === 'HSSC' ? 12 : 10;
    }
    
    // Find or Create Programme
    let programme = await prisma.programme.findFirst({
      where: { name: programName, boardId: board.id }
    });
    if (!programme) {
      programme = await prisma.programme.create({
        data: { name: programName, boardId: board.id }
      });
    }
    
    // Find or Create AcademicClass
    let academicClass = await prisma.academicClass.findFirst({
      where: { name: gradeName, programmeId: programme.id }
    });
    if (!academicClass) {
      academicClass = await prisma.academicClass.create({
        data: { name: gradeName, level, programmeId: programme.id }
      });
    }
    
    const subjectMatch = nameWithoutExt.match(new RegExp(`^(.*?)\\s+${programName}`));
    let subjectName = subjectMatch ? subjectMatch[1].trim() : nameWithoutExt.split(' ')[0];
    
    let subject = await prisma.subject.findFirst({
      where: { name: subjectName, classId: academicClass.id }
    });
    if (!subject) {
      subject = await prisma.subject.create({
        data: { name: subjectName, classId: academicClass.id }
      });
    }
    
    // Create SyllabusVersion
    let syllabusVersion = await prisma.syllabusVersion.findFirst({
      where: { subjectId: subject.id, versionName: '2025/2026' }
    });
    
    if (!syllabusVersion) {
      syllabusVersion = await prisma.syllabusVersion.create({
        data: {
          subjectId: subject.id,
          versionName: '2025/2026',
          validFrom: new Date('2025-01-01'),
          isLatest: true
        }
      });
    }
    
    const data = JSON.parse(fs.readFileSync(path.join(dir, file), 'utf-8'));
    if (!data.topics) continue;
    
    for (const topic of data.topics) {
      let dbTopic = await prisma.topic.findFirst({
        where: { name: topic.topic_name, syllabusVersionId: syllabusVersion.id }
      });
      if (!dbTopic) {
        dbTopic = await prisma.topic.create({
          data: {
            name: topic.topic_name,
            topicNumber: topic.topic_id,
            syllabusVersionId: syllabusVersion.id,
          }
        });
      }
      
      if (!topic.subtopics) continue;
      
      for (const subtopic of topic.subtopics) {
        let dbSubtopic = await prisma.subtopic.findFirst({
           where: { name: subtopic.subtopic_name, topicId: dbTopic.id }
        });
        if (!dbSubtopic) {
          dbSubtopic = await prisma.subtopic.create({
            data: {
              name: subtopic.subtopic_name,
              subtopicNum: subtopic.subtopic_id,
              topicId: dbTopic.id
            }
          });
        }
        
        if (!subtopic.slos) continue;
        
        for (const slo of subtopic.slos) {
          if (!slo.text) continue;
          
          let dbSlo = await prisma.sLO.findFirst({
             where: { description: slo.text, subtopicId: dbSubtopic.id }
          });
          if (!dbSlo) {
            await prisma.sLO.create({
              data: {
                code: slo.code || null,
                description: slo.text,
                subtopicId: dbSubtopic.id
              }
            });
          }
        }
      }
    }
  }
  
  console.log("Seeding complete!");
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
