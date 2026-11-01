import { NextRequest, NextResponse } from 'next/server';
import { getPaperAnalytics, recordAttemptAnalytics } from '@/lib/quiz-analytics';
import { z } from 'zod';

export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  const payload = getPaperAnalytics(id, 40);
  return NextResponse.json(
    { success: true, analytics: payload },
    {
      headers: {
        'Cache-Control': 'public, max-age=15, stale-while-revalidate=45',
      },
    }
  );
}

const postSchema = z.object({
  studentId: z.string().optional().default('student-local'),
  studentName: z.string().optional().default('Candidate'),
  attemptNumber: z.number().int().min(1).optional().default(1),
  score: z.number().min(0),
  totalMarks: z.number().min(1).default(40),
  attemptedCount: z.number().min(0).default(0),
  totalTimeSec: z.number().min(1).default(60),
  questionTimings: z
    .array(
      z.object({
        questionNumber: z.union([z.string(), z.number()]),
        timeSpentSec: z.number().min(0),
        selectedOption: z.string().optional(),
        isCorrect: z.boolean().optional(),
      })
    )
    .optional(),
});

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const body = postSchema.parse(await req.json());
    const result = recordAttemptAnalytics({
      paperCode: id,
      ...body,
    });
    return NextResponse.json({ success: true, ...result });
  } catch (err) {
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : 'Invalid analytics payload' },
      { status: 400 }
    );
  }
}
