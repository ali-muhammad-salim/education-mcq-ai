"use client";
import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { studyKinds, studyLabels } from "@/services/study/contracts";
import styles from "./Study.module.css";
type Item = {
  id: string;
  title: string;
  kind: (typeof studyKinds)[number];
  chapter: string;
  revision: number;
  partIndex: number;
  partTotal: number;
};
export default function StudyLibrary() {
  const [board, setBoard] = useState("AKU-EB"),
    [grade, setGrade] = useState("9"),
    [subject, setSubject] = useState("Physics"),
    [kind, setKind] = useState(""),
    [items, setItems] = useState<Item[]>([]),
    [cursor, setCursor] = useState<string | null>(null),
    [busy, setBusy] = useState(true),
    [message, setMessage] = useState("");
  const request = useRef(0);
  async function load(after = "") {
    const serial = ++request.current;
    setBusy(true);
    setMessage("");
    try {
      const q = new URLSearchParams({
        board,
        classLevel: grade,
        subject,
        ...(kind ? { kind } : {}),
        ...(after ? { cursor: after } : {}),
      });
      const r = await fetch("/api/study?" + q);
      const d = await r.json();
      if (serial !== request.current) return;
      if (!r.ok) throw Error(d.error?.message || "Unable to load resources.");
      setItems((old) => (after ? [...old, ...d.resources] : d.resources));
      setCursor(d.nextCursor);
    } catch (e) {
      if (serial === request.current)
        setMessage(
          e instanceof Error ? e.message : "Unable to load study resources.",
        );
    } finally {
      if (serial === request.current) setBusy(false);
    }
  }
  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    setBoard(q.get("board") || "AKU-EB");
    setGrade(q.get("classLevel") || "9");
    setSubject(q.get("subject") || "Physics");
  }, []);
  useEffect(() => {
    request.current++;
    setItems([]);
    setCursor(null);
    setBusy(true);
    const timer = setTimeout(() => void load(), 300);
    return () => clearTimeout(timer);
  }, [board, grade, subject, kind]);
  return (
    <section className={styles.root}>
      <header className={styles.header}>
        <div>
          <span className={styles.eyebrow}>YOUR STUDY LIBRARY</span>
          <h1>Understand. Practise. Revise.</h1>
          <p className={styles.muted}>
            Chapter resources with original source references, worked solutions
            and clear revision tools.
          </p>
        </div>
        <Link className={styles.button} href="/resources">
          Books & archives →
        </Link>
      </header>
      <form
        className={styles.panel + " " + styles.filters}
        onSubmit={(e) => {
          e.preventDefault();
          void load();
        }}
      >
        <label>
          Board
          <input
            value={board}
            onChange={(e) => setBoard(e.target.value)}
            maxLength={100}
          />
        </label>
        <label>
          Class
          <select value={grade} onChange={(e) => setGrade(e.target.value)}>
            {[9, 10, 11, 12].map((n) => (
              <option key={n} value={n}>
                Class {n}
              </option>
            ))}
          </select>
        </label>
        <label>
          Subject
          <input
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            maxLength={160}
          />
        </label>
        <label>
          Resource type
          <select value={kind} onChange={(e) => setKind(e.target.value)}>
            <option value="">All resources</option>
            {studyKinds.map((k) => (
              <option key={k} value={k}>
                {studyLabels[k]}
              </option>
            ))}
          </select>
        </label>
        <button type="submit" className={styles.primary} disabled={busy}>
          Find resources
        </button>
      </form>
      {message && (
        <p className={styles.notice} role="alert">
          {message}
        </p>
      )}
      {busy && <p role="status">Loading reviewed study resources…</p>}
      {!busy && !message && !items.length && (
        <div className={styles.panel}>
          <h2>Study resources are being prepared</h2>
          <p>
            Resources appear here after their textbook evidence and generated
            content have both been reviewed.
          </p>
          <Link href="/syllabus">Explore the syllabus →</Link>
        </div>
      )}
      <div className={styles.grid}>
        {items.map((item) => (
          <article className={styles.card} key={item.id}>
            <span className={styles.badge}>{studyLabels[item.kind]}</span>
            <p className={styles.muted}>{item.chapter}</p>
            <h2>{item.title}</h2>
            <small>
              Educator reviewed · revision {item.revision}
              {item.partTotal > 1
                ? ` · part ${item.partIndex} of ${item.partTotal}`
                : ""}
            </small>
            <Link className={styles.button} href={"/study/" + item.id}>
              Open resource →
            </Link>
          </article>
        ))}
      </div>
      {cursor && (
        <div className={styles.actions}>
          <button disabled={busy} onClick={() => void load(cursor)}>
            Load more resources
          </button>
        </div>
      )}
    </section>
  );
}
