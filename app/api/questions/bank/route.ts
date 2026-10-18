import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const query = searchParams.get('q') || '';
    const subject = searchParams.get('subject') || '';
    const classParam = searchParams.get('class') || searchParams.get('classLevel') || '';
    const difficulty = searchParams.get('difficulty') || '';
    const limit = parseInt(searchParams.get('limit') || '50');

    // Query questions from PastPaperQuestion
    const where: any = {};
    if (query) {
      where.questionText = { contains: query, mode: 'insensitive' };
    }
    if (difficulty && difficulty !== 'ALL') {
      where.difficulty = { equals: difficulty, mode: 'insensitive' };
    }

    const pastQuestions = await prisma.pastPaperQuestion.findMany({
      where,
      take: limit,
      include: {
        pastPaper: {
          select: { paperCode: true, examYear: true, title: true }
        },
        cognitiveLevels: {
          include: { cognitiveLevel: true }
        }
      }
    });

    const formatted = pastQuestions.map(q => {
      const cog = q.cognitiveLevels?.[0]?.cognitiveLevel?.level || q.difficulty || 'Understanding';
      const sr = (q.sourceRegion as any) || {};
      
      let opts: { id: string; text: string; isCorrect: boolean }[] = [];
      if (sr.choices && typeof sr.choices === 'object') {
        const correctKey = (sr.correct_answer || '').trim().toUpperCase();
        opts = Object.entries(sr.choices).map(([key, val]) => ({
          id: `opt-${key}`,
          text: String(val),
          isCorrect: key.toUpperCase() === correctKey
        }));
      } else if (Array.isArray((q as any).options)) {
        opts = ((q as any).options as any[]).map((opt: any, idx: number) => ({
          id: `opt-${idx}`,
          text: typeof opt === 'string' ? opt : opt.text || opt.label || '',
          isCorrect: opt.isCorrect || false
        }));
      }

      // If no correct answer was flagged, ensure at least first option is true
      if (opts.length > 0 && !opts.some(o => o.isCorrect)) {
        opts[0].isCorrect = true;
      }

      return {
        id: q.id,
        questionType: q.questionType || 'MCQ_SINGLE',
        stemText: q.questionText,
        difficulty: q.difficulty || 'Medium',
        marks: q.marks || 1,
        cognitiveLevel: cog,
        options: opts,
        explanation: sr.explanation || '',
        sourcePaper: q.pastPaper?.paperCode,
        examYear: q.pastPaper?.examYear,
        provenance: 'QUESTION_BANK'
      };
    });

    return NextResponse.json({
      success: true,
      total: formatted.length,
      questions: formatted
    });
  } catch (err: any) {
    console.error('Question bank query error:', err);
    return NextResponse.json({ error: 'Failed to query question bank' }, { status: 500 });
  }
}

