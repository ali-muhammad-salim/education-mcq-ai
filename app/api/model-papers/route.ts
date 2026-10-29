import { getAllStandardPapers, getFallbackPaper } from '@/lib/paperDataService';
import { NextResponse } from 'next/server';
import { prisma } from '../../../lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const paperCode = searchParams.get('paperCode');
    const classLevel = searchParams.get('class'); // '9', '10'
    const download = searchParams.get('download'); // 'json', 'csv'

    const whereClause: any = {};
    if (paperCode) {
      whereClause.paperCode = paperCode;
    }

    const papers: any[] = await prisma.pastPaper.findMany({
      where: whereClause,
      include: {
        academicClass: true,
        subject: true,
        questions: {
          orderBy: { questionNumber: 'asc' },
          include: {
            slos: {
              include: {
                slo: true,
              },
            },
          },
        },
      },
      orderBy: [
        { examYear: 'desc' },
        { paperCode: 'asc' },
      ],
    });

    for (const entry of getAllStandardPapers()) { if (!papers.some(p => p.paperCode === entry.paperCode) && (!paperCode || entry.paperCode === paperCode)) { const paper = getFallbackPaper(entry.paperCode); if (paper) papers.push(paper); } }
    const filteredPapers = papers.filter(p => {
      if (!classLevel || classLevel === 'all') return true;
      if (classLevel === '9') return p.academicClass?.level === 9;
      if (classLevel === '10') return p.academicClass?.level === 10;
      return true;
    });

    // CSV Download
    if (download === 'csv') {
      const rows: string[] = [];
      rows.push('Paper_Code,Paper_Title,Class,Question_Number,Type,Marks,Cognitive_Level,Question_Text,Choices_Or_Parts,Explanation_Or_Rubric');

      filteredPapers.forEach(p => {
        const pCode = p.paperCode || '';
        const pTitle = `"${p.title.replace(/"/g, '""')}"`;
        const clsName = `Class ${p.academicClass?.name || p.academicClass?.level || ''}`;

        p.questions.forEach((q: any) => {
          const qNum = `"${String(q.questionNumber).replace(/"/g, '""')}"`;
          const qType = q.questionType;
          const marks = q.marks || 1;
          const cog = q.difficulty || '';
          const qText = `"${q.questionText.replace(/"/g, '""')}"`;

          let choicesStr = '';
          let explStr = '';

          const src: any = q.sourceRegion || {};
          if (src.choices) {
            choicesStr = Object.entries(src.choices)
              .map(([k, v]) => `${k}: ${v}`)
              .join(' | ');
          }
          if (src.explanation) {
            explStr = src.explanation;
          } else if (src.rubric) {
            explStr = Array.isArray(src.rubric)
              ? src.rubric.map((r: any) => `${r.marks || ''}M: ${r.description || r}`).join('; ')
              : JSON.stringify(src.rubric);
          }

          rows.push([
            pCode,
            pTitle,
            clsName,
            qNum,
            qType,
            marks,
            cog,
            qText,
            `"${choicesStr.replace(/"/g, '""')}"`,
            `"${explStr.replace(/"/g, '""')}"`,
          ].join(','));
        });
      });

      const filename = paperCode 
        ? `${paperCode}_questions.csv`
        : `aku_eb_model_papers_questions_${classLevel || 'all'}.csv`;

      return new NextResponse(rows.join('\n'), {
        status: 200,
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="${filename}"`,
        },
      });
    }

    // JSON Download
    if (download === 'json') {
      const filename = paperCode 
        ? `${paperCode}_model_paper.json`
        : `aku_eb_model_papers_complete_${classLevel || 'all'}.json`;

      return new NextResponse(JSON.stringify(filteredPapers, null, 2), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Content-Disposition': `attachment; filename="${filename}"`,
        },
      });
    }

    return NextResponse.json({
      success: true,
      totalPapers: filteredPapers.length,
      papers: filteredPapers,
    });
  } catch (error: any) {
    console.error('Error fetching model papers:', error);
    return NextResponse.json({ error: error.message || 'Error fetching model papers' }, { status: 500 });
  }
}
