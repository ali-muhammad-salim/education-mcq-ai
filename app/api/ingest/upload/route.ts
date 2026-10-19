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

    // 1. Resolve safe public directory
    const publicUploadDir = path.join(process.cwd(), 'public', 'uploads');
    let canWritePublic = false;
    try {
      await fs.mkdir(publicUploadDir, { recursive: true });
      canWritePublic = true;
    } catch (e: any) {
      console.warn(`Could not create public upload directory (${publicUploadDir}):`, e.message);
    }

    // 2. Resolve safe internal data upload directory with graceful fallback
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

    const meta = {
      board,
      classLevel,
      subject,
      resourceType,
      year: examYear,
      paperComponent,
      solutionStatus: keyFile ? 'solved_has_key' : solutionStatus,
      fileName: file.name,
      fileUrl: publicUrl,
      keyFileName,
      keyFilePath,
      keyFileUrl: keyPublicUrl
    };

    // Register in database
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
      // Ignore if table has schema differences
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
      message: 'File uploaded successfully.',
      fileName: safeName,
      filePath,
      board,
      classLevel,
      subject,
      resourceType,
      sizeBytes: bytes.byteLength,
    });
  } catch (error: any) {
    console.error('Upload handler error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
