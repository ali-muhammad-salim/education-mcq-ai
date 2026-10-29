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
export default function StudyLibrary({
  board,
  grade,
  subject,
  topicId,
  kind,
}: {
  board: string;
  grade: string;
  subject: string;
  topicId: string;
  kind: (typeof studyKinds)[number];
}) {
  const [items, setItems] = useState<Item[]>([]),
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
        topicId,
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
    request.current++;
    setItems([]);
    setCursor(null);
    setBusy(true);
    const timer = setTimeout(() => void load(), 300);
    return () => {
      clearTimeout(timer);
      request.current++;
    };
  }, [board, grade, subject, topicId, kind]);
  return (
    <div>
      {message && (
        <p className={styles.notice} role="alert">
          {message}
        </p>
      )}
      {busy && <p role="status">Loading reviewed study resources…</p>}
      {!busy && !message && !items.length && (
        <div className={styles.panel}>
          <h2>This resource is being prepared</h2>
          <p>
            Resources appear here after their textbook evidence and generated
            content have both been reviewed.
          </p>
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
    </div>
  );
}
