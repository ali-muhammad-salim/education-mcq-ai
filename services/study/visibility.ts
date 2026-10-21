import { Prisma } from "@prisma/client";
export const publishedStudyWhere = Prisma.sql`
  n.status='PUBLISHED' AND n."reviewedAt" IS NOT NULL AND v."isLatest" AND d.status='NEEDS_REVIEW'
  AND (SELECT COUNT(*) FROM "StudyNote" peer WHERE peer."sourceDocumentId"=n."sourceDocumentId" AND peer."topicId"=n."topicId" AND peer.kind=n.kind AND peer.revision=n.revision AND peer.status='PUBLISHED')=n."partTotal"
  AND EXISTS (SELECT 1 FROM "StudyNoteSource" r WHERE r."noteId"=n.id)
  AND NOT EXISTS (SELECT 1 FROM "StudyNoteSource" r JOIN "KnowledgeArtifact" a ON a.id=r."artifactId" WHERE r."noteId"=n.id AND (a.status<>'APPROVED' OR a."contentHash"<>r."contentHash" OR a."documentId"<>d.id))`;
