import { z } from "zod";

export const studyKinds = [
  "CHAPTER_NOTES",
  "NUMERICAL_GUIDE",
  "FORMULA_SHEET",
  "CHEAT_SHEET",
  "FLASHCARDS",
  "PRACTICE_SET",
  "CHAPTER_READER",
] as const;
export const studyLabels: Record<(typeof studyKinds)[number], string> = {
  CHAPTER_NOTES: "Chapter notes",
  NUMERICAL_GUIDE: "Worked numericals",
  FORMULA_SHEET: "Formula sheet",
  CHEAT_SHEET: "Revision cheat sheet",
  FLASHCARDS: "Flashcards",
  PRACTICE_SET: "Practice questions",
  CHAPTER_READER: "Chapter reader",
};
export const studyBlockSchema = z.object({
  type: z.enum([
    "PARAGRAPH",
    "LIST",
    "FORMULA",
    "WORKED_EXAMPLE",
    "FLASHCARD",
    "PRACTICE",
    "FIGURE",
  ]),
  heading: z.string().trim().max(500),
  text: z.string().trim().max(6000),
  steps: z.array(z.string().trim().min(1).max(1500)).max(20),
  sourceIds: z.array(z.string().min(1).max(80)).min(1).max(20),
  sloIds: z.array(z.string().min(1).max(80)).max(20),
  figureRegion: z.number().int().min(0).max(1000).optional(),
});
export const studyContentSchema = z.object({
  title: z.string().trim().min(3).max(240),
  scopeNote: z.string().trim().min(10).max(2000),
  blocks: z.array(studyBlockSchema).min(1).max(40),
});
export type StudyContent = z.infer<typeof studyContentSchema>;
export const studyPackSchema = z.object({
  documentId: z.string().min(1).max(80),
  topicIds: z.array(z.string().min(1).max(80)).min(1).max(50).optional(),
  kinds: z
    .array(z.enum(studyKinds))
    .min(1)
    .max(7)
    .default([...studyKinds]),
  newRevision: z.boolean().default(false),
});
export function studyContentHashInput(content: StudyContent) {
  return JSON.stringify(studyContentSchema.parse(content));
}
