import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import ssc1ModelMcqs from '@/data/physics/ssc1_model_mcqs.json';
import ssc2ModelMcqs from '@/data/physics/ssc2_model_mcqs.json';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const query = (searchParams.get('q') || searchParams.get('search') || '').toLowerCase();
    const subject = searchParams.get('subject') || '';
    const classParam = searchParams.get('class') || searchParams.get('classLevel') || '';
    const difficulty = (searchParams.get('difficulty') || '').toUpperCase();
    const limit = parseInt(searchParams.get('limit') || '100');

    let formatted: any[] = [];

    // Attempt DB query first
    try {
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
      }
    } catch (dbErr) {
      console.warn('Database query failed for question bank, falling back to static bundles:', dbErr);
    }

    // If DB returned 0 questions or failed, load from SSC-I & SSC-II bundles
    if (formatted.length === 0) {
      const isClass10 = classParam.includes('10') || classParam.includes('X');
      const isClass9 = classParam.includes('9') || classParam.includes('IX');

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
        const correctKey = (q.correctOption || 'A').toUpperCase().trim();
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
      total: formatted.length,
      questions: formatted.slice(0, limit)
    });
  } catch (err: any) {
    console.error('Question bank query error:', err);
    return NextResponse.json({ error: 'Failed to query question bank' }, { status: 500 });
  }
}


