import { normalizeBoardId } from "./boardCatalog";
import questions from "@/data/physics/hssc_model_questions.json";
import review from "@/data/physics/hssc_model_review.json";
import solutions from "@/data/physics/hssc_model_worked_solutions.json";
import feedbackXI from "@/data/physics/hssc_xi_model_mcq_feedback.json";
import feedbackXII from "@/data/physics/hssc_xii_model_mcq_feedback.json";
import { hsscOptionFeedback, validateHsscFeedback } from "./hsscOptionFeedback";
import { hsscPhysicsSyllabus } from "./hsscPhysicsSyllabus";
import type { PaperData, QuestionData } from "./paperDataService";

const root = "/materials/hssc/physics/";
const scope = [
  { grade: 11, roman: "XI", year: 2026, guidePage: 1, guidePages: [1,2,2,3,3,4,4,5,6,7], periods: [8,11,11,12,10,14,18,14,17,25], practicalObjective: "Determine the capacity of a test tube using Vernier callipers.", practicalTopic: 1 },
  { grade: 12, roman: "XII", year: 2027, guidePage: 9, guidePages: [9,10,11,12,13,13,15,15,17,17], periods: [11,20,22,12,18,20,12,8,13,4], practicalObjective: "Determine the resistance of a wire using a slide wire bridge.", practicalTopic: 13 },
] as const;

export function hsscPhysicsResources(board: string, grade: number, subject: string) {
  if (normalizeBoardId(board) !== "akueb" || subject.toLowerCase() !== "physics") return null;
  const level = scope.find(item => item.grade === grade);
  if (!level) return null;
  const slug = level.roman.toLowerCase();
  return {
    ...level,
    base: `/akueb/${level.roman}/physics`,
    guide: root + "physics-hssc-resource-guide-2025.pdf",
    pacing: root + `physics-${slug}-pacing-guide-2025.pdf`,
    practical: root + `physics-${slug}-sample-practical.pdf`,
    codes: [`PHY-${level.roman}-P1`, `PHY-${level.roman}-P2`] as const,
  };
}

export const hsscPhysicsPapers: PaperData[] = scope.flatMap(level => {
  const resources = hsscPhysicsResources("akueb", level.grade, "physics")!;
  const units = hsscPhysicsSyllabus("akueb", level.grade, "physics")!.units;
  const outcomes = new Map(units.flatMap(unit => unit.subtopics.flatMap(topic => topic.slos.map(outcome => [
    outcome.code, { ...outcome, topic: unit.name, unitNumber: unit.unitNumber },
  ] as const))));
  return resources.codes.map((code, index) => {
    const mcq = index === 0;
    const mapping = review[code].slos.split(" ");
    const answers = mcq ? review[resources.codes[0]] : null;
    const key = answers?.key.replace(/\s+/g, "") ?? "";
    const rows = questions[code];
    const worked = code.endsWith("-P2") ? solutions[code as keyof typeof solutions] : undefined;
    const feedback = mcq ? (level.grade === 11 ? feedbackXI : feedbackXII) : undefined;
    if (mapping.length !== rows.length || (mcq ? key.length !== rows.length : worked?.length !== rows.length)) throw new Error(`Incomplete HSSC review for ${code}`);
    if (feedback) validateHsscFeedback(code, rows.length, feedback);
    return {
      id: code, paperCode: code, title: `Physics Class ${level.roman} Model Paper ${mcq ? "I" : "II"}`,
      examYear: level.year, examType: "MODEL_EXAM", examSession: "Model Examination",
      totalMarks: mcq ? 50 : 35, durationMinutes: 90,
      ...(mcq ? {} : { rubricInstruction: "Attempt all short questions and choose either alternative in each extended question." }),
      fileUrl: root + `physics-model-paper-${level.roman.toLowerCase()}-paper-${mcq ? "i" : "ii"}.pdf`,
      academicClass: { name: `Class ${level.roman}`, level: level.grade },
      subject: { id: "physics", name: "Physics", code: `PHY-${level.roman}` },
      questions: rows.map((row, i): QuestionData => {
        const linked = mapping[i].split("+").map(slo => {
          const outcome = outcomes.get(slo);
          if (!outcome) throw new Error(`Unknown SLO ${slo} in ${code}`);
          return outcome;
        });
        const first = linked[0];
        const correct = /^[A-D]$/.test(key[i] ?? "") ? key[i] : undefined;
        const note = (answers?.notes as Record<string, string> | undefined)?.[String(row.number)];
        const diagram = row.diagram || (mcq && /given (?:diagram|figure)|following graph|shows the projectile/i.test(row.stem) ? row.facsimile : undefined);
        return {
          id: `${code}-q${row.number}`, questionNumber: String(row.number), questionText: row.stem,
          marks: row.marks, questionType: mcq ? "MULTIPLE_CHOICE" : row.marks === 5 ? "EXTENDED_RESPONSE" : "CONSTRUCTED_RESPONSE",
          difficulty: first.cognitiveLevel, diagramBased: Boolean(diagram),
          topics: [...new Map(linked.map(o => [o.unitNumber, { topic: { name: o.topic, topicNumber: String(o.unitNumber) } }])).values()],
          slos: linked.map(o => ({ slo: { code: o.code, description: o.description } })),
          sourceRegion: {
            choices: mcq ? Object.fromEntries(Object.entries(row.choices).filter((entry): entry is [string, string] => typeof entry[1] === "string")) : undefined,
            ...(correct ? { solved_correct_option: correct, answer_origin: "PROJECT_SOLVED" } : {}),
            ...(feedback ? hsscOptionFeedback(feedback[i], correct) : {}),
            ...(mcq && !correct ? { answer_status: "KEY_CONFLICT" } : {}),
            ...(note ? { answer_review_note: note } : {}),
            ...(worked ? { model_answer: worked[i], model_answer_origin: "Project worked solution" } : {}),
            current_syllabus_reviewed: true, syllabus_reviewed: true, current_slo: first.code,
            current_mapping: linked, mapping_scope: { board: "AKU-EB", grade: level.grade, subject: "Physics" },
            in_syllabus: true, cognitive_level: first.cognitiveLevel, pageNumber: row.page,
            pageScanUrl: row.facsimile, diagramUrl: diagram,
          },
        };
      }),
    };
  });
});
