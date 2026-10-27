import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireUser } from '@/lib/security';
import { z } from 'zod';
import { apiError } from '@/lib/api';
import { questionSchema } from '@/lib/validations/assessment';
import ssc1ModelMcqs from '@/data/physics/ssc1_model_mcqs.json';
import ssc2ModelMcqs from '@/data/physics/ssc2_model_mcqs.json';

export async function GET(req: NextRequest) {
  try {
    await requireUser(req, ['TEACHER', 'ADMIN']);
    const { searchParams } = new URL(req.url);
    const query = (searchParams.get('q') || searchParams.get('search') || '').toLowerCase();
    const subject = searchParams.get('subject') || '';
    const classParam = searchParams.get('class') || searchParams.get('classLevel') || '';
    const difficulty = (searchParams.get('difficulty') || '').toUpperCase();
    const limit = z.coerce.number().int().min(1).max(100).parse(searchParams.get('limit') || '100');

    const page = z.coerce.number().int().min(1).max(10000).parse(searchParams.get('page') || '1');
    let hasMore = false;
    let formatted: any[] = [];

    // Attempt DB query first
    try {
      const where: any = {};
      where.pastPaper = { ...(subject && subject !== 'ALL' ? { subject: { name: { equals: subject, mode: 'insensitive' } } } : {}), ...(/^(9|10|IX|X)$/.test(classParam) ? { academicClass: { level: ['9','IX'].includes(classParam) ? 9 : 10 } } : {}) };
      const board = searchParams.get('boardId');
      if (board && board !== 'ALL') where.pastPaper.academicClass = { ...where.pastPaper.academicClass, programme: { board: { shortCode: board } } };
      if (query) {
        where.questionText = { contains: query, mode: 'insensitive' };
      }
      if (difficulty && difficulty !== 'ALL') {
        where.difficulty = { in: [difficulty, ({ EASY: 'K', MEDIUM: 'U', HARD: 'A' } as Record<string,string>)[difficulty] || difficulty], mode: 'insensitive' };
      }

      const pastQuestions = await prisma.pastPaperQuestion.findMany({
        where,
        take: limit + 1, skip: (page - 1) * limit,
        include: {
          pastPaper: {
            select: { paperCode: true, examYear: true, title: true }
          },
          cognitiveLevels: {
            include: { cognitiveLevel: true }
          }
        }
      });

      hasMore = pastQuestions.length > limit;
      if (pastQuestions && pastQuestions.length > 0) {
        formatted = pastQuestions.map(q => {
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


          return {
            id: q.id,
            questionType: ({ MULTIPLE_CHOICE: 'MCQ_SINGLE', CONSTRUCTED_RESPONSE: 'CRQ', EXTENDED_RESPONSE: 'LONG_ANSWER' } as Record<string,string>)[q.questionType] || q.questionType || 'MCQ_SINGLE',
            stemText: q.questionText,
            difficulty: q.difficulty || 'Medium',
            marks: q.marks || 1,
            cognitiveLevel: cog,
            options: opts,
            rubric: sr.rubric ? JSON.stringify(sr.rubric) : undefined, correctAnswerText: sr.correct_answer_text || undefined, explanation: sr.explanation || '',
            sourcePaper: q.pastPaper?.paperCode,
            examYear: q.pastPaper?.examYear,
            provenance: 'QUESTION_BANK'
          };
        });
      }
    } catch (dbErr) {
      console.warn('Database query failed for question bank, falling back to static bundles:', dbErr);
    }

    // If DB returned 0 questions or failed, load from SSC-I & SSC-II bundles
    if (page === 1 && formatted.length === 0 && (!subject || subject === 'ALL' || subject.toLowerCase() === 'physics') && (!searchParams.get('boardId') || ['ALL', 'AKU-EB'].includes(searchParams.get('boardId')!))) {
      const isClass10 = ['10', 'X'].includes(classParam);
      const isClass9 = ['9', 'IX'].includes(classParam);

      let combinedRaw: { raw: any; cls: number }[] = [];
      if (isClass10) {
        combinedRaw = (ssc2ModelMcqs as any[]).map(q => ({ raw: q, cls: 10 }));
      } else if (isClass9) {
        combinedRaw = (ssc1ModelMcqs as any[]).map(q => ({ raw: q, cls: 9 }));
      } else {
        // Both classes available
        combinedRaw = [
          ...(ssc1ModelMcqs as any[]).map(q => ({ raw: q, cls: 9 })),
          ...(ssc2ModelMcqs as any[]).map(q => ({ raw: q, cls: 10 }))
        ];
      }

      formatted = combinedRaw.map(({ raw: q, cls }) => {
        const rawOpts = q.options || {};
        const correctKey = (q.correctOption || '').toUpperCase().trim();
        const opts = Object.entries(rawOpts).map(([key, val]) => ({
          id: `opt-${key}`,
          text: String(val),
          isCorrect: key.toUpperCase() === correctKey
        }));

        const diff = q.cognitiveLevel === 'Application' ? 'Hard' : q.cognitiveLevel === 'Understanding' ? 'Medium' : 'Easy';

        return {
          id: `bank-ssc${cls}-q${q.questionNumber}`,
          questionType: 'MCQ_SINGLE',
          stemText: q.stem || '',
          difficulty: diff,
          marks: q.marks || 1,
          cognitiveLevel: q.cognitiveLevel || 'Understanding',
          options: opts,
          explanation: q.explanation || '',
          sourcePaper: `AKU-EB Class ${cls} Model Paper I`,
          examYear: 2025,
          provenance: 'QUESTION_BANK'
        };
      });

      // Filter by search query if provided
      if (query) {
        formatted = formatted.filter(item =>
          item.stemText.toLowerCase().includes(query) ||
          item.explanation.toLowerCase().includes(query) ||
          item.sourcePaper.toLowerCase().includes(query)
        );
      }

      // Filter by difficulty if provided
      if (difficulty && difficulty !== 'ALL') {
        formatted = formatted.filter(item => item.difficulty.toUpperCase() === difficulty);
      }
    }

    return NextResponse.json({
      success: true,
      page, hasMore, total: formatted.length,
      questions: formatted.slice(0, limit).filter(q => questionSchema.safeParse(q).success)
    });
  } catch (err: any) {
    console.error('Question bank query error:', err);
    return apiError(err);
  }
}
