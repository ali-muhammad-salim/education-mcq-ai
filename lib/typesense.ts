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

  // 4. Smart Typo + Synonym Search across all 337 Syllabus SLOs (Class IX & X)
  for (const [level, units, roman] of [
    [9, physicsIX as any[], 'IX'],
    [10, physicsX as any[], 'X'],
  ] as const) {
    if (filters.classLevel && filters.classLevel !== level) continue;
    for (const unit of units) {
      for (const sub of unit.subtopics || []) {
        for (const slo of sub.slos || []) {
          const score = smartScore(
            `Unit ${unit.unitNumber} ${unit.name} ${sub.name} ${slo.code} ${slo.description}`,
            q,
            slo.code
          );
          if (score >= 0.68) {
            addResult({
              id: `slo-${level}-${slo.code}`,
              type: 'SLO',
              title: `SLO ${slo.code} · Unit ${unit.unitNumber}: ${unit.name}`,
              description: slo.description,
              boardId: 'akueb',
              classLevel: level,
              subject: 'Physics',
              badge: `Class ${roman} · ${slo.cognitiveLevel}`,
              url: `/akueb/${roman}/physics/syllabus#slo-${encodeURIComponent(slo.code)}`,
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
  ];

  for (const g of guides) {
    if (filters.classLevel && g.classLevel !== filters.classLevel) continue;
    const gScore = smartScore(`${g.title} ${g.description} ${g.badge}`, q);
    if (gScore >= 0.68) {
      addResult({ ...g, score: gScore });
    }
  }

  return [...results.values()]
    .filter(item => !filters.type || filters.type === 'ALL' || item.type === filters.type)
    .sort((a, b) => (b.score || 0) - (a.score || 0))
    .slice(0, 24);
}
