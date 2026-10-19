import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';
import { prisma } from '../../../../lib/prisma';
import { spawn } from 'child_process';
import { getSessionUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const user = await getSessionUser(req);
    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized: Admin role required for resource upload' }, { status: 403 });
    }

    const formData = await req.formData();
    const file = formData.get('file') as File;
    const keyFile = formData.get('keyFile') as File | null;
    const board = (formData.get('board') as string) || 'Aga Khan University Examination Board';
    const classLevel = (formData.get('classLevel') as string) || 'Class IX';
    const subject = (formData.get('subject') as string) || 'Physics';
    const resourceType = (formData.get('resourceType') as string) || 'syllabus'; // syllabus, model_paper, past_paper, textbook, pacing_guide
    const examYear = (formData.get('examYear') as string) || 'auto';
    const paperComponent = (formData.get('paperComponent') as string) || 'auto';
    const solutionStatus = (formData.get('solutionStatus') as string) || (keyFile ? 'solved_has_key' : 'auto');
    const autoRun = formData.get('autoRun') === 'true';

    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }

    // 1. Reset progress file immediately so UI reflects active upload state
    const progressFile = path.join(process.cwd(), 'data', 'ingest_progress.json');
    try {
      await fs.writeFile(
        progressFile,
        JSON.stringify({
          status: 'RUNNING',
          percent: 25,
          stage: 'Uploading',
          message: `Receiving and saving ${file.name}...`,
          logs: [
            `[${new Date().toLocaleTimeString()}] Upload started: ${file.name}`,
            `[${new Date().toLocaleTimeString()}] Configuration: ${resourceType} | ${classLevel} | ${examYear}`
          ],
          results: { uploaded_file: file.name },
          updated_at: Date.now() / 1000
        }, null, 2),
        'utf8'
      );
    } catch (e: any) {
      console.warn('Could not write initial progress:', e.message);
    }

    // 2. Resolve safe public directory
    const publicUploadDir = path.join(process.cwd(), 'public', 'uploads');
    let canWritePublic = false;
    try {
      await fs.mkdir(publicUploadDir, { recursive: true });
      canWritePublic = true;
    } catch (e: any) {
      console.warn(`Could not create public upload directory (${publicUploadDir}):`, e.message);
    }

    // 3. Resolve safe internal data upload directory with graceful fallback
    let uploadDir = path.join(process.cwd(), 'data', 'uploads');
    try {
      await fs.mkdir(uploadDir, { recursive: true });
    } catch (e: any) {
      console.warn(`Could not create ${uploadDir}, falling back to OS temp directory:`, e.message);
      uploadDir = path.join(path.sep === '\\' ? process.cwd() : '/tmp', 'uploads');
      try {
        await fs.mkdir(uploadDir, { recursive: true });
      } catch (err2: any) {
        uploadDir = process.platform === 'win32' ? path.join(process.cwd(), 'uploads') : '/tmp';
      }
    }

    const safeName = `${resourceType}_${classLevel.replace(/\s+/g, '_')}_${Date.now()}_${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
    let filePath = path.join(uploadDir, safeName);
    const publicFilePath = path.join(publicUploadDir, safeName);
    const publicUrl = `/uploads/${safeName}`;

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Save to uploadDir (primary pipeline ingestion path)
    try {
      await fs.writeFile(filePath, buffer);
    } catch (e: any) {
      console.warn(`Failed writing to ${filePath}, writing to fallback temp file:`, e.message);
      filePath = path.join(path.sep === '\\' ? process.cwd() : '/tmp', safeName);
      await fs.writeFile(filePath, buffer);
    }

    // Save to publicFilePath if possible so browser/PDF viewer can load it directly
    if (canWritePublic) {
      try {
        await fs.writeFile(publicFilePath, buffer);
      } catch (e: any) {
        console.warn(`Could not write to ${publicFilePath} (non-fatal):`, e.message);
      }
    }

    // Save optional separate Answer Key PDF if provided
    let keyFilePath: string | undefined;
    let keyPublicUrl: string | undefined;
    let keyFileName: string | undefined;
    if (keyFile && keyFile.size > 0) {
      keyFileName = keyFile.name;
      const safeKeyName = `key_${resourceType}_${classLevel.replace(/\s+/g, '_')}_${Date.now()}_${keyFile.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
      keyFilePath = path.join(uploadDir, safeKeyName);
      const keyPublicFilePath = path.join(publicUploadDir, safeKeyName);
      keyPublicUrl = `/uploads/${safeKeyName}`;

      const keyBytes = await keyFile.arrayBuffer();
      const keyBuffer = Buffer.from(keyBytes);
      try {
        await fs.writeFile(keyFilePath, keyBuffer);
      } catch (e: any) {
        keyFilePath = path.join(path.sep === '\\' ? process.cwd() : '/tmp', safeKeyName);
        await fs.writeFile(keyFilePath, keyBuffer);
      }
      if (canWritePublic) {
        try {
          await fs.writeFile(keyPublicFilePath, keyBuffer);
        } catch (e: any) {
          console.warn(`Could not write key to ${keyPublicFilePath}:`, e.message);
        }
      }
    }

    // Subject auto-detection from filename and user input
    let finalSubject = subject;
    const fn = file.name.toLowerCase();
    if (!finalSubject || finalSubject === 'auto') {
      if (fn.includes('chem') || fn.includes('chemistry') || fn.includes('kemiya')) {
        finalSubject = 'Chemistry';
      } else if (fn.includes('bio') || fn.includes('biology') || fn.includes('hayatiyat')) {
        finalSubject = 'Biology';
      } else if (fn.includes('math') || fn.includes('mathematics') || fn.includes('riazi') || fn.includes('algebra')) {
        finalSubject = 'Mathematics';
      } else if (fn.includes('comp') || fn.includes('computer') || fn.includes('cs') || fn.includes('it')) {
        finalSubject = 'Computer Science';
      } else if (fn.includes('eng') || fn.includes('english')) {
        finalSubject = 'English';
      } else if (fn.includes('urdu')) {
        finalSubject = 'Urdu';
      } else if (fn.includes('islam') || fn.includes('islamiat')) {
        finalSubject = 'Islamiat';
      } else {
        finalSubject = 'Physics';
      }
    }

    const subjectCodeMap: Record<string, string> = {
      'Physics': 'PHY',
      'Chemistry': 'CHM',
      'Biology': 'BIO',
      'Mathematics': 'MTH',
      'Computer Science': 'CSC',
      'English': 'ENG',
      'Urdu': 'URD',
      'Islamiat': 'ISL'
    };
    const subjectCode = subjectCodeMap[finalSubject] || finalSubject.substring(0, 3).toUpperCase();

    // Extract standardized year, grade, and component
    let parsedYear = 2024;
    if (examYear && examYear !== 'auto' && !isNaN(parseInt(examYear))) {
      parsedYear = parseInt(examYear);
    } else {
      const match = file.name.match(/(201\d|202\d)/);
      if (match) parsedYear = parseInt(match[1]);
    }

    const isClass10 = classLevel.includes('10') || classLevel.includes('X') || file.name.includes('-X-') || file.name.includes('Class-X') || file.name.includes('SSC-II');
    const gradeCode = isClass10 ? 'X' : 'IX';
    const gradeLevel = isClass10 ? 10 : 9;
    const gradeName = isClass10 ? 'Class X' : 'Class IX';

    const pc = (paperComponent || '').toLowerCase();
    const isP2 = pc.includes('2') || pc.includes('ii') || pc.includes('crq') || pc.includes('theory') ||
      fn.includes('paper-2') || fn.includes('paper_2') || fn.includes('paper 2') ||
      fn.includes('paper-ii') || fn.includes('paper_ii') || fn.includes('paper ii') ||
      fn.includes('p-2') || fn.includes('p2') || fn.includes('crq') || fn.includes('theory');
    const comp = isP2 ? 'P2' : 'P1';

    const isModel = resourceType === 'model_paper';
    const paperCode = isModel ? `${subjectCode}-${gradeCode}-${comp}` : `${subjectCode}-${gradeCode}-${parsedYear}-${comp}`;
    const paperTitle = `${finalSubject} SSC-${gradeCode === 'X' ? 'II' : 'I'} ${isModel ? 'Model' : parsedYear} Annual Examination Paper ${comp === 'P1' ? 'I (MCQ)' : 'II (CRQ & ERQ)'}`;

    const meta = {
      board,
      classLevel: gradeName,
      subject: finalSubject,
      subjectCode,
      resourceType,
      year: parsedYear.toString(),
      paperComponent: comp,
      paperCode,
      paperTitle,
      solutionStatus: keyFile ? 'solved_has_key' : solutionStatus,
      fileName: file.name,
      fileUrl: publicUrl,
      keyFileName,
      keyFilePath,
      keyFileUrl: keyPublicUrl
    };

    // Register Extraction record in database
    try {
      await prisma.extraction.create({
        data: {
          bookPageId: 'manual_upload',
          extractionEngine: 'GEMINI_VISION',
          model: 'gemini-3.5-flash-lite',
          rawOutput: JSON.stringify(meta),
          normalizedText: file.name,
          status: 'UPLOADED',
        },
      });
    } catch (e) {
      // Non-fatal
    }

    // Auto-register directly in prisma.pastPaper
    try {
      let boardRecord = await prisma.board.findFirst({
        where: { shortCode: 'AKUEB' }
      });
      if (!boardRecord) {
        boardRecord = await prisma.board.create({
          data: {
            name: 'Aga Khan University Examination Board',
            shortCode: 'AKUEB',
            country: 'Pakistan'
          }
        });
      }

      let prog = await prisma.programme.findFirst({
        where: { boardId: boardRecord.id }
      });
      if (!prog) {
        prog = await prisma.programme.create({
          data: {
            boardId: boardRecord.id,
            name: 'Secondary School Certificate (SSC)'
          }
        });
      }

      let academicClass = await prisma.academicClass.findFirst({
        where: {
          OR: [
            { name: gradeName },
            { level: gradeLevel }
          ]
        }
      });
      if (!academicClass) {
        academicClass = await prisma.academicClass.create({
          data: {
            programmeId: prog.id,
            name: gradeName,
            level: gradeLevel
          }
        });
      }

      let subjectRecord = await prisma.subject.findFirst({
        where: {
          classId: academicClass.id,
          name: { contains: finalSubject, mode: 'insensitive' }
        }
      });
      if (!subjectRecord) {
        subjectRecord = await prisma.subject.create({
          data: {
            classId: academicClass.id,
            name: finalSubject,
            code: subjectCode
          }
        });
      }

      const existingPaper = await prisma.pastPaper.findFirst({
        where: { paperCode }
      });

      if (existingPaper) {
        await prisma.pastPaper.update({
          where: { id: existingPaper.id },
          data: {
            fileUrl: publicUrl,
            title: paperTitle,
            examYear: parsedYear,
            examSession: isModel ? 'Model Examination' : `Annual Examination ${parsedYear}`,
            examType: isModel ? 'MODEL_EXAM' : 'ANNUAL',
            sourceFile: file.name,
            verificationStatus: 'VERIFIED'
          }
        });
      } else {
        await prisma.pastPaper.create({
          data: {
            boardId: boardRecord.id,
            classId: academicClass.id,
            subjectId: subjectRecord.id,
            paperCode,
            title: paperTitle,
            examYear: parsedYear,
            examSession: isModel ? 'Model Examination' : `Annual Examination ${parsedYear}`,
            examType: isModel ? 'MODEL_EXAM' : 'ANNUAL',
            fileUrl: publicUrl,
            sourceFile: file.name,
            verificationStatus: 'VERIFIED'
          }
        });
      }
    } catch (dbErr: any) {
      console.warn('PastPaper direct upsert notice:', dbErr.message);
    }

    // Persist to data/uploaded_past_papers.json so it is immediately visible
    try {
      const regPath = path.join(process.cwd(), 'data', 'uploaded_past_papers.json');
      let existingList: any[] = [];
      try {
        const rawContent = await fs.readFile(regPath, 'utf8');
        existingList = JSON.parse(rawContent);
      } catch {
        existingList = [];
      }
      const newEntry = {
        id: paperCode,
        paperCode,
        title: paperTitle,
        examSession: isModel ? 'Model Examination' : `Annual Examination ${parsedYear}`,
        examYear: parsedYear,
        fileUrl: publicUrl,
        academicClass: { name: gradeName, level: gradeLevel },
        subject: { name: finalSubject, code: subjectCode },
        _count: { questions: comp === 'P1' ? 40 : 11 }
      };
      const idx = existingList.findIndex((p: any) => p.paperCode === paperCode);
      if (idx >= 0) {
        existingList[idx] = newEntry;
      } else {
        existingList.push(newEntry);
      }
      await fs.writeFile(regPath, JSON.stringify(existingList, null, 2), 'utf8');
    } catch (regErr: any) {
      console.warn('Failed to update uploaded_past_papers.json:', regErr.message);
    }

    // Update progress file to COMPLETED (100%)
    try {
      await fs.writeFile(
        progressFile,
        JSON.stringify({
          status: 'COMPLETED',
          percent: 100,
          stage: 'Done',
          message: `Successfully uploaded and registered ${paperTitle} in Past Paper Archive!`,
          logs: [
            `[${new Date().toLocaleTimeString()}] Saved file: ${safeName}`,
            `[${new Date().toLocaleTimeString()}] Registered past paper: ${paperCode} (${paperTitle})`,
            `[${new Date().toLocaleTimeString()}] Live in Archive: /akueb/${gradeCode}/physics/pastpapers`
          ],
          results: {
            uploaded_file: file.name,
            paper_code: paperCode,
            file_url: publicUrl,
            completed_at: new Date().toISOString()
          },
          updated_at: Date.now() / 1000
        }, null, 2),
        'utf8'
      );
    } catch (e: any) {
      console.warn('Could not update progress to completed:', e.message);
    }

    // Auto-run the unified runner with custom file and metadata if requested
    if (autoRun) {
      try {
        const scriptPath = path.join(process.cwd(), 'services', 'ingestion', 'unified_runner.py');
        const pythonCmd = process.platform === 'win32' ? 'python' : 'python3';
        const child = spawn(pythonCmd, [scriptPath, resourceType, filePath, JSON.stringify(meta)], {
          cwd: process.cwd(),
          detached: true,
          stdio: 'ignore',
        });
        child.on('error', (err) => {
          console.warn('Background ingestion spawn notice:', err.message);
        });
        child.unref();
      } catch (err: any) {
        console.warn('Could not spawn background ingestion runner:', err.message);
      }
    }

    return NextResponse.json({
      success: true,
      message: 'File uploaded successfully and registered in past paper archive.',
      fileName: safeName,
      filePath,
      board,
      classLevel: gradeName,
      subject,
      resourceType,
      paperCode,
      paperTitle,
      fileUrl: publicUrl,
      archiveUrl: `/akueb/${gradeCode}/physics/pastpapers`,
      sizeBytes: bytes.byteLength,
    });
  } catch (error: any) {
    console.error('Upload handler error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
