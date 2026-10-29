import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireUser } from '@/lib/security';
import { apiError, ApiError } from '@/lib/api';
import { serializable } from '@/repositories/transaction';
const inputSchema = z.object({ versionId: z.string().min(1), topics: z.array(z.object({ name: z.string().trim().min(1).max(300), subtopics: z.array(z.object({ name: z.string().trim().min(1).max(300), slos: z.array(z.object({ code: z.string().min(1).max(100), description: z.string().min(1).max(10000) })).max(100) })).max(100) })).max(100) });
export async function POST(req: NextRequest) {
  try {
    await requireUser(req, ['ADMIN']); const input = inputSchema.parse(await req.json());
    await serializable(async tx => {
      if (!await tx.syllabusVersion.findUnique({ where: { id: input.versionId } })) throw new ApiError(404, 'NOT_FOUND', 'Syllabus version not found.');
      if (await tx.topic.count({ where: { syllabusVersionId: input.versionId } })) throw new ApiError(409, 'VERSION_EXISTS', 'Create a new syllabus version to replace an existing hierarchy.');
      for (let i = 0; i < input.topics.length; i++) {
        const topic = input.topics[i];
        await tx.topic.create({ data: { name: topic.name, topicNumber: String(i + 1), syllabusVersionId: input.versionId,
          subtopics: { create: topic.subtopics.map((s, j) => ({ name: s.name, subtopicNum: String(j + 1), slos: { create: s.slos } })) } } });
      }
    });
    return NextResponse.json({ success: true });
  } catch (error) { return apiError(error); }
}
