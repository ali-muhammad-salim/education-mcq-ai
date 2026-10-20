import { NextRequest, NextResponse } from 'next/server';
import { requireUser } from '@/lib/security';
import { apiError } from '@/lib/api';
import { getResults } from '@/services/assessment/service';
export async function GET(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  try { const user = await requireUser(req); const { id } = await context.params;
    return NextResponse.json({ success: true, result: await getResults(id, user, req.nextUrl.searchParams.get('attemptId') || undefined) });
  } catch (error) { return apiError(error); }
}
