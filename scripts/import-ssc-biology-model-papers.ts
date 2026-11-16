import { createHash } from "node:crypto";
import { access, readFile } from "node:fs/promises";
import type { Prisma } from "@prisma/client";
import prisma from "@/lib/prisma";
import { resolveAcademicMetadata } from "@/services/assessment/catalog";
import written from "@/data/biology/ssc_model_written.json";
import mcqs from "@/data/biology/ssc_model_mcqs.json";

type WrittenRow = [number: string, page: number, marks: number, codes: string[], text: string, answer: string, crop?: number[]];
const root = "/materials/ssc/biology/";

async function main() {
  for (const { roman, grade, year, writtenPages } of [
    { roman: "IX", grade: 9, year: 2026, writtenPages: 12 },
    { roman: "X", grade: 10, year: 2027, writtenPages: 8 },
  ] as const) {
    const rows = written[roman] as WrittenRow[];
    const sourceQuestions = [
      ...mcqs[roman].map(q => ({
        number: q.number, pageNumber: q.page, marks: 1, codes: [q.code], questionText: q.stem,
        diagram: q.diagram, mcq: q, modelAnswer: undefined,
      })),
      ...rows.map(([number, pageNumber, marks, codes, questionText, modelAnswer, crop]) => ({
        number, pageNumber, marks, codes, questionText, diagram: Boolean(crop), mcq: undefined, modelAnswer,
      })),
    ];
    const papers = await Promise.all(["I", "II"].map(async (part, index) => {
      const id = `BIO-${roman}-MODEL-${year}-P${index + 1}`;
      const stem = `${root}biology-model-paper-${roman.toLowerCase()}-paper-${part.toLowerCase()}`;
      const fileUrl = stem + ".pdf";
      const hash = createHash("sha256").update(await readFile("public" + fileUrl)).digest("hex");
      return { id, part, stem, fileUrl, hash, pageCount: part === "I" ? 16 : writtenPages };
    }));
    await Promise.all(sourceQuestions.filter(q => q.diagram).map(q =>
      access("public" + papers[q.mcq ? 0 : 1].stem + "-q" + q.number + ".png")
    ));
    await prisma.$transaction(async tx => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${"ssc-biology-model:" + grade}))`;
      const academic = await resolveAcademicMetadata(tx, "AKU-EB", grade, "Biology");
      const version = await tx.syllabusVersion.findFirstOrThrow({
        where: { id: `akueb-ssc-biology-2025-${grade}`, subjectId: academic.subjectId, isLatest: true },
        include: { topics: { include: { subtopics: { include: { slos: true } } } } },
      });
      const outcomes = version.topics.flatMap(topic => topic.subtopics.flatMap(subtopic => subtopic.slos.map(slo => ({ topic, subtopic, slo }))));
      for (const paper of papers) {
        const data = {
          ...academic, paperCode: paper.id, title: `Biology Class ${roman} Model Paper ${paper.part}`,
          examYear: year, examSession: "Model Examination", examType: "MODEL_EXAM",
          sourceFile: paper.fileUrl, fileUrl: paper.fileUrl, sourceHash: paper.hash,
          pageCount: paper.pageCount,
          verificationStatus: "REVIEWED_WITH_SOURCE_NOTES",
        };
        await tx.pastPaper.upsert({ where: { id: paper.id }, create: { id: paper.id, ...data }, update: data });
        for (const { number, pageNumber, marks, codes, questionText, modelAnswer, diagram, mcq } of sourceQuestions.filter(q => Boolean(q.mcq) === (paper.part === "I"))) {
          const id = `${paper.id}-q${number}`;
          const linked = codes.map(code => {
            const matches = outcomes.filter(outcome => outcome.slo.code === code);
            if (matches.length !== 1) throw new Error(`Unresolved Biology SLO ${code} for ${id}`);
            return matches[0];
          });
          const { topic, subtopic, slo } = linked[0];
          const isAlternative = /[ab]$/.test(number);
          const diagramUrl = diagram ? paper.stem + "-q" + number + ".png" : undefined;
          const choices = mcq ? Object.fromEntries(mcq.choices.map((choice, index) => ["ABCD"[index], choice])) : undefined;
          const sourceRegion = {
            pageNumber, diagramUrl, current_slo: slo.code, current_syllabus_reviewed: true,
            in_syllabus: true, cognitive_level: slo.cognitiveLevel,
            mapping_scope: { board: "AKU-EB", grade, subject: "Biology" },
            current_mapping: linked.map(link => ({
              code: link.slo.code, topic: link.topic.name, unitNumber: Number(link.topic.topicNumber),
              description: link.slo.description, cognitiveLevel: link.slo.cognitiveLevel,
            })),
            ...(mcq ? {
              choices, explanation: mcq.explanation,
              option_feedback: mcq.feedback.map((reason, index) => ({ key: "ABCD"[index], reason })),
              ...(mcq.answer ? {
                solved_correct_option: mcq.answer,
                answer_status: ("answerStatus" in mcq ? mcq.answerStatus : undefined) ?? "PROJECT_SOLVED",
                answer_origin: "PROJECT_SOLVED",
                ...(("answerReviewNote" in mcq && mcq.answerReviewNote) ? { answer_review_note: mcq.answerReviewNote } : {}),
              } : {
                answer_status: "KEY_CONFLICT", answer_review_note: mcq.explanation,
              }),
            } : { model_answer: modelAnswer, model_answer_origin: "Project worked solution" }),
            choice_instruction: isAlternative ? `${number.endsWith("a") ? "EITHER" : "OR"} · Attempt one alternative for Question ${parseInt(number, 10)}` : undefined,
          };
          const row = {
            pastPaperId: paper.id, questionNumber: number, questionText,
            normalizedQuestionText: questionText.replace(/\s+/g, " ").trim(),
            marks, pageNumber, sourceRegion: JSON.parse(JSON.stringify(sourceRegion)) as Prisma.InputJsonValue,
            questionType: mcq ? "MULTIPLE_CHOICE" : isAlternative ? "EXTENDED_RESPONSE" : "CONSTRUCTED_RESPONSE",
            topicId: topic.id, subtopicId: subtopic.id, sloId: slo.id, syllabusVersionId: version.id,
            difficulty: slo.cognitiveLevel, diagramBased: diagram, verified: !mcq || Boolean(mcq.answer),
          };
          await tx.pastPaperQuestion.upsert({ where: { id }, create: { id, ...row }, update: row });
          const topicIds = linked.map(link => link.topic.id);
          const subtopicIds = linked.map(link => link.subtopic.id);
          const sloIds = linked.map(link => link.slo.id);
          await tx.pastPaperQuestionTopic.deleteMany({ where: { pastPaperQuestionId: id, topicId: { notIn: topicIds } } });
          await tx.pastPaperQuestionSubtopic.deleteMany({ where: { pastPaperQuestionId: id, subtopicId: { notIn: subtopicIds } } });
          await tx.pastPaperQuestionSLO.deleteMany({ where: { pastPaperQuestionId: id, sloId: { notIn: sloIds } } });
          await tx.pastPaperQuestionTopic.createMany({ data: topicIds.map(topicId => ({ pastPaperQuestionId: id, topicId })), skipDuplicates: true });
          await tx.pastPaperQuestionSubtopic.createMany({ data: subtopicIds.map(subtopicId => ({ pastPaperQuestionId: id, subtopicId })), skipDuplicates: true });
          await tx.pastPaperQuestionSLO.createMany({ data: sloIds.map(sloId => ({ pastPaperQuestionId: id, sloId })), skipDuplicates: true });
        }
      }
    }, { timeout: 30000 });
    console.log(`Class ${roman}: two papers, ${mcqs[roman].length} MCQs (${mcqs[roman].filter(q => q.answer).length} scored) and ${rows.length} written items imported.`);
  }
}

main().catch(error => {
  console.error(error.message);
  process.exitCode = 1;
}).finally(() => prisma.$disconnect());
