import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import { getDoubtQueue, resolveDoubtItem, addDoubtItem } from '@/lib/aiDoubtStore';

export async function GET(req: NextRequest) {
  try {
    const user = await getSessionUser(req);
    if (!user || (user.role !== 'TEACHER' && user.role !== 'ADMIN')) {
      return NextResponse.json({ error: 'Unauthorized: Teacher or Admin access required' }, { status: 403 });
    }

    const queue = getDoubtQueue();
    const pending = queue.filter(d => d.status === 'PENDING_REVIEW');
    const resolved = queue.filter(d => d.status !== 'PENDING_REVIEW');

    return NextResponse.json({
      success: true,
      pendingCount: pending.length,
      pending,
      resolved
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to fetch doubt queue' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getSessionUser(req);
    if (!user || (user.role !== 'TEACHER' && user.role !== 'ADMIN')) {
      return NextResponse.json({ error: 'Unauthorized: Teacher or Admin access required' }, { status: 403 });
    }

    const body = await req.json();
    const { action, doubtId, resolution, correctedAnswer } = body;

    if (action === 'RESOLVE' && doubtId && resolution) {
      const updated = resolveDoubtItem(doubtId, resolution, user.name || user.email, correctedAnswer);
      if (!updated) {
        return NextResponse.json({ error: 'Doubt item not found' }, { status: 404 });
      }
      return NextResponse.json({ success: true, item: updated });
    }

    // Manual creation of flagged question for review
    if (action === 'CREATE' && body.stemText) {
      const created = addDoubtItem({
        stemText: body.stemText,
        subject: body.subject || 'General',
        classLevel: body.classLevel || 'Class IX',
        chapter: body.chapter || 'Curriculum',
        options: body.options || [],
        stage1Answer: body.stage1Answer || 'Pending',
        stage2Answer: body.stage2Answer || 'Teacher Flagged',
        doubtReason: body.doubtReason || 'Flagged manually by educator for syllabus review',
        confidenceScore: body.confidenceScore || 0.70,
        suggestedCorrection: body.suggestedCorrection,
        provenance: 'TEACHER_FLAGGED'
      });
      return NextResponse.json({ success: true, item: created });
    }

    return NextResponse.json({ error: 'Invalid action or parameters' }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to update doubt item' }, { status: 500 });
  }
}
