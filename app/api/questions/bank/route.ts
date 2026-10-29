import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireUser } from '@/lib/security';
import { z } from 'zod';
import { apiError } from '@/lib/api';
import { questionSchema } from '@/lib/validations/assessment';
import { smartMatch, smartScore } from '@/lib/smartSearch';
import ssc1ModelMcqs from '@/data/physics/ssc1_model_mcqs.json';
import ssc2ModelMcqs from '@/data/physics/ssc2_model_mcqs.json';
import ssc1Past2025Mcqs from '@/data/physics/ssc1_2025_past_mcqs.json';
import ssc1Past2024Mcqs from '@/data/physics/ssc1_2024_past_mcqs.json';
import ssc2Past2025Mcqs from '@/data/physics/ssc2_2025_past_mcqs.json';

export async function GET(req: NextRequest) {
  try {
    await requireUser(req, ['TEACHER', 'ADMIN']);
    const { searchParams } = new URL(req.url);
    const query = (searchParams.get('q') || searchParams.get('search') || '').trim();
    const subject = searchParams.get('subject') || '';
    const classParam = searchParams.get('class') || searchParams.get('classLevel') || '';
    const difficulty = (searchParams.get('difficulty') || '').toUpperCase();
    const limit = z.coerce.number().int().min(1).max(100).parse(searchParams.get('limit') || '100');

    const page = z.coerce.number().int().min(1).max(10000).parse(searchParams.get('page') || '1');
    let hasMore = false;
    let formatted: any[] = [];

    // Attempt DB query first (fetch broader candidate pool when query uses typos/synonyms)
    try {
      const where: any = {};
      where.pastPaper = {
        ...(subject && subject !== 'ALL' ? { subject: { name: { equals: subject, mode: 'insensitive' } } } : {}),
        ...(/^(9|10|IX|X)$/.test(classParam) ? { academicClass: { level: ['9', 'IX'].includes(classParam) ? 9 : 10 } } : {})
      };
      const board = searchParams.get('boardId');
      if (board && board !== 'ALL') {
        where.pastPaper.academicClass = { ...where.pastPaper.academicClass, programme: { board: { shortCode: board } } };
      }
      if (difficulty && difficulty !== 'ALL') {
        where.difficulty = {
          in: [difficulty, ({ EASY: 'K', MEDIUM: 'U', HARD: 'A' } as Record<string, string>)[difficulty] || difficulty],
          mode: 'insensitive'
        };
      }

      const pastQuestions = await prisma.pastPaperQuestion.findMany({
        where,
        take: query ? 200 : limit + 1,
        skip: query ? 0 : (page - 1) * limit,
        include: {
          pastPaper: {
            select: { paperCode: true, examYear: true, title: true }
          },
          cognitiveLevels: {
            include: { cognitiveLevel: true }
          }
        }
      });

      if (pastQuestions && pastQuestions.length > 0) {
        let mapped = pastQuestions.map(q => {
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
            questionType: ({ MULTIPLE_CHOICE: 'MCQ_SINGLE', CONSTRUCTED_RESPONSE: 'CRQ', EXTENDED_RESPONSE: 'LONG_ANSWER' } as Record<string, string>)[q.questionType] || q.questionType || 'MCQ_SINGLE',
            stemText: q.questionText,
            difficulty: q.difficulty || 'Medium',
            marks: q.marks || 1,
            cognitiveLevel: cog,
            options: opts,
            rubric: sr.rubric ? JSON.stringify(sr.rubric) : undefined,
            correctAnswerText: sr.correct_answer_text || undefined,
            explanation: sr.explanation || '',
            slo: sr.slo || undefined,
            sourcePaper: q.pastPaper?.paperCode,
            examYear: q.pastPaper?.examYear,
            provenance: 'QUESTION_BANK'
          };
        });

        if (query) {
          mapped = mapped
            .map(item => ({
              item,
              score: smartScore(
                `${item.stemText} ${item.explanation} ${item.sourcePaper || ''} ${item.options.map((o: any) => o.text).join(' ')}`,
                query,
                item.slo
              )
            }))
            .filter(entry => entry.score >= 0.68)
            .sort((a, b) => b.score - a.score)
            .map(entry => entry.item);
        }

        hasMore = mapped.length > limit;
        formatted = mapped.slice(0, limit);
      }
    } catch (dbErr) {
      console.warn('Database query failed for question bank, falling back to static bundles:', dbErr);
    }

    // If DB returned 0 questions or failed, load from SSC-I & SSC-II bundles
    if (page === 1 && formatted.length === 0 && (!subject || subject === 'ALL' || subject.toLowerCase() === 'physics') && (!searchParams.get('boardId') || ['ALL', 'AKU-EB'].includes(searchParams.get('boardId')!))) {
      const isClass10 = ['10', 'X'].includes(classParam);
      const isClass9 = ['9', 'IX'].includes(classParam);

      let combinedRaw: { raw: any; cls: number; source: string; year: number }[] = [];
      if (isClass10) {
        combinedRaw = [
          ...(ssc2ModelMcqs as any[]).map(q => ({ raw: q, cls: 10, source: 'AKU-EB Class 10 Model Paper I', year: 2025 })),
          ...(ssc2Past2025Mcqs as any[]).map(q => ({ raw: q, cls: 10, source: 'AKU-EB Class 10 Annual 2025 Paper I', year: 2025 })),
        ];
      } else if (isClass9) {
        combinedRaw = [
          ...(ssc1ModelMcqs as any[]).map(q => ({ raw: q, cls: 9, source: 'AKU-EB Class 9 Model Paper I', year: 2025 })),
          ...(ssc1Past2025Mcqs as any[]).map(q => ({ raw: q, cls: 9, source: 'AKU-EB Class 9 Annual 2025 Paper I', year: 2025 })),
          ...(ssc1Past2024Mcqs as any[]).map(q => ({ raw: q, cls: 9, source: 'AKU-EB Class 9 Annual 2024 Paper I', year: 2024 })),
        ];
      } else {
        combinedRaw = [
          ...(ssc1ModelMcqs as any[]).map(q => ({ raw: q, cls: 9, source: 'AKU-EB Class 9 Model Paper I', year: 2025 })),
          ...(ssc1Past2025Mcqs as any[]).map(q => ({ raw: q, cls: 9, source: 'AKU-EB Class 9 Annual 2025 Paper I', year: 2025 })),
          ...(ssc1Past2024Mcqs as any[]).map(q => ({ raw: q, cls: 9, source: 'AKU-EB Class 9 Annual 2024 Paper I', year: 2024 })),
          ...(ssc2ModelMcqs as any[]).map(q => ({ raw: q, cls: 10, source: 'AKU-EB Class 10 Model Paper I', year: 2025 })),
          ...(ssc2Past2025Mcqs as any[]).map(q => ({ raw: q, cls: 10, source: 'AKU-EB Class 10 Annual 2025 Paper I', year: 2025 })),
        ];
      }

      formatted = combinedRaw.map(({ raw: q, cls, source, year }, idx) => {
        const rawOpts = q.options || {};
        const correctKey = (q.correctOption || '').toUpperCase().trim();
        const opts = Object.entries(rawOpts).map(([key, val]) => ({
          id: `opt-${key}`,
          text: String(val),
          isCorrect: key.toUpperCase() === correctKey
        }));

        const diff = q.cognitiveLevel === 'Application' || q.cognitiveLevel === 'A'
          ? 'Hard'
          : q.cognitiveLevel === 'Understanding' || q.cognitiveLevel === 'U'
          ? 'Medium'
          : 'Easy';

        return {
          id: `bank-ssc${cls}-${year}-${idx}-q${q.questionNumber}`,
          questionType: 'MCQ_SINGLE',
          stemText: q.stem || '',
          difficulty: diff,
          marks: q.marks || 1,
          cognitiveLevel: q.cognitiveLevel || 'Understanding',
          options: opts,
          explanation: q.explanation || '',
          slo: q.current_slo || q.slo || '',
          sourcePaper: source,
          examYear: year,
          provenance: 'QUESTION_BANK'
        };
      });

      if (query) {
        formatted = formatted
          .map(q => ({
            q,
            score: smartScore(
              `${q.stemText} ${q.explanation} ${q.sourcePaper} ${q.options.map((o: any) => o.text).join(' ')}`,
              query,
              q.slo
            )
          }))
          .filter(entry => entry.score >= 0.68)
          .sort((a, b) => b.score - a.score)
          .map(entry => entry.q);
      }

      if (difficulty && difficulty !== 'ALL') {
        formatted = formatted.filter(q => q.difficulty.toUpperCase() === difficulty);
      }

      hasMore = formatted.length > limit;
      formatted = formatted.slice(0, limit);
    }

    return NextResponse.json({
      questions: formatted,
      total: formatted.length,
      page,
      hasMore
    });
  } catch (err) {
    return apiError(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser(req, ['TEACHER', 'ADMIN']);
    const body = await req.json();
    const parsed = questionSchema.parse(body);

    const record = await prisma.questionBankItem.create({
      data: {
        creatorId: user.id,
        questionType: parsed.questionType,
        stemText: parsed.stemText,
        difficulty: parsed.difficulty || 'Medium',
        marks: parsed.marks,
        cognitiveLevel: parsed.cognitiveLevel || 'Understanding',
        content: parsed as any
      }
    });

    return NextResponse.json({ question: record }, { status: 201 });
  } catch (err) {
    return apiError(err);
  }
}
