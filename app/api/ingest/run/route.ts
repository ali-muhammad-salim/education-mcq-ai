import { NextResponse } from 'next/server';
import { spawn } from 'child_process';
import path from 'path';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const resourceType = body.resourceType || 'all_defaults';

    const scriptPath = path.join(process.cwd(), 'services', 'ingestion', 'unified_runner.py');

    // Spawn detached python runner process
    const child = spawn('python', [scriptPath, resourceType], {
      cwd: process.cwd(),
      detached: true,
      stdio: 'ignore',
    });

    child.unref();

    return NextResponse.json({
      success: true,
      message: 'Ingestion pipeline launched successfully in background.',
      pid: child.pid,
      resourceType,
    });
  } catch (error: any) {
    console.error('Failed to trigger pipeline:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
