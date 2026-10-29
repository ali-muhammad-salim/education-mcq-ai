"use client";
import { useMemo, useState } from "react";
import Link from "next/link";
import { ChevronRight, Search } from "lucide-react";
import styles from "@/components/rise/discovery.module.css";
import type { BoardInfo, ClassDefinition } from "@/lib/boardCatalog";

type Subject = { id: string; name: string; slug: string; available?: boolean };

export default function ClassSubjectsClient({
  board,
  classDef,
  initialSubjects,
}: {
  board: BoardInfo;
  classDef: ClassDefinition;
  initialSubjects: Subject[];
}) {
  const [search, setSearch] = useState("");
  const query = search.trim().toLowerCase();
  const subjects = useMemo(() => {
    const matched = query
      ? initialSubjects.filter((s) => s.name.toLowerCase().includes(query))
      : initialSubjects;
    return [...matched].sort(
      (a, b) => Number(Boolean(b.available)) - Number(Boolean(a.available)),
    );
  }, [initialSubjects, query]);
  const published = initialSubjects.filter((s) => s.available).length;

  return (
    <section>
      <header className={styles.masthead}>
        <span className={styles.mastStamp}>
          {board.shortCode} · {classDef.stageLabel}
        </span>
        <h1 className={styles.mastTitle}>{classDef.name}</h1>
        <p className={styles.mastLede}>{classDef.description}</p>
        <div className={styles.mastMeta}>
          <span className={styles.metaItem}>
            <span className={styles.metaKey}>Curriculum</span>
            <span className={styles.metaValue}>{classDef.curriculum}</span>
          </span>
          <span className={styles.metaItem}>
            <span className={styles.metaKey}>Subjects</span>
            <span className={styles.metaValue} data-r-num>
              {published} of {initialSubjects.length} published
            </span>
          </span>
        </div>
      </header>

      <div className={styles.sectionHead}>
        <h2 className={styles.sectionTitle}>Subjects</h2>
        <span className={styles.sectionNote}>{classDef.stageLabel}</span>
      </div>

      <div className={styles.filter}>
        <label className={styles.filterLabel}>
          <span className={styles.filterLabelText}>Find a subject</span>
          <span className={styles.filterField}>
            <Search aria-hidden="true" className={styles.filterIcon} size={16} />
            <input
              className={styles.filterInput}
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Physics, Biology, Mathematics…"
            />
          </span>
        </label>
        <output className={styles.filterCount} aria-live="polite">
          {subjects.length} shown
        </output>
      </div>

      {subjects.length ? (
        <ul className={styles.index}>
          {subjects.map((subject, i) => (
            <li className={styles.indexRow} key={subject.id}>
              <Link
                className={
                  subject.available
                    ? styles.indexLink
                    : `${styles.indexLink} ${styles.indexPending}`
                }
                href={`/${board.id}/${classDef.roman}/${subject.slug}`}
              >
                <span className={styles.indexNum} data-r-num>
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span className={styles.indexLabel}>{subject.name}</span>
                <span className={styles.indexNote}>
                  {subject.available ? "Published" : "Coming soon"}
                </span>
                <ChevronRight
                  aria-hidden="true"
                  className={styles.indexArrow}
                  size={16}
                />
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <div className={styles.empty}>
          <h3 className={styles.emptyTitle}>No subject matches “{search}”</h3>
          <p className={styles.emptyBody}>
            Try a shorter spelling, or clear the search to see all{" "}
            {initialSubjects.length} subjects for {classDef.name}.
          </p>
        </div>
      )}
    </section>
  );
}
