import data2017 from "@/data/physics/hssc_xi_2017_papers.json";
import review2017 from "@/data/physics/hssc_xi_2017_review.json";
import feedback2017 from "@/data/physics/hssc_xi_2017_mcq_feedback.json";
import data2018 from "@/data/physics/hssc_xi_2018_papers.json";
import review2018 from "@/data/physics/hssc_xi_2018_review.json";
import feedback2018 from "@/data/physics/hssc_xi_2018_mcq_feedback.json";
import data2019 from "@/data/physics/hssc_xi_2019_papers.json";
import review2019 from "@/data/physics/hssc_xi_2019_review.json";
import feedback2019 from "@/data/physics/hssc_xi_2019_mcq_feedback.json";
import data2021 from "@/data/physics/hssc_xi_2021_papers.json";
import data2022 from "@/data/physics/hssc_xi_2022_papers.json";
import data2023 from "@/data/physics/hssc_xi_2023_papers.json";
import data2024 from "@/data/physics/hssc_xi_2024_papers.json";
import data2025 from "@/data/physics/hssc_xi_2025_papers.json";
import review2023 from "@/data/physics/hssc_xi_2023_review.json";
import review2021 from "@/data/physics/hssc_xi_2021_review.json";
import review2022 from "@/data/physics/hssc_xi_2022_review.json";
import review2024 from "@/data/physics/hssc_xi_2024_review.json";
import review2025 from "@/data/physics/hssc_xi_2025_review.json";
import feedback2021 from "@/data/physics/hssc_xi_2021_mcq_feedback.json";
import feedback2022 from "@/data/physics/hssc_xi_2022_mcq_feedback.json";
import feedback2023 from "@/data/physics/hssc_xi_2023_mcq_feedback.json";
import feedback2024 from "@/data/physics/hssc_xi_2024_mcq_feedback.json";
import feedback2025 from "@/data/physics/hssc_xi_2025_mcq_feedback.json";
import { hsscOptionFeedback, validateHsscFeedback } from "./hsscOptionFeedback";
import { hsscPhysicsSyllabus } from "./hsscPhysicsSyllabus";
import type { PaperData, QuestionData } from "./paperDataService";

type AnnualData = {
  papers: Record<string, Array<{ number: number; page: number; marks: number; stem: string; choices: object; facsimile: string; diagram: string | null; secondDiagram?: string }>>;
  key: Array<{ number: number; originalSlo?: string; answer: string; alternate?: string | null; level: string }>;
  notes: Record<string, { page: number; originalSlo?: string; level?: string; better: string; weaker: string }>;
};
type AnnualReview = {
  mcqMappings: string;
  held: Record<string, string>;
  corrected?: Record<string, string>;
  mcqNotes: Record<string, string>;
  written: Record<string, { mapping: string; solution: string; level?: string }>;
};

const editions: Array<{ year: number; data: AnnualData; review: AnnualReview; atp?: boolean; feedback: string[][] }> = [
  { year: 2017, data: data2017, review: review2017, feedback: feedback2017 },
  { year: 2018, data: data2018, review: review2018, feedback: feedback2018 },
  { year: 2019, data: data2019, review: review2019, feedback: feedback2019 },
  { year: 2021, data: data2021, review: review2021, atp: true, feedback: feedback2021 },
  { year: 2022, data: data2022, review: review2022, atp: true, feedback: feedback2022 },
  { year: 2023, data: data2023, review: review2023, feedback: feedback2023 },
  { year: 2024, data: data2024, review: review2024, feedback: feedback2024 },
  { year: 2025, data: data2025, review: review2025, feedback: feedback2025 },
];
const sourceRoot = (year: number) => `/materials/hssc/physics/physics-xi-${year}-`;
export const hsscXiAnnualResources: Array<{ label: string; href: string; year: number; original?: string }> = editions.flatMap(({ year, atp }) => [
  { label: "Paper 1", href: `/past-papers/PHY-XI-${year}-P1`, year },
  { label: "Paper 1 keys", href: sourceRoot(year) + "key.pdf", year },
  ...(!atp ? [
    { label: "Paper 2", href: `/past-papers/PHY-XI-${year}-P2`, year },
    { label: "Paper 2 E-marking", href: `/resources/physics-xi-${year}-emarking`, original: sourceRoot(year) + "emarking.pdf", year },
  ] : []),
]);

const outcomes = new Map([11, 12].flatMap(grade => hsscPhysicsSyllabus("akueb", grade, "physics")!.units
  .flatMap(unit => unit.subtopics.flatMap(subtopic => subtopic.slos.map(slo => [
    slo.code, { ...slo, grade, topic: unit.name, unitNumber: unit.unitNumber },
  ] as const)))));
export const hsscXiAnnualPapers: PaperData[] = editions.flatMap(({ year, data, review, atp, feedback }) => {
 const root = sourceRoot(year);
 const mappings = review.mcqMappings.split(" ");
 if (mappings.length !== data.key.length) throw new Error(`Incomplete Class XI ${year} MCQ review`);
 validateHsscFeedback(`PHY-XI-${year}-P1`, data.key.length, feedback);
 return Object.entries(data.papers).map(([code, rows]) => {
  const mcq = code.endsWith("P1");
  return {
    id: code, paperCode: code,
    title: `Physics Class XI Annual ${year} · Paper ${mcq ? "I" : "II"}`,
    examType: "ANNUAL", examSession: "Annual Examination", examYear: year,
    totalMarks: rows.reduce((total, row) => total + row.marks, 0),
    durationMinutes: year <= 2018 ? (mcq ? 40 : 140) : year === 2019 ? (mcq ? 50 : 130) : atp ? 130 : 90,
    ...(atp ? { markScalingNote: "The original paper includes 50 theory MCQs and 15 Alternate to Practical MCQs. The board equated the 50 theory marks to 85 for examination results." } : {}),
    ...(mcq ? {} : { rubricInstruction: year === 2017
      ? "Attempt Q1–Q13 and one alternative each from Q14, Q15 and Q16."
      : year === 2018
      ? "Attempt Q1–Q12 and one alternative each from Q13, Q14 and Q15."
      : year === 2019
      ? "Attempt Q1–Q11 and one alternative each from Q12 and Q13."
      : "Attempt Q1–Q8 and one alternative each from Q9 and Q10." }),
    fileUrl: root + (mcq ? "paper-i.pdf" : "paper-ii.pdf"),
    academicClass: { name: "Class XI", level: 11 },
    subject: { id: "physics", name: "Physics", code: "PHY-XI" },
    questions: rows.map((row): QuestionData => {
      const number = String(row.number);
      const boardKey = mcq ? data.key[row.number - 1] : undefined;
      const parts = mcq ? [] : Object.keys(review.written).filter(part => part === number || part === number + "a" || part === number + "b");
      if (!mcq && !parts.length) throw new Error(`Missing review for ${code}/${number}`);
      const marking = parts.map(part => ({
        part,
        ...data.notes[part],
        ...review.written[part],
      }));
      const links = (mcq ? mappings[row.number - 1] : marking.map(item => item.mapping).join("+"))
        .split("+").filter(item => item !== "-").map(item => {
          const outcome = outcomes.get(item);
          if (!outcome) throw new Error(`Unknown current SLO ${item} in ${code}/${number}`);
          return outcome;
        });
      const first = links[0];
      const level = boardKey?.level ?? marking[0]?.level;
      const hold = review.held[number];
      const corrected = review.corrected?.[number];
      const answerNote = mcq ? hold ?? review.mcqNotes[number] : undefined;
      const reviewedKey = hold ? undefined : corrected ?? boardKey?.answer;
      const diagram = row.diagram ?? (mcq && /given (?:figure|diagram)/i.test(row.stem) ? row.facsimile : undefined);
      return {
        id: `${code}-q${number}`, questionNumber: number, questionText: row.stem,
        questionType: mcq ? "MULTIPLE_CHOICE" : /^EITHER\b/i.test(row.stem) ? "EXTENDED_RESPONSE" : "CONSTRUCTED_RESPONSE",
        marks: row.marks, difficulty: level, diagramBased: Boolean(diagram),
        topics: [...new Map(links.map(o => [o.unitNumber, { topic: { name: o.topic, topicNumber: String(o.unitNumber) } }])).values()],
        slos: links.map(o => ({ slo: { code: o.code, description: o.description } })),
        sourceRegion: {
          pageNumber: row.page, pageScanUrl: row.facsimile, diagramUrl: diagram,
          ...(row.secondDiagram ? { secondDiagramUrl: row.secondDiagram } : {}),
          ...(atp ? { assessmentSection: row.number <= 50 ? "Theory" : "Alternate to Practical" } : {}),
          ...(boardKey ? {
            choices: Object.fromEntries(Object.entries(row.choices).filter((entry): entry is [string, string] => typeof entry[1] === "string")),
            official_answer: boardKey.answer,
            ...(boardKey.alternate ? { official_alternate_answer: boardKey.alternate } : {}),
            ...(hold ? { answer_status: "KEY_CONFLICT" } : corrected
              ? { correct_answer: corrected, answer_status: "ANSWER_CORRECTED", answer_origin: "PROJECT_SOLVED" }
              : { correct_answer: boardKey.answer }),
            ...(answerNote ? { answer_review_note: answerNote } : {}),
            ...hsscOptionFeedback(feedback[row.number - 1], reviewedKey),
            original_reference_source: root + "key.pdf",
          } : {
            emarkingExamples: marking.map(item => {
              const outcome = outcomes.get(item.mapping.split("+")[0]);
              return {
                part: item.part, better: item.better, weaker: item.weaker, solution: item.solution,
                originalSlo: item.originalSlo, pdf: root + "emarking.pdf#page=" + item.page,
                level: item.level, currentSlo: outcome ? { code: outcome.code, grade: outcome.grade } : undefined,
              };
            }),
            original_reference_source: root + "emarking.pdf#page=" + marking[0].page,
          }),
          slo: boardKey?.originalSlo ?? marking[0]?.originalSlo,
          original_reference_verified: true,
          cognitive_level: level, current_syllabus_reviewed: true, syllabus_reviewed: true,
          current_slo: first?.code ?? null, current_mapping: links,
          mapping_scope: { board: "AKU-EB", grade: first?.grade ?? 11, subject: "Physics" },
          in_syllabus: first?.grade === 11, out_of_syllabus: !first,
        },
      };
    }),
  };
 });
});
