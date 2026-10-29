import { z } from "zod";
export const studySliceSchema = z
  .object({
    artifactId: z.string(),
    contentHash: z.string().length(64),
    start: z.number().int().min(0),
    end: z.number().int().positive(),
    pageNumber: z.number().int().positive(),
  })
  .refine((s) => s.end > s.start);
export const studyPlanSchema = z.object({
  inputSlices: z.array(studySliceSchema).min(1).max(100),
});
type Page = {
  id: string;
  content: string;
  contentHash: string;
  pageNumber: number;
};
/** Lossless slices with line-boundary preference. Every source character belongs to one part. */
export function planStudyParts(pages: Page[], maxCharacters = 10000) {
  if (!Number.isInteger(maxCharacters) || maxCharacters < 1000)
    throw Error("Study context limit is too small.");
  const parts: z.infer<typeof studyPlanSchema>[] = [],
    current: z.infer<typeof studySliceSchema>[] = [];
  let used = 0;
  for (const page of pages) {
    let start = 0;
    while (start < page.content.length) {
      if (used >= maxCharacters || current.length >= 100) {
        parts.push({ inputSlices: current.splice(0) });
        used = 0;
      }
      const room = maxCharacters - used;
      let end = Math.min(page.content.length, start + room);
      if (end < page.content.length) {
        const boundary = page.content.lastIndexOf("\n", end - 1);
        if (boundary > start + room / 2) end = boundary + 1;
      }
      if (
        end < page.content.length &&
        end > start &&
        /[\uD800-\uDBFF]/.test(page.content[end - 1])
      )
        end--;
      if (end === start && used > 0) {
        parts.push({ inputSlices: current.splice(0) });
        used = 0;
        continue;
      }
      if (end <= start) throw Error("Source partition made no progress.");
      current.push({
        artifactId: page.id,
        contentHash: page.contentHash,
        pageNumber: page.pageNumber,
        start,
        end,
      });
      used += end - start;
      start = end;
    }
  }
  if (current.length) parts.push({ inputSlices: current });
  return parts;
}
