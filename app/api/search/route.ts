import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { searchEducationalContent } from '@/lib/typesense';
import { apiError } from '@/lib/api';

const searchParamsSchema = z.object({
  q: z.string().trim().max(240).default(''),
  boardId: z.string().max(60).optional(),
  classLevel: z.coerce.number().int().min(9).max(12).optional(),
  subject: z.string().max(120).optional(),
  type: z.enum(['ALL', 'SLO', 'QUESTION', 'RESOURCE', 'SUBJECT']).default('ALL'),
});

export async function GET(req: NextRequest) {
  try {
    const raw = Object.fromEntries(req.nextUrl.searchParams.entries());
    const parsed = searchParamsSchema.parse({
      q: raw.q ?? raw.query ?? '',
      boardId: raw.boardId || raw.board || undefined,
      classLevel: raw.classLevel || raw.grade || undefined,
      subject: raw.subject || undefined,
      type: raw.type || 'ALL',
    });

    if (parsed.q.length < 2) {
      return NextResponse.json({ results: [], count: 0 }, { headers: { 'Cache-Control': 'no-store' } });
    }

    const results = await searchEducationalContent(parsed.q, {
      boardId: parsed.boardId,
      classLevel: parsed.classLevel,
      subject: parsed.subject,
      type: parsed.type,
    });

    return NextResponse.json(
      { results, count: results.length },
      { headers: { 'Cache-Control': 'no-store' } }
    );
  } catch (error) {
    return apiError(error);
  }
}
