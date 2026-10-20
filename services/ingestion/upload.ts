import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireUser, rateLimit } from '@/lib/security';
import { ApiError, apiError } from '@/lib/api';
import { uploadEducationalAsset } from '@/lib/storage';
import { enqueueJob } from '@/services/jobs/queue';
export const ingestionPayloadSchema = z.object({
  resourceType: z.enum(['syllabus', 'past_paper', 'model_paper', 'textbook', 'all_defaults']), storageKey: z.string().optional(), keyStorageKey: z.string().optional(),
  meta: z.object({ subject: z.string().max(160).default('Physics'), board: z.string().max(160).default('AKU-EB'), classLevel: z.string().max(80).default('Class IX'), paperCode: z.string().max(160).optional(), paperComponent: z.string().max(80).optional(), solutionStatus: z.string().max(80).optional(), examYear: z.string().max(20).optional(), fileUrl: z.string().max(2000).optional() }).default(() => ({ subject: 'Physics', board: 'AKU-EB', classLevel: 'Class IX' })),
}).refine(v => v.resourceType === 'all_defaults' || Boolean(v.storageKey), 'A source file is required.');
export async function handleUpload(req: NextRequest) {
  try {
    const user = await requireUser(req, ['ADMIN']); await rateLimit('upload:' + user.id, 20, 3600);
    const form = await req.formData(), file = form.get('file'), keyFile = form.get('keyFile');
    if (!(file instanceof File) || file.type !== 'application/pdf' || file.size > 50 * 1024 * 1024) throw new ApiError(400, 'INVALID_FILE', 'Choose a PDF smaller than 50 MB.');
    const resourceType = z.enum(['syllabus', 'past_paper', 'model_paper', 'textbook']).parse(form.get('resourceType') || form.get('type') || 'syllabus');
    const asset = await uploadEducationalAsset(Buffer.from(await file.arrayBuffer()), file.name, file.type);
    let keyStorageKey: string | undefined;
    if (keyFile instanceof File && keyFile.size) { if (keyFile.type !== 'application/pdf' || keyFile.size > 50 * 1024 * 1024) throw new ApiError(400, 'INVALID_KEY_FILE', 'Choose a PDF answer key smaller than 50 MB.'); keyStorageKey = (await uploadEducationalAsset(Buffer.from(await keyFile.arrayBuffer()), keyFile.name, keyFile.type)).storageKey; }
    const payload = ingestionPayloadSchema.parse({ resourceType, storageKey: asset.storageKey, keyStorageKey, meta: { subject: form.get('subject') || 'Physics', board: form.get('board') || 'AKU-EB', classLevel: form.get('classLevel') || 'Class ' + (form.get('grade') || 'IX'), paperComponent: form.get('paperComponent') || undefined, solutionStatus: form.get('solutionStatus') || undefined, examYear: form.get('examYear') || undefined, fileUrl: asset.url } });
    const job = await enqueueJob(user.id, 'INGESTION', payload);
    return NextResponse.json({ success: true, jobId: job.id, status: job.status, fileName: file.name, fileUrl: asset.url, url: asset.url, message: 'File stored. Processing is queued.' }, { status: 202 });
  } catch (error) { return apiError(error); }
}
