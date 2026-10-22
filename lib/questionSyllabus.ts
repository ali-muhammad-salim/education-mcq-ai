import physicsIX from "@/data/physics/ssc1_exact_syllabus.json";
import physicsX from "@/data/physics/ssc2_exact_syllabus.json";
import {normalizeBoardId} from '@/lib/boardHierarchy';
import {getSubjectMeta} from '@/lib/subjectMetadata';

/** A missing/unreviewed mapping is not evidence that a question is outside a syllabus. */
export function questionSyllabus(
  meta: Record<string, any>,
  slos: { slo: { code?: string; description?: string } }[] | undefined,
  level: number,
  subject: string,
  board = "AKU-EB",
  historical = false,
) {
  const originalCode =
    typeof meta.slo === "string" ? meta.slo : slos?.[0]?.slo.code;
  const scoped=meta.mapping_scope;
  const current=Array.isArray(meta.current_mapping)?meta.current_mapping[0]:undefined;
  if(meta.current_syllabus_reviewed===true&&scoped?.grade===level&&normalizeBoardId(scoped.board)===normalizeBoardId(board)&&String(scoped.subject).toLowerCase()===subject.toLowerCase()&&typeof current?.code==='string'&&typeof current.description==='string'&&typeof current.topic==='string')return {status:'mapped' as const,originalCode,code:current.code,description:current.description,topic:current.topic,href:`/${normalizeBoardId(board)}/${({9:'IX',10:'X',11:'XI',12:'XII'} as Record<number,string>)[level]||level}/${getSubjectMeta(subject).slug}/syllabus#slo-${encodeURIComponent(current.code)}`};
  // An identical code in two editions does not establish an academic equivalence.
  const code = historical
    ? meta.current_syllabus_reviewed === true &&
      typeof meta.current_slo === "string"
      ? meta.current_slo
      : undefined
    : originalCode;
  if (
    board.toLowerCase().replace(/[^a-z0-9]/g, "") === "akueb" &&
    subject.toLowerCase() === "physics" &&
    [9, 10].includes(level) &&
    code
  ) {
    const units = level === 9 ? physicsIX : physicsX;
    for (const unit of units)
      for (const subtopic of unit.subtopics) {
        const outcome = subtopic.slos.find((s) => s.code === code);
        if (outcome)
          return {
            status: "mapped" as const,
            originalCode,
            code,
            description: outcome.description,
            topic: unit.name,
            href: `/akueb/${level === 9 ? "IX" : "X"}/physics/syllabus#slo-${encodeURIComponent(code)}`,
          };
      }
  }
  return {
    status:
      (historical
        ? meta.current_syllabus_reviewed === true
        : meta.syllabus_reviewed === true) && meta.out_of_syllabus === true
        ? ("outside" as const)
        : ("pending" as const),
    code: undefined,
    originalCode,
    description: undefined,
    topic: undefined,
    href: undefined,
  };
}
