import { Prisma } from '@prisma/client';
import { z } from 'zod';
import prisma from '@/lib/prisma';
import { aiRequest, canonicalModel } from '@/services/ai/provider';
import { ApiError } from '@/lib/api';
import { expandQueryWithSynonyms, smartScore } from '@/lib/smartSearch';

const vectorSchema = z.array(z.number().finite()).length(768).refine(v => v.some(x => x !== 0));
export async function embedKnowledge(text: string, task: 'RETRIEVAL_DOCUMENT' | 'RETRIEVAL_QUERY', signal?: AbortSignal) {
  const model = canonicalModel(process.env.GEMINI_EMBEDDING_MODEL);
  if (!model) throw new ApiError(503, 'EMBEDDING_NOT_CONFIGURED', 'Configure an embedding model before semantic indexing.');
  if (text.length > 12000) throw new ApiError(422, 'EMBEDDING_CHUNK_TOO_LONG', 'Split source content into smaller reviewed passages before embedding.');
  const result = z.object({ embedding: z.object({ values: vectorSchema }) }).parse(await aiRequest(model, 'embedContent', { model: 'models/' + model.replace(/^models\//, ''), content: { parts: [{ text }] }, taskType: task, outputDimensionality: 768 }, Math.ceil(text.length / 2), signal));
  const norm = Math.hypot(...result.embedding.values);
  return { model, vector: result.embedding.values.map(v => v / norm) };
}
export async function indexApprovedArtifact(id: string, signal?: AbortSignal) {
  const artifact = await prisma.knowledgeArtifact.findUniqueOrThrow({ where: { id } });
  if (artifact.status !== 'APPROVED') return { indexed: false, reason: 'Source is not approved.' };
  if (!artifact.content.trim()) return { indexed: false, reason: 'Source has no searchable text.' };
  if (artifact.content.length > 12000) return { indexed: false, reason: 'Full text remains searchable; this page needs smaller chunks for semantic indexing.' };
  const embedding = await embedKnowledge(artifact.content, 'RETRIEVAL_DOCUMENT', signal);
  const count = await prisma.$executeRaw`UPDATE "KnowledgeArtifact" SET embedding = ${JSON.stringify(embedding.vector)}::vector, "embeddingModel" = ${embedding.model}, "embeddingContentHash" = ${artifact.contentHash} WHERE id = ${id} AND status = 'APPROVED' AND "contentHash" = ${artifact.contentHash}`;
  return { indexed: count === 1 };
}

/**
 * Embeds and indexes SLO descriptions in PostgreSQL (`SLO.embedding`) so that
 * curriculum outcomes can be searched semantically via pgvector.
 */
export async function indexSyllabusSLOs(syllabusVersionId?: string, limit = 50, signal?: AbortSignal) {
  if (!canonicalModel(process.env.GEMINI_EMBEDDING_MODEL)) {
    return { indexed: 0, reason: 'GEMINI_EMBEDDING_MODEL is not configured.' };
  }
  const rows = await prisma.$queryRaw<{ id: string; code: string | null; description: string; topicName: string; subtopicName: string }[]>(
    syllabusVersionId
      ? Prisma.sql`SELECT s.id, s.code, s.description, t.name AS "topicName", sub.name AS "subtopicName" FROM "SLO" s JOIN "Subtopic" sub ON sub.id = s."subtopicId" JOIN "Topic" t ON t.id = sub."topicId" WHERE t."syllabusVersionId" = ${syllabusVersionId} AND s.embedding IS NULL ORDER BY s.code ASC LIMIT ${limit}`
      : Prisma.sql`SELECT s.id, s.code, s.description, t.name AS "topicName", sub.name AS "subtopicName" FROM "SLO" s JOIN "Subtopic" sub ON sub.id = s."subtopicId" JOIN "Topic" t ON t.id = sub."topicId" JOIN "SyllabusVersion" v ON v.id = t."syllabusVersionId" WHERE v."isLatest" = true AND s.embedding IS NULL ORDER BY s.code ASC LIMIT ${limit}`
  );
  let indexed = 0;
  for (const row of rows) {
    signal?.throwIfAborted();
    const docText = `${row.code ? `SLO ${row.code}: ` : ''}${row.topicName} — ${row.subtopicName}: ${row.description}`;
    const emb = await embedKnowledge(docText, 'RETRIEVAL_DOCUMENT', signal);
    await prisma.$executeRaw`UPDATE "SLO" SET embedding = ${JSON.stringify(emb.vector)}::vector WHERE id = ${row.id}`;
    indexed++;
  }
  return { indexed };
}

export const knowledgeQuerySchema = z.object({ query: z.string().trim().min(3).max(2000), board: z.string().min(1).max(100), classLevel: z.coerce.number().int().min(1).max(12), subject: z.string().min(1).max(160), syllabusVersionId: z.string().max(80).optional() });
export type KnowledgeQuery = z.infer<typeof knowledgeQuerySchema>;
export type SourcePassage = { id: string; content: string; contentHash: string; pageNumber: number; documentId: string; sourceSha256: string; resourceType: string; syllabusVersionId: string; rank: number };
export async function searchApprovedKnowledge(input: KnowledgeQuery, signal?: AbortSignal): Promise<SourcePassage[]> {
  const board = input.board.toLowerCase().replace(/[^a-z0-9]/g, '');
  const rawTerms = [...new Set(input.query.toLowerCase().match(/\p{L}[\p{L}\p{N}]+/gu) || [])].slice(0, 20);
  const synonymTerms = expandQueryWithSynonyms(input.query).filter(t => !t.includes(' ') && /^\p{L}[\p{L}\p{N}]+$/u.test(t));
  const terms = [...new Set([...rawTerms, ...synonymTerms])].slice(0, 32);
  const lexicalQuery = terms.map(term => '"' + term + '"').join(' OR ');
  const version = input.syllabusVersionId ? Prisma.sql`v.id = ${input.syllabusVersionId}` : Prisma.sql`v."isLatest" = true`;
  const scope = Prisma.sql`a.status = 'APPROVED' AND (d."resourceType"='syllabus' OR COALESCE(jsonb_array_length(d."catalogMetadata"->'scopeSubjectIds'),0)<=1) AND d.status = 'NEEDS_REVIEW' AND lower(s.name) = lower(${input.subject}) AND c.level = ${input.classLevel} AND regexp_replace(lower(b."shortCode"), '[^a-z0-9]', '', 'g') = ${board} AND ${version} AND (v."sourceDocumentId" IS DISTINCT FROM d.id OR EXISTS (SELECT 1 FROM jsonb_array_elements(COALESCE(a.data->'extraction'->'learning'->'outcomes','[]'::jsonb)) outcome WHERE outcome->>'grade'=c.level::text)) AND (v."sourceDocumentId" IS NULL OR EXISTS (SELECT 1 FROM "KnowledgeDocument" curriculum JOIN "User" owner ON owner.id=curriculum."ownerId" WHERE curriculum.id=v."sourceDocumentId" AND curriculum."publishAfterReview" AND curriculum.status='NEEDS_REVIEW' AND owner.role='ADMIN' AND curriculum."totalPages">0 AND (SELECT count(*) FROM "KnowledgeArtifact" page WHERE page."documentId"=curriculum.id)=curriculum."totalPages" AND NOT EXISTS (SELECT 1 FROM "KnowledgeArtifact" page WHERE page."documentId"=curriculum.id AND page.status<>'APPROVED')))`;
  const joins = Prisma.sql`FROM "KnowledgeArtifact" a JOIN "KnowledgeDocument" d ON d.id = a."documentId" JOIN "SyllabusVersion" v ON (v.id = d."syllabusVersionId" AND v."subjectId" = d."subjectId") OR (v."sourceDocumentId" = d.id AND d."resourceType" = 'syllabus') JOIN "Subject" s ON s.id = v."subjectId" JOIN "Class" c ON c.id = s."classId" JOIN "Programme" p ON p.id = c."programmeId" JOIN "Board" b ON b.id = p."boardId"`;
  const fields = Prisma.sql`a.id, a.content, a."contentHash", a."pageNumber", d.id AS "documentId", d.sha256 AS "sourceSha256", d."resourceType", v.id AS "syllabusVersionId"`;
  const keyword = terms.length
    ? await prisma.$queryRaw<SourcePassage[]>(Prisma.sql`SELECT ${fields}, ts_rank_cd(to_tsvector('english', a.content), websearch_to_tsquery('english', ${lexicalQuery}))::float8 AS rank ${joins} WHERE ${scope} AND to_tsvector('english', a.content) @@ websearch_to_tsquery('english', ${lexicalQuery}) ORDER BY rank DESC, a.id LIMIT 24`)
    : [];
  let semantic: SourcePassage[] = [];
  if (process.env.GEMINI_EMBEDDING_MODEL) {
    try {
      const available = await prisma.$queryRaw<{ available: boolean }[]>(Prisma.sql`SELECT EXISTS(SELECT 1 ${joins} WHERE ${scope} AND a.embedding IS NOT NULL AND a."embeddingModel" = ${canonicalModel(process.env.GEMINI_EMBEDDING_MODEL)} AND a."embeddingContentHash" = a."contentHash") AS available`);
      if (!available[0]?.available) return keyword.slice(0, 8);
      const query = await embedKnowledge(input.query, 'RETRIEVAL_QUERY', signal);
      semantic = await prisma.$transaction(async tx => {
        await tx.$executeRaw`SET LOCAL hnsw.iterative_scan = 'strict_order'`;
        return tx.$queryRaw<SourcePassage[]>(Prisma.sql`SELECT ${fields}, (1 - (a.embedding <=> ${JSON.stringify(query.vector)}::vector))::float8 AS rank ${joins} WHERE ${scope} AND a."embeddingModel" = ${query.model} AND a."embeddingContentHash" = a."contentHash" AND a.embedding IS NOT NULL AND (1 - (a.embedding <=> ${JSON.stringify(query.vector)}::vector)) >= 0.75 ORDER BY a.embedding <=> ${JSON.stringify(query.vector)}::vector, a.id LIMIT 24`);
      });
    } catch { signal?.throwIfAborted(); /* Approved lexical evidence remains available during provider outages. */ }
  }
  const merged = new Map<string, SourcePassage>();
  for (const ranking of [keyword, semantic]) ranking.forEach((item, i) => { const old = merged.get(item.id); merged.set(item.id, { ...item, rank: (old?.rank || 0) + 1 / (60 + i + 1) }); });
  if (merged.size === 0) {
    // Typo-tolerant fallback across approved artifacts in this scope when exact SQL tokens miss a misspelling
    const candidates = await prisma.$queryRaw<SourcePassage[]>(Prisma.sql`SELECT ${fields}, 0.0::float8 AS rank ${joins} WHERE ${scope} ORDER BY a.id ASC LIMIT 120`);
    for (const c of candidates) {
      const s = smartScore(c.content, input.query);
      if (s >= 0.7) merged.set(c.id, { ...c, rank: s });
    }
  }
  return [...merged.values()].sort((a, b) => b.rank - a.rank || a.id.localeCompare(b.id)).slice(0, 8);
}
