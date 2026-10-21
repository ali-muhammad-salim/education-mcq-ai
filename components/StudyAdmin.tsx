"use client";
import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import {
  studyKinds,
  studyLabels,
  studyContentSchema,
  type StudyContent as Content,
} from "@/services/study/contracts";
import StudyContent, { StudySource } from "./StudyContent";
import styles from "./Study.module.css";
type Item = {
  id: string;
  title: string;
  kind: (typeof studyKinds)[number];
  status: string;
  revision: number;
  partIndex: number;
  partTotal: number;
  topic: { name: string };
};
type Book = {
  id: string;
  fileName: string;
  totalPages: number;
  subject: { name: string; academicClass: { level: number } };
};
type Note = Item & {
  contentHash: string | null;
  blocks: unknown;
  sources: {
    artifact: StudySource & { status: string; contentHash: string };
  }[];
  generation: {
    verification?: { checked: boolean; conflicts: string[] };
    model?: string;
    verifierModel?: string;
  } | null;
};
type Job = {
  id: string;
  status: string;
  error: string | null;
  availableAt: string;
};
export default function StudyAdmin() {
  const [items, setItems] = useState<Item[]>([]),
    [books, setBooks] = useState<Book[]>([]),
    [book, setBook] = useState(""),
    [topics, setTopics] = useState<{ id: string; name: string }[]>([]),
    [pickedTopics, setPickedTopics] = useState<string[]>([]),
    [kinds, setKinds] = useState<string[]>([...studyKinds]),
    [newRevision, setNewRevision] = useState(false),
    [reviewedPages, setReviewedPages] = useState<number | null>(null),
    [totalPages, setTotalPages] = useState(0),
    [status, setStatus] = useState("PENDING_REVIEW"),
    [cursor, setCursor] = useState<string | null>(null),
    [booksCursor, setBooksCursor] = useState<string | null>(null),
    [jobs, setJobs] = useState<Job[]>([]),
    [selected, setSelected] = useState<Note | null>(null),
    [content, setContent] = useState<Content | null>(null),
    [reviewNote, setReviewNote] = useState(""),
    [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false),
    [preview, setPreview] = useState(false);
  const requestSerial = useRef(0);
  async function load(after = "", bookAfter = "") {
    const serial = ++requestSerial.current;
    setBusy(true);
    setMessage("");
    try {
      const q = new URLSearchParams({
        status,
        ...(after ? { cursor: after } : {}),
        ...(bookAfter ? { documentsCursor: bookAfter } : {}),
      });
      const r = await fetch("/api/admin/study?" + q);
      const d = await r.json();
      if (serial !== requestSerial.current) return;
      if (!r.ok)
        throw Error(d.error?.message || "Unable to load study resources.");
      setItems((old) => (after ? [...old, ...d.notes] : d.notes));
      setBooks((old) => [
        ...new Map(
          (bookAfter
            ? [...old, ...d.documents]
            : [...d.documents, ...old.filter((b) => b.id === book)]
          ).map((b: Book) => [b.id, b]),
        ).values(),
      ]);
      setJobs((old) => (after ? [...old, ...d.jobs] : d.jobs));
      setCursor(d.nextCursor);
      setBooksCursor(d.documentsCursor);
    } catch (e) {
      if (serial === requestSerial.current)
        setMessage(
          e instanceof Error ? e.message : "Unable to load resources.",
        );
    } finally {
      if (serial === requestSerial.current) setBusy(false);
    }
  }
  useEffect(() => {
    setSelected(null);
    setContent(null);
    void load();
  }, [status]);
  useEffect(() => {
    setPickedTopics([]);
    setReviewedPages(null);
    setTopics([]);
    if (!book) return;
    const c = new AbortController();
    void fetch("/api/admin/study?documentId=" + encodeURIComponent(book), {
      signal: c.signal,
    })
      .then(async (r) => {
        const d = await r.json();
        if (!r.ok)
          throw Error(d.error?.message || "Unable to load book chapters.");
        setTopics(d.topics);
        setReviewedPages(
          d.document.artifacts.filter(
            (a: { status: string }) => a.status === "APPROVED",
          ).length,
        );
        setTotalPages(d.document.totalPages);
      })
      .catch((e) => {
        if (!c.signal.aborted)
          setMessage(e instanceof Error ? e.message : "Unable to load book.");
      });
    return () => c.abort();
  }, [book]);
  async function open(id: string) {
    const serial = ++requestSerial.current;
    setBusy(true);
    setMessage("");
    try {
      const r = await fetch("/api/admin/study?id=" + encodeURIComponent(id));
      const d = await r.json();
      if (serial !== requestSerial.current) return;
      if (!r.ok) throw Error(d.error?.message || "Unable to open draft.");
      setSelected(d.note);
      const parsed = studyContentSchema.safeParse(d.note.blocks);
      setContent(parsed.success ? parsed.data : null);
      setReviewNote("");
      setPreview(false);
    } catch (e) {
      if (serial === requestSerial.current)
        setMessage(e instanceof Error ? e.message : "Unable to open draft.");
    } finally {
      if (serial === requestSerial.current) setBusy(false);
    }
  }
  async function generate() {
    setBusy(true);
    setMessage("");
    try {
      const r = await fetch("/api/admin/study", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          documentId: book,
          kinds,
          ...(pickedTopics.length ? { topicIds: pickedTopics } : {}),
          newRevision,
        }),
      });
      const d = await r.json();
      if (!r.ok)
        throw Error(d.error?.message || "Unable to create study pack.");
      setMessage(
        d.queued +
          " resources queued across " +
          d.chapters +
          " chapters. Existing resources are preserved. Choose Drafts and refresh to see progress.",
      );
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Unable to queue resources.");
    } finally {
      setBusy(false);
    }
  }
  async function review(action: "PUBLISH" | "REJECT") {
    if (!selected?.contentHash || !content) return;
    setBusy(true);
    setMessage("");
    try {
      const r = await fetch("/api/admin/study", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: selected.id,
          contentHash: selected.contentHash,
          action,
          note: reviewNote,
          ...(action === "PUBLISH" ? { content } : {}),
        }),
      });
      const d = await r.json();
      if (!r.ok) throw Error(d.error?.message || "Unable to save review.");
      setSelected(null);
      setContent(null);
      await load();
      setMessage(
        d.status === "PUBLISHED"
          ? d.ready
            ? "Resource published with source references."
            : `Section approved. ${d.remainingParts} sections remain before this chapter revision becomes visible.`
          : "Resource withdrawn from student access.",
      );
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Unable to save review.");
    } finally {
      setBusy(false);
    }
  }
  function changeBlock(
    index: number,
    change: Partial<Content["blocks"][number]>,
  ) {
    if (content)
      setContent({
        ...content,
        blocks: content.blocks.map((b, i) =>
          i === index ? { ...b, ...change } : b,
        ),
      });
  }
  return (
    <section className={styles.root}>
      <header className={styles.header}>
        <div>
          <span className={styles.eyebrow}>ADMINISTRATION</span>
          <h1>Book study packs</h1>
          <p className={styles.muted}>
            Create source-backed chapter resources, resolve scientific doubts
            and publish reviewed revisions.
          </p>
        </div>
        <div className={styles.actions}>
          <Link className={styles.button} href="/admin/knowledge">
            Review source pages
          </Link>
          <Link className={styles.button} href="/study">
            Student library ↗
          </Link>
        </div>
      </header>
      {message && (
        <p role="status" className={styles.notice}>
          {message}
        </p>
      )}
      {!selected ? (
        <>
          <section className={styles.panel}>
            <h2>Create a study pack</h2>
            <p>
              All book pages must be reviewed first. Only chapters with mapped
              evidence are generated. New practice questions are labelled as
              practice, never as official past papers.
            </p>
            <div className={styles.editor}>
              <label>
                Source textbook
                <select value={book} onChange={(e) => setBook(e.target.value)}>
                  <option value="">Select an uploaded book</option>
                  {books.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.subject.name} · Class {b.subject.academicClass.level} ·{" "}
                      {b.fileName}
                    </option>
                  ))}
                </select>
              </label>
              {booksCursor && (
                <button
                  disabled={busy}
                  onClick={() => void load("", booksCursor)}
                >
                  Load more books
                </button>
              )}
              {book && (
                <p>
                  {reviewedPages === null
                    ? "Loading page review status…"
                    : reviewedPages + " of " + totalPages + " pages approved"}
                </p>
              )}
              <fieldset>
                <legend>Resources to create</legend>
                <div className={styles.chips}>
                  {studyKinds.map((k) => (
                    <label className={styles.check} key={k}>
                      <input
                        type="checkbox"
                        checked={kinds.includes(k)}
                        onChange={(e) =>
                          setKinds((old) =>
                            e.target.checked
                              ? [...old, k]
                              : old.filter((v) => v !== k),
                          )
                        }
                      />
                      {studyLabels[k]}
                    </label>
                  ))}
                </div>
              </fieldset>
              {topics.length > 0 && (
                <fieldset>
                  <legend>Chapters</legend>
                  <p>
                    Leave all unselected to create resources for every chapter
                    with reviewed source mappings.
                  </p>
                  {topics.map((t) => (
                    <label key={t.id} className={styles.check}>
                      <input
                        type="checkbox"
                        checked={pickedTopics.includes(t.id)}
                        onChange={(e) =>
                          setPickedTopics((old) =>
                            e.target.checked
                              ? [...old, t.id]
                              : old.filter((v) => v !== t.id),
                          )
                        }
                      />
                      {t.name}
                    </label>
                  ))}
                </fieldset>
              )}
              <label className={styles.check}>
                <input
                  type="checkbox"
                  checked={newRevision}
                  onChange={(e) => setNewRevision(e.target.checked)}
                />
                Create a new revision where a resource already exists
              </label>
              <button
                className={styles.primary}
                disabled={
                  busy ||
                  !book ||
                  !kinds.length ||
                  reviewedPages !== totalPages ||
                  !totalPages
                }
                onClick={() => void generate()}
              >
                Queue study pack
              </button>
            </div>
          </section>
          <section>
            <div className={styles.header}>
              <h2>Resources & reviews</h2>
              <div className={styles.actions}>
                <label>
                  Status
                  <select
                    disabled={busy}
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                  >
                    {[
                      "PENDING_REVIEW",
                      "DRAFT",
                      "PUBLISHED",
                      "REJECTED",
                      "FAILED",
                    ].map((s) => (
                      <option key={s} value={s}>
                        {s === "DRAFT"
                          ? "Drafts / processing"
                          : s.replaceAll("_", " ").toLowerCase()}
                      </option>
                    ))}
                  </select>
                </label>
                <button disabled={busy} onClick={() => void load()}>
                  Refresh
                </button>
              </div>
            </div>
            <div className={styles.grid}>
              {items.map((item) => {
                const job = jobs.find((j) => j.id === "study:" + item.id);
                return (
                  <article className={styles.card} key={item.id}>
                    <span className={styles.badge}>
                      {studyLabels[item.kind]}
                    </span>
                    <h3>{item.title}</h3>
                    <p>
                      {item.topic.name} · revision {item.revision}
                      {item.partTotal > 1
                        ? ` · part ${item.partIndex} of ${item.partTotal}`
                        : ""}
                    </p>
                    {job && (
                      <small>
                        Processing: {job.status.toLowerCase()}
                        {job.error ? " · " + job.error : ""}
                      </small>
                    )}
                    <button disabled={busy} onClick={() => void open(item.id)}>
                      Open resource
                    </button>
                  </article>
                );
              })}
            </div>
            {!busy && !items.length && <p>No resources with this status.</p>}
            {cursor && (
              <button disabled={busy} onClick={() => void load(cursor)}>
                Load more resources
              </button>
            )}
          </section>
        </>
      ) : (
        <section>
          <button
            onClick={() => {
              setSelected(null);
              setContent(null);
            }}
          >
            ← Back to resources
          </button>
          <h2>{selected.title}</h2>
          <p>
            {studyLabels[selected.kind]} ·{" "}
            {selected.status.replaceAll("_", " ").toLowerCase()}
          </p>
          {!content ? (
            <p className={styles.notice}>
              Generation has not produced a reviewable draft yet. Check Drafts
              for processing errors or deferred quota capacity.
            </p>
          ) : (
            <>
              <div className={styles.panel}>
                <h3>Independent check on the generated draft</h3>
                <p>
                  {selected.generation?.verification?.checked
                    ? "The independent model reported agreement. Check the original evidence before publication."
                    : "Scientific or source checks require educator attention."}
                </p>
                <ul>
                  {selected.generation?.verification?.conflicts?.map(
                    (reason, i) => (
                      <li key={i}>{reason}</li>
                    ),
                  )}
                </ul>
                <p>
                  Generator: {selected.generation?.model || "unavailable"} ·
                  Verifier:{" "}
                  {selected.generation?.verifierModel || "unavailable"}
                </p>
                <div className={styles.actions}>
                  {selected.sources.map((s) => (
                    <a
                      key={s.artifact.id}
                      href={"/api/assets/" + s.artifact.sourceImageKey}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Original page {s.artifact.pageNumber} ↗
                    </a>
                  ))}
                </div>
              </div>
              <div className={styles.actions}>
                <button onClick={() => setPreview(!preview)}>
                  {preview ? "Edit resource" : "Preview reading layout"}
                </button>
                {selected.status === "PUBLISHED" && (
                  <Link href={"/study/" + selected.id}>
                    Open published resource ↗
                  </Link>
                )}
              </div>
              {preview ? (
                <StudyContent
                  admin
                  resourceId={selected.id}
                  sources={selected.sources.map((s) => s.artifact)}
                  content={content}
                />
              ) : (
                <div className={styles.panel + " " + styles.editor}>
                  <label>
                    Title
                    <input
                      maxLength={240}
                      value={content.title}
                      onChange={(e) =>
                        setContent({ ...content, title: e.target.value })
                      }
                    />
                  </label>
                  <label>
                    Coverage and remaining gaps
                    <textarea
                      value={content.scopeNote}
                      maxLength={2000}
                      onChange={(e) =>
                        setContent({ ...content, scopeNote: e.target.value })
                      }
                    />
                  </label>
                  {content.blocks.map((b, i) => (
                    <details className={styles.block} key={i}>
                      <summary>
                        {i + 1}. {b.heading || b.type}
                      </summary>
                      <div className={styles.editor}>
                        <label>
                          Heading
                          <input
                            value={b.heading}
                            maxLength={500}
                            onChange={(e) =>
                              changeBlock(i, { heading: e.target.value })
                            }
                          />
                        </label>
                        <label>
                          Explanation / answer
                          <textarea
                            value={b.text}
                            maxLength={6000}
                            onChange={(e) =>
                              changeBlock(i, { text: e.target.value })
                            }
                          />
                        </label>
                        <label>
                          Worked steps (one per line)
                          <textarea
                            value={b.steps.join("\n")}
                            onChange={(e) =>
                              changeBlock(i, {
                                steps: e.target.value
                                  .split("\n")
                                  .filter((v) => v.trim()),
                              })
                            }
                          />
                        </label>
                        <small>
                          Cited PDF pages:{" "}
                          {b.sourceIds
                            .map(
                              (id) =>
                                selected.sources.find(
                                  (s) => s.artifact.id === id,
                                )?.artifact.pageNumber || "?",
                            )
                            .join(", ")}
                        </small>
                      </div>
                    </details>
                  ))}
                </div>
              )}
              <div className={styles.panel}>
                <label>
                  Review record
                  <textarea
                    value={reviewNote}
                    minLength={30}
                    maxLength={4000}
                    onChange={(e) => setReviewNote(e.target.value)}
                    placeholder="Explain the source pages, calculations and corrections you checked (at least 30 characters)."
                  />
                </label>
                <p>
                  Publication also makes the cited original page images
                  available with the resource. All citations are rechecked
                  whenever a student opens it.
                </p>
                <div className={styles.actions}>
                  <button
                    className={styles.primary}
                    disabled={
                      busy ||
                      reviewNote.trim().length < 30 ||
                      selected.status !== "PENDING_REVIEW"
                    }
                    onClick={() => void review("PUBLISH")}
                  >
                    Publish reviewed resource
                  </button>
                  <button
                    disabled={
                      busy ||
                      reviewNote.trim().length < 30 ||
                      selected.status === "REJECTED"
                    }
                    onClick={() => void review("REJECT")}
                  >
                    {selected.status === "PUBLISHED"
                      ? "Withdraw resource"
                      : "Reject draft"}
                  </button>
                </div>
              </div>
            </>
          )}
        </section>
      )}
    </section>
  );
}
