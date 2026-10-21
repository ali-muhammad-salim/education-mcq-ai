"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import type { StudyContent as Content } from "@/services/study/contracts";
import { studyLabels, studyKinds } from "@/services/study/contracts";
import StudyContent, { StudySource } from "./StudyContent";
import styles from "./Study.module.css";
export default function StudyReader({ id }: { id: string }) {
  useEffect(() => {
    const states = new Map<HTMLDetailsElement, boolean>();
    const before = () => {
      states.clear();
      document
        .querySelectorAll<HTMLDetailsElement>("[data-study-reader] details")
        .forEach((detail) => {
          states.set(detail, detail.open);
          detail.open = true;
        });
    };
    const after = () => {
      states.forEach((open, detail) => {
        detail.open = open;
      });
      states.clear();
    };
    window.addEventListener("beforeprint", before);
    window.addEventListener("afterprint", after);
    return () => {
      window.removeEventListener("beforeprint", before);
      window.removeEventListener("afterprint", after);
    };
  }, []);
  const [resource, setResource] = useState<{
      content: Content;
      kind: (typeof studyKinds)[number];
      sources: StudySource[];
      chapter: string;
      libraryUrl: string;
      syllabusUrl: string;
      revision: number;
      partIndex: number;
      partTotal: number;
      sections: { id: string; title: string; partIndex: number }[];
    } | null>(null),
    [message, setMessage] = useState(""),
    [busy, setBusy] = useState(true);
  useEffect(() => {
    setBusy(true);
    setMessage("");
    setResource(null);
    const c = new AbortController();
    void fetch("/api/study/" + encodeURIComponent(id), { signal: c.signal })
      .then(async (r) => {
        const d = await r.json();
        if (!r.ok)
          throw Error(d.error?.message || "This resource is unavailable.");
        setResource(d.resource);
      })
      .catch((e) => {
        if (!c.signal.aborted)
          setMessage(
            e instanceof Error ? e.message : "Unable to open resource.",
          );
      })
      .finally(() => {
        if (!c.signal.aborted) setBusy(false);
      });
    return () => c.abort();
  }, [id]);
  return (
    <section className={styles.root} data-study-reader>
      <div className={styles.noPrint}>
        <Link href={resource?.libraryUrl || "/study"}>← Chapter material</Link>
      </div>
      {busy ? (
        <p role="status">Opening your study resource…</p>
      ) : message ? (
        <p className={styles.notice} role="alert">
          {message}
        </p>
      ) : (
        resource && (
          <>
            <header className={styles.header}>
              <div>
                <span className={styles.eyebrow}>
                  {studyLabels[resource.kind]}
                </span>
                <h1>{resource.content.title}</h1>
                <p className={styles.muted}>
                  {resource.chapter} · educator reviewed · revision{" "}
                  {resource.revision}
                  {resource.partTotal > 1
                    ? ` · part ${resource.partIndex} of ${resource.partTotal}`
                    : ""}
                </p>
              </div>
              <div className={styles.actions}>
                <button onClick={() => window.print()}>Print / save PDF</button>
              </div>
            </header>
            <nav className={styles.toc} aria-label="Chapter sections">
              {resource.sections.length > 1 &&
                resource.sections.map((section) => (
                  <Link
                    key={section.id}
                    href={"/study/" + section.id}
                    aria-current={section.id === id ? "page" : undefined}
                  >
                    Part {section.partIndex}
                  </Link>
                ))}
            </nav>
            <StudyContent
              resourceId={id}
              content={resource.content}
              sources={resource.sources}
            />
            <div className={styles.panel + " " + styles.noPrint}>
              <h2>Keep learning</h2>
              <div className={styles.actions}>
                <Link className={styles.button} href={resource.libraryUrl}>
                  More material for this chapter
                </Link>
                <Link className={styles.button} href={resource.syllabusUrl}>
                  Syllabus & learning outcomes
                </Link>
                <Link className={styles.button} href="/quizzes">
                  Practice quizzes
                </Link>
              </div>
            </div>
          </>
        )
      )}
    </section>
  );
}
