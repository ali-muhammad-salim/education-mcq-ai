import React from "react";
import styles from "@/components/rise/discovery.module.css";
import { notFound } from "next/navigation";
import Trail from "@/components/rise/Trail";
import {
  getClassSubjects,
  normalizeBoardId,
  normalizeClassRoman,
} from "@/lib/boardHierarchy";
import ClassSubjectsClient from "./ClassSubjectsClient";

interface PageProps {
  params: Promise<{ board: string; class: string }>;
}

export default async function ClassPage({ params }: PageProps) {
  const { board: rawBoard, class: rawClass } = await params;
  const boardId = normalizeBoardId(rawBoard);
  const classRoman = normalizeClassRoman(rawClass);

  if (!classRoman) {
    notFound();
  }

  const data = await getClassSubjects(boardId, classRoman);

  if (!data || !data.board || !data.classDef) {
    notFound();
  }

  const { board, classDef, subjects } = data;

  return (
    <div className="rise-ui">
      <div className={styles.shell}>
        <Trail
          items={[
            { label: board.shortCode, href: `/${board.id}` },
            { label: classDef.name },
          ]}
        />

        <ClassSubjectsClient
          board={board}
          classDef={classDef}
          initialSubjects={subjects}
        />
      </div>
    </div>
  );
}
