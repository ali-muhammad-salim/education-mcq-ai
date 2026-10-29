"use client";
import type { StudyContent as Content } from "@/services/study/contracts";
import ScientificText from "./ScientificText";
import styles from "./Study.module.css";
export type StudySource = {
  id: string;
  pageNumber: number;
  sourceImageKey?: string;
};
export default function StudyContent({
  content,
  sources,
  resourceId,
  admin = false,
}: {
  content: Content;
  sources: StudySource[];
  resourceId: string;
  admin?: boolean;
}) {
  const pageHref = (id: string, region?: number) =>
    admin
      ? region === undefined
        ? "/api/assets/" + sources.find((s) => s.id === id)?.sourceImageKey
        : "/api/admin/study/" +
          resourceId +
          "/sources/" +
          id +
          "?region=" +
          region
      : "/api/study/" +
        resourceId +
        "/sources/" +
        id +
        (region === undefined ? "" : "?region=" + region);
  return (
    <div className={styles.reader}>
      <div className={styles.cover}>
        <small>
          {admin
            ? "Draft awaiting educator review."
            : "AI-assisted material reviewed by an educator."}
        </small>
        <details>
          <summary>Coverage & source information</summary>
          <p>
            <ScientificText text={content.scopeNote} />
          </p>
          <small>Source page numbers refer to the uploaded PDF.</small>
        </details>
      </div>
      <nav className={styles.toc} aria-label="Resource sections">
        {content.blocks.map((b, i) => (
          <a key={i} title={b.heading} href={"#study-section-" + i}>
            {b.heading || "Section " + (i + 1)}
          </a>
        ))}
      </nav>
      {content.blocks.map((b, i) => {
        const reveal = b.type === "FLASHCARD" || b.type === "PRACTICE";
        const body = (
          <>
            <p>
              <ScientificText text={b.text} />
            </p>
            {b.steps.length > 0 && (
              <ol>
                {b.steps.map((step, j) => (
                  <li key={j}>
                    <ScientificText text={step} />
                  </li>
                ))}
              </ol>
            )}
          </>
        );
        return (
          <section className={styles.block} key={i} id={"study-section-" + i}>
            <h2>
              <ScientificText text={b.heading} />
            </h2>
            {b.type === "FIGURE" && (
              <img
                className={styles.figure}
                src={pageHref(b.sourceIds[0], b.figureRegion)}
                alt={b.text || b.heading}
                loading="lazy"
              />
            )}
            {reveal ? (
              <details>
                <summary>
                  {b.type === "FLASHCARD"
                    ? "Reveal answer"
                    : "Show worked answer"}
                </summary>
                {body}
              </details>
            ) : (
              body
            )}
            <div className={styles.citation}>
              {b.sourceIds.map((id) => (
                <a
                  key={id}
                  href={pageHref(id)}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Source page{" "}
                  {sources.find((s) => s.id === id)?.pageNumber ?? "—"} ↗
                </a>
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}
