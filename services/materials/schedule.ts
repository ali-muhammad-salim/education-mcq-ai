import { Prisma } from '@prisma/client';
import { createHash } from 'node:crypto';
import { pageExtraction } from '@/services/ingestion/trust';
/** Source revisions get separate durable jobs; quota deferrals retain checkpoints. */
export async function scheduleMaterialCompilation(tx: Prisma.TransactionClient, documentId: string) {
  const doc = await tx.knowledgeDocument.findUniqueOrThrow({ where: { id: documentId }, include: { artifacts: true, referencedBy: true, subject: { include: { academicClass: true } } } });
  if (process.env.GEMINI_IMAGE_MODEL) {
    for (const artifact of doc.artifacts) {
      if (artifact.status !== 'APPROVED') continue;
      const extraction = pageExtraction.safeParse((artifact.data as Record<string, unknown>).extraction);
      if (!extraction.success) continue;
      for (const [region, entry] of extraction.data.regions.entries()) {
        if (!['DIAGRAM', 'BONDING', 'FLOWCHART'].includes(entry.kind)) continue;
        const revision = createHash('sha256').update(artifact.id + ':' + artifact.contentHash + ':' + region + ':' + process.env.GEMINI_IMAGE_MODEL).digest('hex');
        await tx.durableJob.upsert({ where: { id: 'diagram-enhance-' + revision }, create: { id: 'diagram-enhance-' + revision, ownerId: doc.ownerId, kind: 'INGESTION', availableAt: new Date(Date.now() + 60000), payload: { task: 'ENHANCE_DIAGRAM', artifactId: artifact.id, region } }, update: {} });
      }
    }
  }
  const targets = ['past_paper', 'model_paper'].includes(doc.resourceType) ? [doc.id] : ['answer_key', 'e_marking'].includes(doc.resourceType) ? doc.referencedBy.map(r => r.documentId) : doc.resourceType === 'syllabus' ? (await tx.knowledgeDocument.findMany({ where: { resourceType: { in: ['past_paper', 'model_paper'] }, subject: { academicClass: { programmeId: doc.subject.academicClass.programmeId }, name: doc.subject.name } }, take: 201, select: { id: true } })).map(d => d.id) : [];
  if (targets.length > 200) throw new Error('Split curriculum recompilation into smaller batches.');
  for (const targetId of targets) {
    const target = await tx.knowledgeDocument.findUniqueOrThrow({ where: { id: targetId }, include: { artifacts: true, references: { include: { reference: { include: { artifacts: true } } } } } });
    if (!target.publishAfterReview || target.status !== 'NEEDS_REVIEW' || target.artifacts.length !== target.totalPages || target.artifacts.some(a => a.status !== 'APPROVED')) continue;
    const versions = await tx.syllabusVersion.findMany({ where: { subjectId: target.subjectId, isLatest: true }, select: { id: true } });
    const revision = createHash('sha256').update(JSON.stringify({ documentId: target.id, metadata: target.catalogMetadata, source: target.artifacts.map(a => a.contentHash).sort(), keys: target.references.flatMap(r => r.reference.artifacts.map(a => a.contentHash + ':' + a.status)).sort(), versions })).digest('hex');
    await tx.durableJob.upsert({ where: { id: 'material-compile-' + revision }, create: { id: 'material-compile-' + revision, ownerId: target.ownerId, kind: 'INGESTION', payload: { task: 'COMPILE_LEARNING', documentId: target.id } }, update: {} });
  }
}
