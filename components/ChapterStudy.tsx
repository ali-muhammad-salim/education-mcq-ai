import Link from "next/link";
import { notFound } from "next/navigation";
import Breadcrumbs from "./Breadcrumbs";
import StudyLibrary from "./StudyLibrary";
import { studyChapters, studyScope } from "@/services/study/navigation";
import { studyKinds, studyLabels } from "@/services/study/contracts";
import styles from "./Study.module.css";

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
            {selected
              ? chapter?.name
              : chapter
                ? "Choose what you want to study."
                : "Open a chapter to find its notes, numericals and revision tools."}
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
                    href={scope.baseUrl + "/study/" + encodeURIComponent(c.id)}
                  >
                    <span>
                      <strong>
                        {c.topicNumber ? c.topicNumber + ". " : ""}
                        {c.name}
                      </strong>
                      <small className={styles.muted}>
                        {c.kinds.some((k) => k.count)
                          ? "Study material available"
                          : "Study material being prepared"}
                      </small>
                    </span>
                    <span aria-hidden="true">→</span>
                  </Link>
                </li>
              ))}
            </ol>
          ) : (
            <div className={styles.panel}>
              <h2>Chapter material is being prepared</h2>
              <p>
                The chapter list will appear when the current curriculum is
                mapped.
              </p>
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
          <StudyLibrary
            key={chapter.id + selected}
            board={scope.board.shortCode}
            grade={String(scope.classDef.level)}
            subject={chapter.syllabusVersion.subject.name}
            topicId={chapter.id}
            kind={selected}
          />
        </>
      ) : (
        <>
          <div className={styles.grid}>
            {chapter.kinds.map(({ kind: resourceKind, count }) => (
              <article className={styles.card} key={resourceKind}>
                <h2>{studyLabels[resourceKind]}</h2>
                <p className={styles.muted}>{descriptions[resourceKind]}</p>
                {count ? (
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
