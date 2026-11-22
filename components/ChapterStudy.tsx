import Link from "next/link";
import { notFound } from "next/navigation";
import Breadcrumbs from "./Breadcrumbs";
import StudyLibrary from "./StudyLibrary";
import { studyChapters, studyScope } from "@/services/study/navigation";
import { studyKinds, studyLabels } from "@/services/study/contracts";
import styles from "./Study.module.css";
import { hsscPhysicsSyllabus } from "@/lib/hsscPhysicsSyllabus";
import { physicsUnit16Resource } from "@/lib/physicsUnit16Resource";
import { physicsUnit17Resource } from "@/lib/physicsUnit17Resources";

const descriptions: Record<string, string> = {
  CHAPTER_NOTES: "Understand the key ideas, one section at a time.",
  NUMERICAL_GUIDE: "Follow worked problems and their units step by step.",
  FORMULA_SHEET: "Find the formulas and symbols used in this chapter.",
  CHEAT_SHEET: "Review the chapter’s essential points before an exam.",
  FLASHCARDS: "Recall concepts with short question-and-answer cards.",
  PRACTICE_SET: "Check your understanding with reviewed practice questions.",
  CHAPTER_READER: "Read a structured chapter with original source figures.",
};

export default async function ChapterStudy({
  params,
  kind,
}: {
  params: { board: string; class: string; subject: string; topicId?: string };
  kind?: string;
}) {
  const scope = studyScope(params.board, params.class, params.subject);
  if (!scope) notFound();
  const hssc = hsscPhysicsSyllabus(scope.board.id, scope.classDef.level, scope.meta.slug);
  const chapters = await studyChapters(scope);
  const chapter = params.topicId
    ? chapters.find((c) => c.id === params.topicId)
    : undefined;
  if (params.topicId && !chapter) notFound();
  const selected = studyKinds.find((k) => k === kind);
  if (kind && !selected) notFound();
  const chapterUrl =
    scope.baseUrl +
    "/study" +
    (chapter ? "/" + encodeURIComponent(chapter.id) : "");
  const title = chapter ? chapter.name : "Choose a chapter";
  const isPhysicsX = scope.board.id === "akueb" && scope.classDef.level === 10 && scope.meta.slug === "physics";
  const isUnit16 = (topicNumber: string | null) => isPhysicsX && Number(topicNumber) === physicsUnit16Resource.unit;
  const isUnit17 = (topicNumber: string | null) => isPhysicsX && Number(topicNumber) === physicsUnit17Resource.unit;
  const hasUnit16Sheet = (topicNumber: string | null, resourceKind: string | undefined) =>
    isUnit16(topicNumber) && (resourceKind === "FORMULA_SHEET" || resourceKind === "CHEAT_SHEET");
  const hasUnit17Material = (topicNumber: string | null, resourceKind: string | undefined) =>
    isUnit17(topicNumber) && ["CHAPTER_NOTES", "NUMERICAL_GUIDE", "FORMULA_SHEET", "CHEAT_SHEET", "PRACTICE_SET"].includes(resourceKind ?? "");
  const showUnit16Sheet = chapter && hasUnit16Sheet(chapter.topicNumber, selected);
  const showUnit17Material = chapter && hasUnit17Material(chapter.topicNumber, selected);
  return (
    <section className={styles.root}>
      <Breadcrumbs
        items={[
          { label: scope.board.name, href: "/" + scope.board.id },
          {
            label: scope.classDef.name,
            href: "/" + scope.board.id + "/" + scope.classDef.roman,
          },
          { label: scope.meta.title, href: scope.baseUrl },
          {
            label: "Chapters",
            href: scope.baseUrl + "/study",
            active: !chapter,
          },
          ...(chapter
            ? [{ label: chapter.name, href: chapterUrl, active: !selected }]
            : []),
          ...(selected ? [{ label: studyLabels[selected], active: true }] : []),
        ]}
      />
      <header className={styles.header}>
        <div>
          <span className={styles.eyebrow}>
            {scope.classDef.name} · {scope.meta.title}
          </span>
          <h1>{selected ? studyLabels[selected] : title}</h1>
          <p className={styles.muted}>
            {selected ? chapter?.name : chapter ? "" : "Choose a chapter."}
          </p>
        </div>
      </header>
      {!chapter ? (
        <>
          {chapters.length ? (
            <ol className={styles.chapterList}>
              {chapters.map((c) => (
                <li key={c.id}>
                  <Link
                    className={styles.chapterLink}
                    href={
                      hssc && !selected ? scope.baseUrl + "/syllabus#unit-" + c.topicNumber : scope.baseUrl +
                      "/study/" +
                      encodeURIComponent(c.id) +
                      (selected ? "?kind=" + selected : "")
                    }
                  >
                    <span>
                      <strong>
                        {c.topicNumber ? c.topicNumber + ". " : ""}
                        {c.name}
                      </strong>
                      <small className={styles.muted}>
                        {hssc && !selected ? "View learning outcomes" :
                          c.kinds.some(k => k.count && (!selected || k.kind === selected)) ||
                          hasUnit16Sheet(c.topicNumber, selected) ||
                          hasUnit17Material(c.topicNumber, selected) ||
                          (!selected && (isUnit16(c.topicNumber) || isUnit17(c.topicNumber))) ? "" : "Coming soon"}
                      </small>
                    </span>
                    <span aria-hidden="true">→</span>
                  </Link>
                </li>
              ))}
            </ol>
          ) : (
            <div className={styles.panel}>
              <h2>Coming soon</h2>
              <p></p>
              <Link href={scope.baseUrl + "/syllabus"}>
                View syllabus & learning outcomes →
              </Link>
            </div>
          )}
          <p>
            <Link href={scope.baseUrl}>← Back to {scope.meta.title}</Link>
          </p>
        </>
      ) : selected ? (
        <>
          <p>
            <Link href={chapterUrl}>← All material for this chapter</Link>
          </p>
          {showUnit16Sheet && (
            <article className={styles.panel}>
              <h2>Unit 16 D.C. Circuits Formula Cheat Sheet</h2>
              <p>V is voltage in volts (V), I is current in amperes (A), R is resistance in ohms (Ω), and P is power in watts (W). Rₑq is equivalent resistance.</p>
              <dl>
                <dt><strong>Ohm’s law</strong></dt>
                <dd>V = IR, I = V/R, R = V/I for an ohmic resistor at constant temperature.</dd>
                <dt><strong>Series resistors</strong></dt>
                <dd>Rₑq = R₁ + R₂ + R₃. The current is the same through each resistor. Voltage drops add.</dd>
                <dt><strong>Parallel resistors</strong></dt>
                <dd>1/Rₑq = 1/R₁ + 1/R₂ + 1/R₃. The voltage is the same across each branch. Branch currents add.</dd>
                <dt><strong>Two resistors in parallel</strong></dt>
                <dd>Rₑq = (R₁ × R₂)/(R₁ + R₂). For a mixed circuit, simplify one group at a time.</dd>
                <dt><strong>Electrical power</strong></dt>
                <dd>P = VI. For a resistor, P = I²R = V²/R. Use the voltage across and current through the same component.</dd>
              </dl>
              <p>Connect an ammeter in series and a voltmeter in parallel across the component.</p>
              <p><Link href={scope.baseUrl + "/numericals/" + physicsUnit16Resource.unit}>Unit 16 worked numericals</Link></p>
              <Link href={physicsUnit16Resource.href}>D.C. Circuits notes and original PDF</Link>
            </article>
          )}
          {showUnit17Material && (
            <article className={styles.panel}>
              {selected === "FORMULA_SHEET" && (
                <>
                  <h2>Unit 17 formulas</h2>
                  <dl>
                    <dt><strong>Magnetic flux</strong></dt>
                    <dd>Φ = BA cos θ for a uniform field through a flat surface. θ is the angle between the field and the surface normal. Φ is in webers (Wb).</dd>
                    <dt><strong>Magnetic force</strong></dt>
                    <dd>F = BIL when the wire is perpendicular to the magnetic field. F is in newtons (N).</dd>
                    <dt><strong>Turning effect of a coil</strong></dt>
                    <dd>With orientation fixed, torque increases with coil area, current, number of turns and magnetic field strength.</dd>
                  </dl>
                </>
              )}
              {selected === "CHEAT_SHEET" && (
                <ul>
                  {physicsUnit17Resource.topics.map(topic => 'revisionPage' in topic && (
                    <li key={topic.id}><Link href={topic.pdf + '#page=' + topic.revisionPage}>{topic.title} quick revision</Link></li>
                  ))}
                </ul>
              )}
              {(selected === "NUMERICAL_GUIDE" || selected === "FORMULA_SHEET") &&
                <p><Link href={scope.baseUrl + '/numericals/17'}>Unit 17 worked magnetic-flux problems</Link></p>}
              {selected === "PRACTICE_SET" && (
                <ul>
                  <li><Link href={physicsUnit17Resource.mcqsHref}>Unit 17 MCQs</Link></li>
                  <li><Link href={scope.baseUrl + '/crqs/17'}>Unit 17 CRQs</Link></li>
                </ul>
              )}
              <Link href={physicsUnit17Resource.href}>Magnetism resource packs and PDFs</Link>
            </article>
          )}
          {((!showUnit16Sheet && !showUnit17Material) || chapter.kinds.some(k => k.kind === selected && k.count > 0)) && <StudyLibrary
            key={chapter.id + selected}
            board={scope.board.shortCode}
            grade={String(scope.classDef.level)}
            subject={chapter.syllabusVersion.subject.name}
            topicId={chapter.id}
            kind={selected}
          />}
        </>
      ) : (
        <>
          <div className={styles.grid}>
            {chapter.topicNumber && (
              <article className={styles.card}>
                <h2>Chapter quiz</h2>
                <p className={styles.muted}>Sit every board MCQ filed under this chapter with instant feedback and a score.</p>
                <Link className={styles.button} href={`${scope.baseUrl}/mcqs/chapter-wise/${chapter.topicNumber}?quiz=1`}>
                  Start quiz →
                </Link>
              </article>
            )}
            {isUnit16(chapter.topicNumber) && (
              <article className={styles.card}>
                <h2>Extra resources</h2>
                <Link className={styles.button} href={physicsUnit16Resource.href}>D.C. Circuits notes and quiz →</Link>
              </article>
            )}
            {isUnit17(chapter.topicNumber) && (
              <article className={styles.card}>
                <h2>Extra resources</h2>
                <Link className={styles.button} href={physicsUnit17Resource.href}>Magnetism resource packs and PDFs →</Link>
              </article>
            )}
            {chapter.kinds.map(({ kind: resourceKind, count }) => (
              <article className={styles.card} key={resourceKind}>
                <h2>{studyLabels[resourceKind]}</h2>
                <p className={styles.muted}>{descriptions[resourceKind]}</p>
                {count || hasUnit16Sheet(chapter.topicNumber, resourceKind) || hasUnit17Material(chapter.topicNumber, resourceKind) ? (
                  <Link
                    className={styles.button}
                    href={chapterUrl + "?kind=" + resourceKind}
                  >
                    Open {studyLabels[resourceKind].toLowerCase()} →
                  </Link>
                ) : (
                  <span className={styles.muted}>Being prepared</span>
                )}
              </article>
            ))}
          </div>
          <p>
            <Link href={scope.baseUrl + "/study"}>
              ← Choose another chapter
            </Link>
          </p>
          <p>
            <Link href={scope.baseUrl + "/syllabus"}>
              Syllabus & learning outcomes →
            </Link>
          </p>
        </>
      )}
    </section>
  );
}
