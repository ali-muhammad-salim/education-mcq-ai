import React from 'react';
import { notFound } from 'next/navigation';
import { getFallbackPaper } from '@/lib/paperDataService';
import { getQuizFromStore } from '@/lib/submissionStore';
import prisma from '@/lib/prisma';
import TakeQuizPageClient from './TakeQuizPageClient';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ id: string }> | { id: string };
}

export default async function TakeQuizPage({ params }: PageProps) {
  const resolvedParams = await Promise.resolve(params);
  const id = resolvedParams.id;

  // 1. Check standard fallback papers (including PHY-IX-CHAP1-2)
  let paper = getFallbackPaper(id);

  // 2. Check custom quizzes in file store
  if (!paper) {
    const custom = getQuizFromStore(id);
    if (custom) {
      paper = {
        id: custom.id,
        title: custom.title,
        paperCode: custom.code || custom.id,
        examYear: 2024,
        academicClass: { name: `Class ${custom.classLevel || 9}`, level: Number(custom.classLevel) || 9 },
        subject: { id: 'physics', name: custom.subject || 'Physics', code: 'PHY' },
        questions: (custom.questions || []).map((q: any, idx: number) => ({
          id: q.id || `q-${idx + 1}`,
          questionNumber: String(idx + 1),
          questionText: q.stemText || q.stem || '',
          questionType: 'MULTIPLE_CHOICE' as const,
          marks: q.marks || 1,
          difficulty: q.cognitiveLevel || 'U',
          diagramBased: !!q.isDiagram,
          sourceRegion: {
            choices: (q.options || []).reduce((acc: any, opt: any, i: number) => {
              const k = opt.id || String.fromCharCode(65 + i);
              acc[k] = opt.text;
              return acc;
            }, {}),
            correct_answer: (q.options || []).find((o: any) => o.isCorrect)?.id || q.correctOption || 'A',
            explanation: q.explanation || '',
            diagramUrl: q.diagramUrl,
            slo: q.slo
          }
        }))
      };
    }
  }

  // 3. Check Prisma database for teacher-published quizzes
  if (!paper) {
    try {
      const dbQuiz = await prisma.quiz.findUnique({
        where: { id },
        include: {
          questions: { orderBy: { orderIndex: 'asc' } }
        }
      });
      if (dbQuiz) {
        paper = {
          id: dbQuiz.id,
          title: dbQuiz.title,
          paperCode: (dbQuiz as any).code || dbQuiz.id,
          examYear: 2024,
          academicClass: { name: 'Class IX', level: 9 },
          subject: { id: 'physics', name: 'Physics', code: 'PHY' },
          questions: dbQuiz.questions.map((q: any, idx: number) => {
            const qData = typeof q.questionData === 'object' ? q.questionData : {};
            return {
              id: q.id,
              questionNumber: String(idx + 1),
              questionText: qData.stemText || '',
              questionType: 'MULTIPLE_CHOICE' as const,
              marks: q.marks || 1,
              difficulty: qData.difficulty || 'U',
              diagramBased: !!qData.isDiagram,
              sourceRegion: {
                choices: (qData.options || []).reduce((acc: any, opt: any, i: number) => {
                  const k = opt.id || String.fromCharCode(65 + i);
                  acc[k] = opt.text;
                  return acc;
                }, {}),
                correct_answer: (qData.options || []).find((o: any) => o.isCorrect)?.id || 'A',
                explanation: qData.explanation || '',
                diagramUrl: qData.diagramUrl
              }
            };
          })
        };
      }
    } catch (e) {}
  }

  // 4. Default fallback if not found
  if (!paper) {
    if (id.toLowerCase().includes('chap') || id.includes('1-2')) {
      paper = getFallbackPaper('PHY-IX-CHAP1-2');
    } else {
      paper = getFallbackPaper('PHY-IX-P1');
    }
  }

  if (!paper || !paper.questions || paper.questions.length === 0) {
    return notFound();
  }

  return (
    <TakeQuizPageClient
      paperTitle={paper.title}
      paperCode={paper.paperCode}
      questions={paper.questions}
    />
  );
}
