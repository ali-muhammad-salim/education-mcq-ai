import { access, readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import type { Prisma } from "@prisma/client";
import prisma from "@/lib/prisma";
import { resolveAcademicMetadata } from "@/services/assessment/catalog";
import { biology2022PdfRoot, biology2024PdfRoot, biologyX2017PdfRoot, biologyX2018PdfRoot, biologyX2019PdfRoot, biologyX2021PdfRoot, biologyX2022PdfRoot, biologyX2023PdfRoot, biologyX2024PdfRoot, biologyX2025PdfRoot } from "@/lib/biology2024Resources";
import mcqs2024 from "@/data/biology/ssc1_2024_past_mcqs.json";
import mcqs2022 from "@/data/biology/ssc1_2022_past_mcqs.json";
import written from "@/data/biology/ssc1_2024_written.json";
import mcqsX2025 from "@/data/biology/ssc2_2025_past_mcqs.json";
import writtenX2025 from "@/data/biology/ssc2_2025_written.json";
import mcqsX2023 from "@/data/biology/ssc2_2023_past_mcqs.json";
import writtenX2023 from "@/data/biology/ssc2_2023_written.json";
import mcqsX2022 from "@/data/biology/ssc2_2022_past_mcqs.json";
import mcqsX2024 from "@/data/biology/ssc2_2024_past_mcqs.json";
import writtenX2024 from "@/data/biology/ssc2_2024_written.json";
import mcqsX2019 from "@/data/biology/ssc2_2019_past_mcqs.json";
import writtenX2019 from "@/data/biology/ssc2_2019_written.json";
import mcqsX2018 from "@/data/biology/ssc2_2018_past_mcqs.json";
import writtenX2018 from "@/data/biology/ssc2_2018_written.json";
import mcqsX2017 from "@/data/biology/ssc2_2017_past_mcqs.json";
import writtenX2017 from "@/data/biology/ssc2_2017_written.json";
import mcqsX2021 from "@/data/biology/ssc2_2021_past_mcqs.json";

type WrittenRow = [string, number, number, string, string, number, string, string, string];
const byYear = {
  "2017-x": { year: 2017, root: biologyX2017PdfRoot, grade: 10, roman: "X", mcqs: mcqsX2017, written: writtenX2017 as WrittenRow[], figures: ["1", "3", "5", "8a"], pages: 8 },
  "2018-x": { year: 2018, root: biologyX2018PdfRoot, grade: 10, roman: "X", mcqs: mcqsX2018, written: writtenX2018 as WrittenRow[], figures: ["1", "2", "4"], pages: 12 },
  "2019-x": { year: 2019, root: biologyX2019PdfRoot, grade: 10, roman: "X", mcqs: mcqsX2019, written: writtenX2019 as WrittenRow[], figures: ["1", "2", "3", "5", "7a"], pages: 12 },
  "2021-x": { year: 2021, root: biologyX2021PdfRoot, grade: 10, roman: "X", mcqs: mcqsX2021, written: [], figures: [], pages: 20 },
  "2022": { year: 2022, root: biology2022PdfRoot, grade: 9, roman: "IX", mcqs: mcqs2022, written: [], figures: [], pages: 20 },
  "2022-x": { year: 2022, root: biologyX2022PdfRoot, grade: 10, roman: "X", mcqs: mcqsX2022, written: [], figures: [], pages: 20 },
  "2023": { year: 2023, root: biologyX2023PdfRoot, grade: 10, roman: "X", mcqs: mcqsX2023, written: writtenX2023 as WrittenRow[], figures: ["1", "3", "5b"], pages: 16 },
  "2024": { year: 2024, root: biology2024PdfRoot, grade: 9, roman: "IX", mcqs: mcqs2024, written: written as WrittenRow[], figures: ["4", "6b", "7b"], pages: 16 },
  "2024-x": { year: 2024, root: biologyX2024PdfRoot, grade: 10, roman: "X", mcqs: mcqsX2024, written: writtenX2024 as WrittenRow[], figures: ["3"], pages: 16 },
  "2025": { year: 2025, root: biologyX2025PdfRoot, grade: 10, roman: "X", mcqs: mcqsX2025, written: writtenX2025 as WrittenRow[], figures: ["3"], pages: 12 },
};

async function main() {
  const yearArg = process.argv[2] ?? "2024";
  if (!Object.hasOwn(byYear, yearArg)) throw new Error("Choose 2017-x, 2018-x, 2019-x, 2021-x, 2022, 2022-x, 2023, 2024, 2024-x, or 2025.");
  const { year, root, grade: paperGrade, roman, mcqs, written: writtenRows, figures, pages } = byYear[yearArg as keyof typeof byYear];
  const keyUrl = root + "keys.pdf";
  const markingUrl = root + "emarking.pdf";
  const references = [["answer_key", keyUrl, "Paper 1 keys"]];
  const parts: ("i" | "ii")[] = ["i"];
  if (writtenRows.length) {
    references.push(["e_marking", markingUrl, "Paper 2 E-marking"]);
    parts.push("ii");
  }
  const choices = (values: string[]) => Object.fromEntries(values.map((value, i) => ["ABCD"[i], value]));
  const papers = await Promise.all(parts.map(async (part, i) => {
    const id = `BIO-${roman}-${year}-P${i + 1}`;
    const fileUrl = root + "paper-" + part + ".pdf";
    const sourceHash = createHash("sha256").update(await readFile("public" + fileUrl)).digest("hex");
    return { id, part, fileUrl, sourceHash, pageCount: part === "i" ? pages : (year === 2017 || year === 2018 || year === 2019 ? 12 : 8) };
  }));
  await Promise.all([
    ...references.map(([, url]) => url),
    ...mcqs.flatMap(row => row.diagramUrl ? [row.diagramUrl] : []),
    ...writtenRows.flatMap(([number]) => [
      ...["stronger", "weaker"].map(kind => root + `emarking-q${number}-${kind}.png`),
      ...(figures.includes(number) ? [root + `paper-ii-q${number}.png`] : []),
    ]),
  ].map(url => access("public" + url)));

  await prisma.$transaction(async tx => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${"ssc-biology-" + roman + "-" + year}))`;
    const academic = await resolveAcademicMetadata(tx, "AKU-EB", paperGrade, "Biology");
    const versions = await tx.syllabusVersion.findMany({
      where: { id: { in: ["akueb-ssc-biology-2025-9", "akueb-ssc-biology-2025-10"] }, isLatest: true },
      include: { topics: { include: { subtopics: { include: { slos: true } } } } },
    });
    if (versions.length !== 2) throw new Error("Run the current Biology syllabus import for both grades first.");
    const outcomes = versions.flatMap(version => version.topics.flatMap(topic =>
      topic.subtopics.flatMap(subtopic => subtopic.slos.map(slo => ({ version, topic, subtopic, slo })))));

    for (const [kind, url, title] of references) {
      const id = `bio-${roman.toLowerCase()}-${year}-${kind}`;
      const sourceHash = createHash("sha256").update(await readFile("public" + url)).digest("hex");
      const data = {
        title: `Biology Class ${roman} ${year} ${title}`, sourceFile: url, sourceHash, subject: "Biology",
        publisher: "AKU-EB", boardAssociation: "AKU-EB", className: `Class ${roman}`, publicationYear: year,
        language: "English", metadata: { resourceType: kind },
      };
      await tx.book.upsert({ where: { id }, create: { id, ...data }, update: data });
    }
    for (const { id, part, fileUrl, pageCount, sourceHash } of papers) {
      const data = {
        ...academic, paperCode: id, examYear: year, examType: "ANNUAL", examSession: "Annual Examination",
        title: `Biology Class ${roman} ${year} Paper ${part.toUpperCase()}`, fileUrl, pageCount, sourceFile: fileUrl,
        sourceHash, verificationStatus: "REVIEWED_WITH_SOURCE_NOTES",
      };
      await tx.pastPaper.upsert({ where: { id }, create: { id, ...data }, update: data });
      const rows = part === "i" ? mcqs.map(q => ({
        number: q.number, page: q.page, marks: 1, code: q.code, text: q.stem, diagram: q.diagramUrl,
        cognitiveLevel: q.originalLevel === "K" ? "R" : q.originalLevel,
        verified: Boolean(q.answer), questionType: "MULTIPLE_CHOICE",
        meta: {
          assessmentSection: (year === 2022 || year === 2021) ? (Number(q.number) <= 40 ? "Theory" : "Alternate to Practical") : undefined,
          choices: choices(q.choices), official_answer: q.officialAnswer, solved_correct_option: q.answer,
          answer_status: (roman === "X" && year === 2024 && (q.number === "18" || q.number === "27"))
            ? "ANSWER_CORRECTED"
            : (("answerStatus" in q ? q.answerStatus : undefined) ?? (q.answer ? "OFFICIAL_CONFIRMED" : "KEY_CONFLICT")),
          answer_origin: (roman === "X" && year === 2024 && q.number === "18")
            ? "BIOLOGICAL_EVALUATION"
            : (roman === "X" && year === 2024 && q.number === "27")
              ? "MENDELIAN_CROSS_VERIFIED"
              : (("answerOrigin" in q ? q.answerOrigin : undefined) ?? (q.answer ? "OFFICIAL_KEY_VERIFIED" : undefined)),
          answer_review_note: (roman === "X" && year === 2024 && q.number === "18")
            ? "Official key published a bullet point giving universal credit; biological cell division sequence is meiosis followed by mitosis (Choice C)."
            : (roman === "X" && year === 2024 && q.number === "27")
              ? "Official key published A, which erroneously gives 0% heterozygous / 100% homozygous. Cross of homozygous black cow (BB) with heterozygous black bull (Bb) produces 50% Bb (heterozygous) and 50% BB (homozygous), exactly matching Choice C."
              : (("answerReviewNote" in q ? q.answerReviewNote : undefined) ?? (q.answer ? undefined : q.explanation)),
          explanation: q.explanation,
          option_feedback: q.feedback.map((reason, i) => ({ key: "ABCD"[i], reason })),
          slo: q.originalSlo, original_cognitive_level: q.originalLevel,
          original_reference_source: keyUrl, original_reference_verified: true,
          mapping_reason: roman === "X" && ((year === 2023 && q.number === "23") || (year === 2022 && q.number === "24"))
            ? "Plant tropisms apply the broader stimulus-and-response outcome. The current syllabus has no separately named tropism outcome." : undefined,
        },
      })) : writtenRows.map(([number, page, marks, code, originalSlo, notesPage, text, answer, notes]) => ({
        number, page, marks, code, text,
        diagram: figures.includes(number) ? root + `paper-ii-q${number}.png` : null,
        verified: true, questionType: marks >= 7 ? "EXTENDED_RESPONSE" : "CONSTRUCTED_RESPONSE",
        cognitiveLevel: year === 2023 ? (number === "4" ? "A" : "U") : year === 2025 ? ({ "1": "R", "4": "A" } as Record<string, string>)[number] ?? "U" : (roman === "X" && (year === 2024 || year === 2019 || year === 2018)) ? (number === "4" ? "A" : "U") : number === "2" ? "A" : "U",
        meta: {
          model_answer: answer, model_answer_origin: "Project worked solution",
          original_cognitive_level: year === 2023 ? ({ "1": "U*", "4": "A" } as Record<string, string>)[number] ?? "U" : year === 2025 ? ({ "1": "K*", "2a": "U*", "4": "A*" } as Record<string, string>)[number] ?? "U" : (roman === "X" && (year === 2024 || year === 2019 || year === 2018)) ? ({ "1": "U*", "4": "A" } as Record<string, string>)[number] ?? "U" : number === "1" ? "U*" : number === "2" ? "A" : "U",
          official_marking_notes: notes, slo: originalSlo,
          original_reference_source: markingUrl + "#page=" + notesPage, original_reference_verified: true,
          better_response_image: root + `emarking-q${number}-stronger.png`,
          weaker_response_image: root + `emarking-q${number}-weaker.png`,
          choice_instruction: marks >= 7 ? `${number.endsWith("a") ? "EITHER" : "OR"} · Attempt one alternative for Question ${parseInt(number, 10)}` : undefined,
        },
      }));

      for (const row of rows) {
        // The printed syllabus uses 16.2.4 twice. For this calculation use the base-pairing outcome.
        const isAlleleDiff = roman === "X" && year === 2019 && row.number === "15";
        const basePairing = roman === "X" && year === 2022 && row.number === "49";
        const matches = outcomes.filter(item => item.slo.code === row.code && (
          isAlleleDiff ? item.slo.cognitiveLevel === "U" : (!basePairing || item.slo.cognitiveLevel === "E")
        ));
        if (matches.length !== 1) throw new Error(`Missing or ambiguous SLO ${row.code}`);
        const { version, topic, subtopic, slo } = matches[0];
        const grade = version.id.endsWith("-10") ? 10 : 9;
        const questionId = id + "-q" + row.number;
        const sourceRegion = JSON.parse(JSON.stringify({
          ...row.meta, pageNumber: row.page, diagramUrl: row.diagram || undefined,
          current_slo: row.code, current_syllabus_reviewed: true, in_syllabus: true,
          current_mapping: [{ code: row.code, topic: topic.name, unitNumber: Number(topic.topicNumber), description: slo.description, cognitiveLevel: slo.cognitiveLevel, grade }],
          mapping_scope: { board: "AKU-EB", grade, subject: "Biology" },
          cognitive_level: row.cognitiveLevel,
        })) as Prisma.InputJsonValue;
        const saved = {
          pastPaperId: id, questionNumber: row.number, questionText: row.text,
          normalizedQuestionText: row.text.replace(/\s+/g, " ").trim(),
          questionType: row.questionType, marks: row.marks, pageNumber: row.page,
          syllabusVersionId: version.id, topicId: topic.id, subtopicId: subtopic.id, sloId: slo.id,
          difficulty: row.cognitiveLevel, diagramBased: Boolean(row.diagram), verified: row.verified,
          sourceRegion,
        };
        await tx.pastPaperQuestion.upsert({ where: { id: questionId }, create: { id: questionId, ...saved }, update: saved });
        await tx.pastPaperQuestionTopic.deleteMany({ where: { pastPaperQuestionId: questionId, topicId: { not: topic.id } } });
        await tx.pastPaperQuestionSubtopic.deleteMany({ where: { pastPaperQuestionId: questionId, subtopicId: { not: subtopic.id } } });
        await tx.pastPaperQuestionSLO.deleteMany({ where: { pastPaperQuestionId: questionId, sloId: { not: slo.id } } });
        await tx.pastPaperQuestionTopic.createMany({ data: [{ pastPaperQuestionId: questionId, topicId: topic.id }], skipDuplicates: true });
        await tx.pastPaperQuestionSubtopic.createMany({ data: [{ pastPaperQuestionId: questionId, subtopicId: subtopic.id }], skipDuplicates: true });
        await tx.pastPaperQuestionSLO.createMany({ data: [{ pastPaperQuestionId: questionId, sloId: slo.id }], skipDuplicates: true });
      }
    }
  }, { timeout: 30000 });
  console.log(`Biology ${roman} ${year}: ${mcqs.length} MCQs (${mcqs.filter(q => q.answer).length} scored), ${writtenRows.length} written items and ${references.length} reference files.`);
}

main().catch(error => {
  console.error(error.message);
  process.exitCode = 1;
}).finally(() => prisma.$disconnect());
