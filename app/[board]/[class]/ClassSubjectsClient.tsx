"use client";
import { useState } from "react";
import MaterialList from "@/components/MaterialList";
import styles from "@/components/MaterialLayout.module.css";
import type { BoardInfo, ClassDefinition } from "@/lib/boardHierarchy";
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
  const subjects = initialSubjects.filter((s) =>
    s.name.toLowerCase().includes(search.trim().toLowerCase()),
  );
  return (
    <section>
      <h1>{classDef.name}</h1>
      <label>
        <span className={styles.muted}>Find subject</span>
        <div className={styles.actions}>
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Subject name"
          />
        </div>
      </label>
      {subjects.length ? (
        <MaterialList
          items={subjects.map((subject) => ({
            label: subject.name,
            href: `/${board.id}/${classDef.roman}/${subject.slug}`,
            pending: !subject.available,
          }))}
        />
      ) : (
        <p>No subjects found.</p>
      )}
    </section>
  );
}
