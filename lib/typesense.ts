/**
 * Universal Hybrid Search Service (Typesense + pgvector Embeddings + Smart Fuzzy/Synonym Engine)
 *
 * Searches across SLOs, Past/Model Papers, Practice Questions (MCQs & CRQs),
 * Published Quizzes, and Resource Guides using:
 * 1. Typesense cluster (if configured)
 * 2. PostgreSQL pgvector embeddings (SLO.embedding & KnowledgeArtifact.embedding when GEMINI_EMBEDDING_MODEL is set)
 * 3. Typo-tolerant Levenshtein/trigram + scientific synonym ranking (smartScore)
 */

import { Prisma } from '@prisma/client';
import prisma from '@/lib/prisma';
import { smartScore } from '@/lib/smartSearch';
import { embedKnowledge } from '@/services/knowledge/search';
import { canonicalModel } from '@/services/ai/provider';
import { getAllStandardPapers, getFallbackPaper } from '@/lib/paperDataService';
import physicsIX from '@/data/physics/ssc1_exact_syllabus.json';
import physicsX from '@/data/physics/ssc2_exact_syllabus.json';
import csIX from '@/data/computer-science/ssc1_exact_syllabus.json';
import csX from '@/data/computer-science/ssc2_exact_syllabus.json';
import chemIX from '@/data/chemistry/ssc1_exact_syllabus.json';
import chemX from '@/data/chemistry/ssc2_exact_syllabus.json';
import { hsscPhysicsSyllabus } from '@/lib/hsscPhysicsSyllabus';
import { hsscPhysicsResources } from '@/lib/hsscPhysicsResources';

export interface SearchResultItem {
  id: string;
  type: 'RESOURCE' | 'QUESTION' | 'SLO' | 'SUBJECT';
  title: string;
  description?: string;
  boardId?: string;
  classLevel?: number;
  subject?: string;
  url?: string;
  badge?: string;
  score?: number;
}

export async function searchEducationalContent(
  query: string,
  filters: {
    boardId?: string;
    classLevel?: number;
    subject?: string;
    type?: string;
  } = {}
): Promise<SearchResultItem[]> {
  const q = query.trim();
  if (!q) return [];

  const results = new Map<string, SearchResultItem>();
  const addResult = (item: SearchResultItem) => {
    const existing = results.get(item.id);
    if (!existing || (item.score || 0) > (existing.score || 0)) {
      results.set(item.id, item);
    }
  };

  // 1. Try Typesense cluster first if configured
  const host = process.env.TYPESENSE_HOST;
  const apiKey = process.env.TYPESENSE_API_KEY;
  if (host && apiKey) {
    try {
      const protocol = process.env.TYPESENSE_PROTOCOL || 'https';
      const port = process.env.TYPESENSE_PORT || '443';
      const url = `${protocol}://${host}:${port}/collections/educational_content/documents/search?q=${encodeURIComponent(q)}&query_by=title,description`;
      const res = await fetch(url, {
        headers: { 'X-TYPESENSE-API-KEY': apiKey }
      });
      if (res.ok) {
        const json = await res.json();
        if (json.hits && Array.isArray(json.hits)) {
          for (const h of json.hits) {
            if (h.document?.id) {
              addResult({ ...h.document, score: 1.0 });
            }
          }
        }
      }
    } catch (err) {
      console.warn('Typesense search fallback to hybrid pgvector + smart search:', err);
    }
  }

  // 2. Semantic pgvector Embedding Search across SLO.embedding & KnowledgeArtifact.embedding (if configured)
  if (canonicalModel(process.env.GEMINI_EMBEDDING_MODEL)) {
    try {
      const queryEmb = await embedKnowledge(q, 'RETRIEVAL_QUERY');
      const vecJson = JSON.stringify(queryEmb.vector);
      const semanticSlos = await prisma.$queryRaw<
        { id: string; code: string | null; description: string; topicName: string; level: number; subjectName: string; boardCode: string; similarity: number }[]
      >(Prisma.sql`
        SELECT s.id, s.code, s.description, t.name AS "topicName", c.level, subj.name AS "subjectName", b."shortCode" AS "boardCode",
               (1 - (s.embedding <=> ${vecJson}::vector))::float8 AS similarity
        FROM "SLO" s
        JOIN "Subtopic" sub ON sub.id = s."subtopicId"
        JOIN "Topic" t ON t.id = sub."topicId"
        JOIN "SyllabusVersion" v ON v.id = t."syllabusVersionId"
        JOIN "Subject" subj ON subj.id = v."subjectId"
        JOIN "Class" c ON c.id = subj."classId"
        JOIN "Programme" p ON p.id = c."programmeId"
        JOIN "Board" b ON b.id = p."boardId"
        WHERE v."isLatest" = true AND s.embedding IS NOT NULL
          AND (1 - (s.embedding <=> ${vecJson}::vector)) >= 0.68
        ORDER BY s.embedding <=> ${vecJson}::vector ASC
        LIMIT 8
      `);
      for (const row of semanticSlos) {
        if (filters.classLevel && row.level !== filters.classLevel) continue;
        const roman = ({ 9: 'IX', 10: 'X', 11: 'XI', 12: 'XII' } as Record<number, string>)[row.level] || String(row.level);
        addResult({
          id: `slo-${row.level}-${row.code || row.id}`,
          type: 'SLO',
          title: `SLO ${row.code || ''} · ${row.topicName}`.trim(),
          description: row.description,
          boardId: row.boardCode.toLowerCase(),
          classLevel: row.level,
          subject: row.subjectName,
          badge: `Semantic Match (${Math.round(row.similarity * 100)}%)`,
          url: `/akueb/${roman}/${row.subjectName.toLowerCase()}/syllabus${row.code ? '#slo-' + encodeURIComponent(row.code) : ''}`,
          score: row.similarity,
        });
      }
    } catch {
      /* Semantic vector lookup is optional and gracefully falls back when DB or provider is offline. */
    }
  }

  // 3. Database Quizzes & Past Papers with Typo & Synonym Scoring
  try {
    const quizzes = await prisma.quiz.findMany({
      where: { status: 'PUBLISHED', visibility: 'PUBLIC' },
      take: 40,
      orderBy: { createdAt: 'desc' },
    });
    for (const item of quizzes) {
      const score = smartScore(`${item.title} ${item.description || ''}`, q, item.code || undefined);
      if (score >= 0.68) {
        addResult({
          id: `quiz-${item.id}`,
          type: 'RESOURCE',
          title: item.title,
          description: item.description || 'Published Interactive Quiz',
          boardId: item.boardId || 'akueb',
          badge: 'Interactive Quiz',
          url: `/quizzes/${item.id}/take`,
          score,
        });
      }
    }

    const dbPapers = await prisma.pastPaper.findMany({
      include: { academicClass: true, subject: true },
      take: 40,
      orderBy: { examYear: 'desc' },
    });
    for (const p of dbPapers) {
      if (filters.classLevel && p.academicClass?.level !== filters.classLevel) continue;
      const code = p.paperCode || p.id;
      if (/CHAP1-2/i.test(code)) continue;
      const score = smartScore(`${p.title} ${code} ${p.examSession || ''} ${p.examYear}`, q, code);
      if (score >= 0.68) {
        addResult({
          id: `paper-${code}`,
          type: 'RESOURCE',
          title: p.title || code,
          description: `${p.academicClass?.name || ''} · ${p.examSession || 'Examination Paper'} (${p.examYear})`.trim(),
          boardId: 'akueb',
          classLevel: p.academicClass?.level,
          subject: p.subject?.name,
          badge: `${p.examYear} Paper`,
          url: `/past-papers/${encodeURIComponent(code)}`,
          score,
        });
      }
    }
  } catch {
    /* Continue with bundled syllabus, papers, and question bank search when DB is unavailable. */
  }

  // 4. Search the bundled syllabi and link directly to chapter and SLO anchors.
  const syllabusSets = [
    { level: 9, roman: 'IX', subject: 'Physics', slug: 'physics', units: physicsIX as any[] },
    { level: 10, roman: 'X', subject: 'Physics', slug: 'physics', units: physicsX as any[] },
    { level: 11, roman: 'XI', subject: 'Physics', slug: 'physics', units: hsscPhysicsSyllabus('akueb', 11, 'physics')!.units },
    { level: 12, roman: 'XII', subject: 'Physics', slug: 'physics', units: hsscPhysicsSyllabus('akueb', 12, 'physics')!.units },
    { level: 9, roman: 'IX', subject: 'Computer Science', slug: 'computer-science', units: csIX as any[] },
    { level: 10, roman: 'X', subject: 'Computer Science', slug: 'computer-science', units: csX as any[] },
    { level: 9, roman: 'IX', subject: 'Chemistry', slug: 'chemistry', units: chemIX as any[] },
    { level: 10, roman: 'X', subject: 'Chemistry', slug: 'chemistry', units: chemX as any[] },
  ] as const;

  for (const { level, roman, subject, slug, units } of syllabusSets) {
    if (filters.classLevel && filters.classLevel !== level) continue;
    const chapterQuiz = level <= 10;
    const syllabusUrl = `/akueb/${roman}/${slug}/syllabus`;
    if (!chapterQuiz) {
      const title = `Physics Class ${roman} · HSSC ${level === 11 ? 'I' : 'II'} · 2025 Syllabus`;
      const score = smartScore(title, q);
      if (score >= 0.68) addResult({
        id: `physics-hssc-syllabus-${level}`, type: 'RESOURCE', title, score,
        boardId: 'akueb', classLevel: level, subject, badge: 'Syllabus', url: syllabusUrl,
      });
    }
    for (const unit of units) {
      const subtopics = unit.subtopics || [];
      const sloCount = subtopics.reduce(
        (sum: number, sub: any) => sum + (sub.slos?.length || 0),
        0
      );
      const topicNames = subtopics.map((sub: any) => sub.name).join(' ');
      const unitScore = smartScore(
        `${subject} Class ${roman} Unit ${unit.unitNumber} ${unit.name} ${topicNames} ${chapterQuiz ? 'chapter wise mcqs quiz practice' : 'syllabus learning outcomes'}`,
        q
      );
      if (unitScore >= 0.68) {
        addResult({
          id: `chapter-${chapterQuiz ? 'quiz' : 'syllabus'}-${level}-${slug}-${unit.unitNumber}`,
          type: 'RESOURCE',
          title: `${subject} ${roman} · Unit ${unit.unitNumber}: ${unit.name} — ${chapterQuiz ? 'Chapter-Wise MCQs Quiz' : 'Syllabus'}`,
          description: chapterQuiz
            ? `Chapter-wise MCQ quiz covering ${subtopics.length} subtopics and ${sloCount} SLOs, with model and past-paper questions plus instant answer checking.`
            : `${subtopics.length} subtopics and ${sloCount} learning outcomes from the 2025 syllabus.`,
          boardId: 'akueb',
          classLevel: level,
          subject,
          badge: chapterQuiz ? 'Chapter MCQs' : 'Syllabus chapter',
          url: chapterQuiz ? `/akueb/${roman}/${slug}/mcqs/chapter-wise?unit=${unit.unitNumber}` : syllabusUrl + '#unit-' + unit.unitNumber,
          score: unitScore,
        });
      }
      for (const sub of subtopics) {
        for (const slo of sub.slos || []) {
          const score = smartScore(
            `Unit ${unit.unitNumber} ${unit.name} ${sub.name} ${slo.code} ${slo.description}`,
            q,
            slo.code
          );
          if (score >= 0.68) {
            addResult({
              id: `slo-${level}-${slug}-${slo.code}`,
              type: 'SLO',
              title: `SLO ${slo.code} · Unit ${unit.unitNumber}: ${unit.name}`,
              description: slo.description,
              boardId: 'akueb',
              classLevel: level,
              subject,
              badge: `Class ${roman} · ${slo.cognitiveLevel}`,
              url: syllabusUrl + '#slo-' + encodeURIComponent(slo.code),
              score,
            });
          }
        }
      }
    }
  }

  // 5. Smart Typo + Synonym Search across all Standard Papers & Individual Questions (MCQs & CRQs)
  for (const summary of getAllStandardPapers()) {
    if (filters.classLevel && summary.academicClass.level !== filters.classLevel) continue;
    const paperScore = smartScore(
      `${summary.title} ${summary.paperCode} ${summary.examSession} ${summary.examYear} ${summary.academicClass.name}`,
      q,
      summary.paperCode
    );
    if (paperScore >= 0.68) {
      addResult({
        id: `paper-${summary.paperCode}`,
        type: 'RESOURCE',
        title: summary.title,
        description: `${summary.academicClass.name} · ${summary.examSession} (${summary.examYear})`,
        boardId: 'akueb',
        classLevel: summary.academicClass.level,
        subject: summary.subject.name,
        badge: `${summary.examYear} Paper`,
        url: `/past-papers/${encodeURIComponent(summary.paperCode)}`,
        score: paperScore,
      });
    }

    const fullPaper = getFallbackPaper(summary.paperCode);
    if (!fullPaper) continue;
    for (const question of fullPaper.questions) {
      const choicesText = Object.values(question.sourceRegion?.choices || {}).join(' ');
      const topicName = question.topics?.[0]?.topic?.name || '';
      const sloCode = question.sourceRegion?.current_slo || question.sourceRegion?.slo || '';
      const origSlo = question.sourceRegion?.slo || '';
      const qScore = smartScore(
        `${question.questionText} ${choicesText} ${topicName} ${sloCode} ${origSlo} ${question.sourceRegion?.explanation || ''} ${question.sourceRegion?.model_answer || ''} ${question.sourceRegion?.better_response || ''}`,
        q,
        sloCode
      );
      if (qScore >= 0.72) {
        addResult({
          id: `question-${summary.paperCode}-${question.questionNumber}`,
          type: 'QUESTION',
          title: `${summary.paperCode} · Q${question.questionNumber}${sloCode ? ` (2025 SLO ${sloCode})` : origSlo ? ` (SLO ${origSlo})` : ''}`,
          description: question.questionText.slice(0, 180),
          boardId: 'akueb',
          classLevel: summary.academicClass.level,
          subject: summary.subject.name,
          badge: `${summary.academicClass.name} · ${question.questionType === 'MULTIPLE_CHOICE' ? 'MCQ' : 'CRQ/ERQ'}`,
          url: `/past-papers/${encodeURIComponent(summary.paperCode)}?view=solved#question-${encodeURIComponent(String(question.questionNumber))}`,
          score: qScore,
        });
      }
    }
  }

  // 6. Official Guides (E-Marking Notes, Answer Keys, Resource Guides, Pacing Guides, Practical Paper III)
  const guides: SearchResultItem[] = [
    ...[11, 12].flatMap(level => {
      const hssc = hsscPhysicsResources("akueb", level, "Physics")!;
      return [
        { label: "Teaching and learning resource guide", href: "/books?view=guide" },
        { label: "28-week pacing guide", href: "/books?view=pacing" },
        { label: "Paper III sample practical", href: "/practicals" },
      ].map(({ label, href }): SearchResultItem => ({
        id: `physics-hssc-${level}-${href}`, type: "RESOURCE", title: `Physics Class ${hssc.roman} · ${label}`,
        boardId: "akueb", classLevel: level, subject: "Physics", url: hssc.base + href,
      }));
    }),
    {
      id: 'guide-emarking-2025',
      type: 'RESOURCE',
      title: 'Physics IX · 2025 · Official E-Marking Notes & Examiner Commentary',
      description: 'Detailed examiner comments, checking hints, better/weaker candidate responses, and teaching pedagogies for SSC-I Physics 2025.',
      boardId: 'akueb',
      classLevel: 9,
      subject: 'Physics',
      badge: 'E-Marking Notes',
      url: '/resources/physics-ix-2025-emarking',
    },
    {
      id: 'guide-emarking-2024',
      type: 'RESOURCE',
      title: 'Physics IX · 2024 · Official E-Marking Notes & Examiner Commentary',
      description: 'Official 2024 E-Marking commentary, checking hints, authentic better/weaker candidate response scripts, and 2025 syllabus SLO mappings for Paper II.',
      boardId: 'akueb',
      classLevel: 9,
      subject: 'Physics',
      badge: 'E-Marking Notes',
      url: '/resources/physics-ix-2024-emarking',
    },
    {
      id: 'guide-key-2025',
      type: 'RESOURCE',
      title: 'Physics IX · 2025 · Official Paper I Answer Key',
      description: 'Official 2025 MCQ answer key with original exam-year SLOs and cognitive levels.',
      boardId: 'akueb',
      classLevel: 9,
      subject: 'Physics',
      badge: 'Answer Key',
      url: '/resources/physics-ix-2025-key',
    },
    {
      id: 'guide-key-2024',
      type: 'RESOURCE',
      title: 'Physics IX · 2024 · Official Paper I Answer Key',
      description: 'Official 2024 MCQ answer key with original exam-year SLOs, cognitive levels, and educator review notes.',
      boardId: 'akueb',
      classLevel: 9,
      subject: 'Physics',
      badge: 'Answer Key',
      url: '/resources/physics-ix-2024-key',
    },
    {
      id: 'guide-emarking-x-2025',
      type: 'RESOURCE',
      title: 'Physics X · 2025 · Official E-Marking Notes & Examiner Commentary',
      description: 'Official 2025 SSC-II E-Marking commentary, checking hints, authentic better/weaker candidate response scripts, and 2025 syllabus SLO mappings for Paper II.',
      boardId: 'akueb',
      classLevel: 10,
      subject: 'Physics',
      badge: 'E-Marking Notes',
      url: '/resources/physics-x-2025-emarking',
    },
    {
      id: 'guide-key-x-2025',
      type: 'RESOURCE',
      title: 'Physics X · 2025 · Official Paper I Answer Key',
      description: 'Official 2025 SSC-II MCQ answer key with original exam-year SLOs, cognitive levels, and 2025 syllabus mappings.',
      boardId: 'akueb',
      classLevel: 10,
      subject: 'Physics',
      badge: 'Answer Key',
      url: '/resources/physics-x-2025-key',
    },
    {
      id: 'guide-resource-ix',
      type: 'RESOURCE',
      title: 'Physics IX · 2025 · Teaching & Learning Resource Guide',
      description: 'Recommended PCTB textbook, O-Level reference book concordances, and PhET interactive simulations for Units 1–10.',
      boardId: 'akueb',
      classLevel: 9,
      subject: 'Physics',
      badge: 'Resource Guide',
      url: '/resources/physics-ix-resource-guide',
    },
    {
      id: 'guide-resource-x',
      type: 'RESOURCE',
      title: 'Physics X · 2025 · Teaching & Learning Resource Guide',
      description: 'Recommended PCTB textbook, O-Level reference book concordances, and PhET interactive simulations for Units 11–20.',
      boardId: 'akueb',
      classLevel: 10,
      subject: 'Physics',
      badge: 'Resource Guide',
      url: '/resources/physics-x-resource-guide',
    },
    {
      id: 'guide-pacing-ix',
      type: 'RESOURCE',
      title: 'Physics IX · 2025 · 28-Week Instructional Pacing Guide',
      description: 'Weekly lesson progression, periods per unit, SLO allocations, and laboratory activities for Grade IX Physics.',
      boardId: 'akueb',
      classLevel: 9,
      subject: 'Physics',
      badge: 'Pacing Guide',
      url: '/resources/physics-ix-pacing-guide',
    },
    {
      id: 'guide-pacing-x',
      type: 'RESOURCE',
      title: 'Physics X · 2025 · 28-Week Instructional Pacing Guide',
      description: 'Weekly lesson progression, periods per unit, SLO allocations, and laboratory activities for Grade X Physics.',
      boardId: 'akueb',
      classLevel: 10,
      subject: 'Physics',
      badge: 'Pacing Guide',
      url: '/resources/physics-x-pacing-guide',
    },
    {
      id: 'guide-practical-ix',
      type: 'RESOURCE',
      title: 'Physics IX · Model Paper III · Sample Practical Examination (2026 Onwards)',
      description: 'Three-stage laboratory practical examination: apparatus collection, time-temperature observation table, and graph plotting.',
      boardId: 'akueb',
      classLevel: 9,
      subject: 'Physics',
      badge: 'Practical Paper III',
      url: '/akueb/IX/physics/practicals',
    },
    {
      id: 'chapter-crqs-ix',
      type: 'RESOURCE',
      title: 'Physics IX · Chapter-Wise CRQs (Constructed / Short Response Questions)',
      description: '31 Chapter-by-Chapter Short Response Questions (Units 1–10) from 2024 & 2025 Annual Paper II, Model Paper II, and Curriculum Bank with Checking Hints, 2025 SLO Mappings, and E-Marking Candidate Scripts.',
      boardId: 'akueb',
      classLevel: 9,
      subject: 'Physics',
      badge: 'Chapter-Wise CRQs',
      url: '/akueb/IX/physics/crqs',
    },
    {
      id: 'chapter-erqs-ix',
      type: 'RESOURCE',
      title: 'Physics IX · Chapter-Wise ERQs (Extended / Descriptive Response Questions)',
      description: '23 Chapter-by-Chapter Extended Response Questions & Derivations (Units 1–10) with EITHER/OR synthesis, step-by-step derivations, Checking Hints rubrics, and Better/Weaker E-Marking scripts.',
      boardId: 'akueb',
      classLevel: 9,
      subject: 'Physics',
      badge: 'Chapter-Wise ERQs',
      url: '/akueb/IX/physics/erqs',
    },
    {
      id: 'chapter-numericals-ix',
      type: 'RESOURCE',
      title: 'Physics IX · Chapter-Wise Numericals & Worked Problems Hub',
      description: '51 Chapter-by-Chapter Solved Physics Numericals (Units 1–10) combining Paper II Theory Numericals, Paper I Numerical MCQs, and Curriculum Worked Problems with formula breakdowns and SI unit checks.',
      boardId: 'akueb',
      classLevel: 9,
      subject: 'Physics',
      badge: 'Chapter-Wise Numericals',
      url: '/akueb/IX/physics/numericals',
    },
    {
      id: 'chapter-notes-ix',
      type: 'RESOURCE',
      title: 'Physics IX · Chapter-Wise 2025 SLO Notes & Definitions',
      description: '151 Student Learning Outcomes (Units 1–10) with concise scientific definitions, formulas, and cognitive level tags.',
      boardId: 'akueb',
      classLevel: 9,
      subject: 'Physics',
      badge: 'Chapter SLO Notes',
      url: '/akueb/IX/physics/chapter-notes',
    },
    {
      id: 'chapter-crqs-x',
      type: 'RESOURCE',
      title: 'Physics X · Chapter-Wise CRQs (Constructed / Short Response Questions)',
      description: '16 Chapter-by-Chapter Short Response Questions (Units 11–20) from Model Paper II and Curriculum Bank with Checking Hints and 2025 SLO Mappings.',
      boardId: 'akueb',
      classLevel: 10,
      subject: 'Physics',
      badge: 'Chapter-Wise CRQs',
      url: '/akueb/X/physics/crqs',
    },
    {
      id: 'chapter-erqs-x',
      type: 'RESOURCE',
      title: 'Physics X · Chapter-Wise ERQs (Extended / Descriptive Response Questions)',
      description: '14 Chapter-by-Chapter Extended Response Questions & Derivations (Units 11–20) with step-by-step derivations and Checking Hints rubrics.',
      boardId: 'akueb',
      classLevel: 10,
      subject: 'Physics',
      badge: 'Chapter-Wise ERQs',
      url: '/akueb/X/physics/erqs',
    },
    {
      id: 'chapter-numericals-x',
      type: 'RESOURCE',
      title: 'Physics X · Chapter-Wise Numericals & Worked Problems Hub',
      description: '21 Chapter-by-Chapter Solved Physics Numericals (Units 11–20) combining Paper II Numericals, Paper I Numerical MCQs, and Curriculum Worked Problems.',
      boardId: 'akueb',
      classLevel: 10,
      subject: 'Physics',
      badge: 'Chapter-Wise Numericals',
      url: '/akueb/X/physics/numericals',
    },
    {
      id: 'chapter-notes-x',
      type: 'RESOURCE',
      title: 'Physics X · Chapter-Wise 2025 SLO Notes & Definitions',
      description: '186 Student Learning Outcomes (Units 11–20) with concise scientific definitions, formulas, and cognitive level tags.',
      boardId: 'akueb',
      classLevel: 10,
      subject: 'Physics',
      badge: 'Chapter SLO Notes',
      url: '/akueb/X/physics/chapter-notes',
    },
    {
      id: 'syllabus-physics-ix',
      type: 'RESOURCE',
      title: 'Physics IX · 2025 Syllabus, Units 1–10 & Student Learning Outcomes',
      description: 'Complete SSC-I Physics curriculum: unit-wise themes, subtopics, 2025 SLO codes, cognitive levels, and assessment scheme.',
      boardId: 'akueb',
      classLevel: 9,
      subject: 'Physics',
      badge: 'Syllabus',
      url: '/akueb/IX/physics/syllabus',
    },
    {
      id: 'syllabus-physics-x',
      type: 'RESOURCE',
      title: 'Physics X · 2025 Syllabus, Units 11–20 & Student Learning Outcomes',
      description: 'Complete SSC-II Physics curriculum: unit-wise themes, subtopics, 2025 SLO codes, cognitive levels, and assessment scheme.',
      boardId: 'akueb',
      classLevel: 10,
      subject: 'Physics',
      badge: 'Syllabus',
      url: '/akueb/X/physics/syllabus',
    },
    {
      id: 'syllabus-cs-ix',
      type: 'RESOURCE',
      title: 'Computer Science IX · 2025 Syllabus, Units 1–7 & Student Learning Outcomes',
      description: 'Complete SSC-I Computer Science curriculum: unit-wise themes, subtopics, 2025 SLO codes, cognitive levels, assessment scheme, and the official grade-9 syllabus PDF.',
      boardId: 'akueb',
      classLevel: 9,
      subject: 'Computer Science',
      badge: 'Syllabus',
      url: '/akueb/IX/computer-science/syllabus',
    },
    {
      id: 'syllabus-cs-x',
      type: 'RESOURCE',
      title: 'Computer Science X · 2025 Syllabus, Units 8–14 & Student Learning Outcomes',
      description: 'Complete SSC-II Computer Science curriculum: unit-wise themes, subtopics, 2025 SLO codes, cognitive levels, assessment scheme, and the official grade-10 syllabus PDF.',
      boardId: 'akueb',
      classLevel: 10,
      subject: 'Computer Science',
      badge: 'Syllabus',
      url: '/akueb/X/computer-science/syllabus',
    },
    {
      id: 'mcqs-chapter-wise-ix',
      type: 'RESOURCE',
      title: 'Physics IX · Chapter-Wise MCQs Quiz Hub (Units 1–10)',
      description: 'Practise multiple-choice quizzes unit by unit with instant answer checking, cognitive-level filters, and 2024 & 2025 past-paper coverage.',
      boardId: 'akueb',
      classLevel: 9,
      subject: 'Physics',
      badge: 'MCQ Quizzes',
      url: '/akueb/IX/physics/mcqs/chapter-wise',
    },
    {
      id: 'mcqs-past-papers-ix',
      type: 'RESOURCE',
      title: 'Physics IX · Past-Paper MCQ Quiz Archive (2024 & 2025)',
      description: 'Complete annual Paper I multiple-choice quizzes from the 2024 and 2025 AKUEB examinations with answer review.',
      boardId: 'akueb',
      classLevel: 9,
      subject: 'Physics',
      badge: 'MCQ Quizzes',
      url: '/akueb/IX/physics/mcqs/past-papers',
    },
    {
      id: 'mcqs-chapter-wise-x',
      type: 'RESOURCE',
      title: 'Physics X · Chapter-Wise MCQs Quiz Hub (Units 11–20)',
      description: 'Practise multiple-choice quizzes unit by unit with instant answer checking, cognitive-level filters, and 2024 & 2025 past-paper coverage.',
      boardId: 'akueb',
      classLevel: 10,
      subject: 'Physics',
      badge: 'MCQ Quizzes',
      url: '/akueb/X/physics/mcqs/chapter-wise',
    },
    {
      id: 'mcqs-past-papers-x',
      type: 'RESOURCE',
      title: 'Physics X · Past-Paper MCQ Quiz Archive (2024 & 2025)',
      description: 'Complete annual Paper I multiple-choice quizzes from the 2024 and 2025 AKUEB examinations with answer review.',
      boardId: 'akueb',
      classLevel: 10,
      subject: 'Physics',
      badge: 'MCQ Quizzes',
      url: '/akueb/X/physics/mcqs/past-papers',
    },
    {
      id: 'mcqs-chapter-wise-cs-ix',
      type: 'RESOURCE',
      title: 'Computer Science IX · Chapter-Wise MCQs Quiz Hub (Units 1–7)',
      description: 'Practise SSC-I Computer Science multiple-choice quizzes unit by unit with instant answer checking and 2024 & 2025 past-paper coverage.',
      boardId: 'akueb',
      classLevel: 9,
      subject: 'Computer Science',
      badge: 'MCQ Quizzes',
      url: '/akueb/IX/computer-science/mcqs/chapter-wise',
    },
    {
      id: 'mcqs-past-papers-cs-ix',
      type: 'RESOURCE',
      title: 'Computer Science IX · Past-Paper MCQ Quiz Archive (2025)',
      description: 'Annual Paper I multiple-choice quiz from the 2025 AKUEB Computer Science examination with answer review.',
      boardId: 'akueb',
      classLevel: 9,
      subject: 'Computer Science',
      badge: 'MCQ Quizzes',
      url: '/akueb/IX/computer-science/mcqs/past-papers',
    },
    {
      id: 'mcqs-chapter-wise-cs-x',
      type: 'RESOURCE',
      title: 'Computer Science X · Chapter-Wise MCQs Quiz Hub (Units 8–14)',
      description: 'Practise SSC-II Computer Science multiple-choice quizzes unit by unit with instant answer checking and 2025 past-paper coverage.',
      boardId: 'akueb',
      classLevel: 10,
      subject: 'Computer Science',
      badge: 'MCQ Quizzes',
      url: '/akueb/X/computer-science/mcqs/chapter-wise',
    },
    {
      id: 'mcqs-past-papers-cs-x',
      type: 'RESOURCE',
      title: 'Computer Science X · Past-Paper MCQ Quiz Archive (2025)',
      description: 'Annual Paper I multiple-choice quiz from the 2025 AKUEB Computer Science examination with answer review.',
      boardId: 'akueb',
      classLevel: 10,
      subject: 'Computer Science',
      badge: 'MCQ Quizzes',
      url: '/akueb/X/computer-science/mcqs/past-papers',
    },
  ];

  for (const g of guides) {
    if (filters.classLevel && g.classLevel !== filters.classLevel) continue;
    const gScore = smartScore(`${g.title} ${g.description} ${g.badge}`, q);
    if (gScore >= 0.68) {
      addResult({ ...g, score: gScore });
    }
  }

  const ranked = [...results.values()]
    .filter(item => !filters.type || filters.type === 'ALL' || item.type === filters.type)
    .sort((a, b) => (b.score || 0) - (a.score || 0));

  // Keep a spread of result kinds so every search category has something to show,
  // instead of one large bucket (e.g. solved questions) crowding out guides and quizzes.
  const bucketFor = (item: SearchResultItem): 'mcq' | 'syllabus' | 'paper' | 'guide' => {
    if (item.type === 'SLO') return 'syllabus';
    if (item.type === 'QUESTION') return 'paper';
    if (item.url?.includes('/mcqs') || item.url?.startsWith('/quizzes/')) return 'mcq';
    if (item.url?.startsWith('/past-papers/')) return 'paper';
    return 'guide';
  };
  const bucketCaps = { mcq: 44, syllabus: 24, paper: 24, guide: 16 } as const;
  const bucketCounts = { mcq: 0, syllabus: 0, paper: 0, guide: 0 };
  const diversified: SearchResultItem[] = [];
  for (const item of ranked) {
    const bucket = bucketFor(item);
    if (bucketCounts[bucket] >= bucketCaps[bucket]) continue;
    bucketCounts[bucket] += 1;
    diversified.push(item);
  }
  return diversified;
}
