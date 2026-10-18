import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';
import { PrismaClient } from '@prisma/client';
import { exec } from 'child_process';
import util from 'util';

const execAsync = util.promisify(exec);
const prisma = new PrismaClient();

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;
    const type = formData.get('type') as string;
    const programme = formData.get('programme') as string;
    const grade = formData.get('grade') as string;
    const subject = formData.get('subject') as string;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Convert file to buffer and save
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    
    // Create safe filename
    const safeSubject = subject.replace(/[^a-z0-9]/gi, '_').toLowerCase();
    const fileName = `${type}_${programme}_${grade}_${safeSubject}_${Date.now()}.pdf`;
    const uploadDir = path.join(process.cwd(), 'public', 'uploads');
    const filePath = path.join(uploadDir, fileName);
    const publicUrl = `/uploads/${fileName}`;

    await fs.writeFile(filePath, buffer);

    // Call the Python AI extraction worker
    const workerScript = path.join(process.cwd(), 'services', 'ingestion', 'ai_extractor.py');
    
    // We will trigger the background worker asynchronously so the request doesn't timeout
    // but in a real app you'd use a queue. For now, we await it or just spawn it.
    
    // Let's create the basic database structural records if they don't exist
    // Find Board
    let board = await prisma.board.findFirst({ where: { name: 'Aga Khan University Examination Board' } });
    if (!board) {
      board = await prisma.board.create({ data: { name: 'Aga Khan University Examination Board', shortCode: 'AKU-EB', country: 'Pakistan' } });
    }

    // Find Programme
    let prog = await prisma.programme.findFirst({ where: { name: programme, boardId: board.id } });
    if (!prog) {
      prog = await prisma.programme.create({ data: { name: programme, boardId: board.id } });
    }

    // Find Class
    let acadClass = await prisma.academicClass.findFirst({ where: { level: parseInt(grade), programmeId: prog.id } });
    if (!acadClass) {
      acadClass = await prisma.academicClass.create({ data: { name: grade === '9' ? 'IX' : grade === '10' ? 'X' : grade === '11' ? 'XI' : 'XII', level: parseInt(grade), programmeId: prog.id } });
    }

    // Find Subject
    let subj = await prisma.subject.findFirst({ where: { name: subject, classId: acadClass.id } });
    if (!subj) {
      subj = await prisma.subject.create({ data: { name: subject, classId: acadClass.id } });
    }

    if (type === 'syllabus') {
      // Create SyllabusVersion record
      const version = await prisma.syllabusVersion.create({
        data: {
          subjectId: subj.id,
          versionName: '2026 AI Extracted',
          validFrom: new Date(),
          isLatest: true,
          fileUrl: publicUrl
        }
      });
      
      // Kick off python worker
      // We will create the AI python worker script next!
      console.log(`Starting AI extraction on ${filePath}`);
      execAsync(`python "${workerScript}" syllabus "${version.id}" "${filePath}"`).catch(console.error);

    } else {
      // Create PastPaper record
      // Will handle past paper logic here
    }

    return NextResponse.json({ success: true, url: publicUrl });

  } catch (error: any) {
    console.error('Upload error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
