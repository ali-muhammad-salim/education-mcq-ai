import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const progressFile = path.join(process.cwd(), 'data', 'ingest_progress.json');
    if (!fs.existsSync(progressFile)) {
      return NextResponse.json({
        status: 'IDLE',
        percent: 0,
        stage: 'Ready',
        message: 'No pipeline is currently executing.',
        logs: [],
        results: {},
      });
    }

    const raw = fs.readFileSync(progressFile, 'utf-8');
    const data = JSON.parse(raw);
    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
