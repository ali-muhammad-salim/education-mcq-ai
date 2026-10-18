import { NextResponse } from 'next/server';
import { prisma } from '../../../lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const download = searchParams.get('download'); // 'json', 'csv'
    const classLevel = searchParams.get('class'); // '9', '10', 'all'

    // Fetch all physics syllabus versions with topics, subtopics, and SLOs
    const subjects = await prisma.subject.findMany({
      where: {
        name: { contains: 'Physics', mode: 'insensitive' },
      },
      include: {
        academicClass: true,
        syllabusVersions: {
          include: {
            topics: {
              orderBy: { topicNumber: 'asc' },
              include: {
                subtopics: {
                  orderBy: { subtopicNum: 'asc' },
                  include: {
                    slos: {
                      orderBy: { code: 'asc' },
                    },
                  },
                },
              },
            },
          },
        },
      },
      orderBy: {
        academicClass: {
          level: 'asc',
        },
      },
    });

    // Filter by class if specified
    const filteredSubjects = subjects.filter(s => {
      if (!classLevel || classLevel === 'all') return true;
      if (classLevel === '9') return s.academicClass.level === 9;
      if (classLevel === '10') return s.academicClass.level === 10;
      return true;
    });

    // Flatten for CSV export if requested
    if (download === 'csv') {
      const rows: string[] = [];
      rows.push('Class,Subject,Topic_Number,Topic_Name,Subtopic_Number,Subtopic_Name,SLO_Code,Cognitive_Level,Is_Practical,Description');

      filteredSubjects.forEach(s => {
        const clsName = `Class ${s.academicClass.name || s.academicClass.level}`;
        const subName = s.name;

        s.syllabusVersions.forEach(v => {
          v.topics.forEach(t => {
            const tNum = t.topicNumber || '';
            const tName = `"${t.name.replace(/"/g, '""')}"`;

            t.subtopics.forEach(sub => {
              const subNum = sub.subtopicNum || '';
              const subNameClean = `"${sub.name.replace(/"/g, '""')}"`;

              sub.slos.forEach(slo => {
                const code = slo.code || '';
                const cog = slo.cognitiveLevel || '';
                const practical = slo.isPractical ? 'YES' : 'NO';
                const desc = `"${slo.description.replace(/"/g, '""')}"`;

                rows.push([clsName, subName, tNum, tName, subNum, subNameClean, code, cog, practical, desc].join(','));
              });
            });
          });
        });
      });

      const filename = classLevel ? `aku_eb_curriculum_slos_class_${classLevel}.csv` : 'aku_eb_curriculum_slos_complete_matrix.csv';
      return new NextResponse(rows.join('\n'), {
        status: 200,
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="${filename}"`,
        },
      });
    }

    if (download === 'json') {
      const filename = classLevel ? `aku_eb_curriculum_slos_class_${classLevel}.json` : 'aku_eb_curriculum_slos_complete_matrix.json';
      return new NextResponse(JSON.stringify(filteredSubjects, null, 2), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Content-Disposition': `attachment; filename="${filename}"`,
        },
      });
    }

    // Default JSON response for UI
    return NextResponse.json({
      success: true,
      subjects: filteredSubjects,
    });
  } catch (error: any) {
    console.error('Error fetching curriculum:', error);
    return NextResponse.json({ error: error.message || 'Error fetching curriculum' }, { status: 500 });
  }
}
