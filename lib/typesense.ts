/**
 * Typesense Search Service Adapter
 * 
 * Provides fast full-text search across educational resources, past papers,
 * questions, and SLOs with fallback to PostgreSQL Prisma search when Typesense
 * cluster is not actively reachable.
 */

import prisma from '@/lib/prisma';

export interface SearchResultItem {
  id: string;
  type: 'RESOURCE' | 'QUESTION' | 'SLO' | 'SUBJECT';
  title: string;
  description?: string;
  boardId?: string;
  classLevel?: number;
  subject?: string;
  url?: string;
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
  const q = query.trim().toLowerCase();
  if (!q) return [];

  // Try Typesense cluster first if configured
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
          return json.hits.map((h: any) => h.document);
        }
      }
    } catch (err) {
      console.warn('Typesense search fallback to PostgreSQL:', err);
    }
  }

  // Fallback to PostgreSQL Prisma search
  const results: SearchResultItem[] = [];

  // Search Quizzes
  const quizzes = await prisma.quiz.findMany({
    where: {
      status: 'PUBLISHED',
      visibility: 'PUBLIC',
      OR: [
        { title: { contains: q, mode: 'insensitive' } },
        { description: { contains: q, mode: 'insensitive' } }
      ]
    },
    take: 6
  });

  quizzes.forEach(item => {
    results.push({
      id: item.id,
      type: 'RESOURCE',
      title: item.title,
      description: item.description || 'AKU-EB Examination Resource',
      boardId: item.boardId || undefined,
      url: `/quizzes/${item.id}/take`
    });
  });

  // Search Past Papers
  const papers = await prisma.pastPaper.findMany({
    where: {
      OR: [
        { title: { contains: q, mode: 'insensitive' } },
        { paperCode: { contains: q, mode: 'insensitive' } }
      ]
    },
    include: {
      academicClass: true,
      subject: true
    },
    take: 6
  });

  papers.forEach(p => {
    const classLabel = p.academicClass?.name || (p.academicClass?.level ? `Class ${p.academicClass.level}` : '');
    const sessionLabel = p.examSession ? `${p.examSession} ` : '';
    const desc = [classLabel, sessionLabel, 'Examination Paper'].filter(Boolean).join(' ').trim();

    results.push({
      id: p.id,
      type: 'RESOURCE',
      title: p.title || p.paperCode || 'Examination Paper',
      description: desc || 'AKU-EB Examination Paper',
      boardId: p.boardId || undefined,
      classLevel: p.academicClass?.level,
      subject: p.subject?.name,
      url: `/past-papers/${p.id}`
    });
  });

  return results;
}
