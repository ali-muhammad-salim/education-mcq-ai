"use client";
import { useState } from "react";
import PaperViewerClient from "@/components/PaperViewerClient";
import { questionSyllabus } from "@/lib/questionSyllabus";
import { paperMetadata } from "@/lib/paperPresentation";
import type { PaperData } from "@/lib/paperDataService";
import styles from "@/components/MaterialLayout.module.css";
export default function McqsClient({
  model,
  past,
}: {
  model: PaperData;
  past: PaperData | null;
}) {
  const [mode, setMode] = useState("model"),
    [chapter, setChapter] = useState("");
  const paper = mode === "past" && past ? past : model;
  const chapters = new Map<string, string>();
  paper.questions.forEach((question) => {
    const mapping = questionSyllabus(
      paperMetadata(question.sourceRegion),
      question.slos,
      paper.academicClass.level,
      paper.subject.name,
      "AKU-EB",
      mode === "past",
    );
    if (mapping.status === "mapped" && mapping.code)
      chapters.set(mapping.code.split(".")[0], mapping.topic!);
  });
  const questions = chapter
    ? paper.questions.filter((question) => {
        const mapping = questionSyllabus(
          paperMetadata(question.sourceRegion),
          question.slos,
          paper.academicClass.level,
          paper.subject.name,
          "AKU-EB",
          mode === "past",
        );
        return (
          mapping.status === "mapped" && mapping.code?.startsWith(chapter + ".")
        );
      })
    : paper.questions;
  return (
    <>
      <div className={styles.actions}>
        <button
          className={styles.button}
          aria-pressed={mode === "model"}
          onClick={() => {
            setMode("model");
            setChapter("");
          }}
        >
          Model paper
        </button>
        {past && (
          <button
            className={styles.button}
            aria-pressed={mode === "past"}
            onClick={() => {
              setMode("past");
              setChapter("");
            }}
          >
            Past paper
          </button>
        )}
        {chapters.size > 0 && (
          <select
            className={styles.button}
            aria-label="Chapter"
            value={chapter}
            onChange={(e) => setChapter(e.target.value)}
          >
            <option value="">All chapters</option>
            {[...chapters]
              .sort(([a], [b]) =>
                a.localeCompare(b, undefined, { numeric: true }),
              )
              .map(([number, name]) => (
                <option key={number} value={number}>
                  {number}. {name}
                </option>
              ))}
          </select>
        )}
      </div>
      <PaperViewerClient
        key={mode + chapter}
        paper={paper}
        questions={questions}
        allowQuiz={!chapter}
        hideHeader
        historical={mode === "past"}
      />
    </>
  );
}
