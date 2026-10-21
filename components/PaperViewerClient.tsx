"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import DocumentViews from "./DocumentViews";
import TakeQuizModal from "./TakeQuizModal";
import MathText from "./MathText";
import StructuredContent from "./StructuredContent";
import { questionSyllabus } from "@/lib/questionSyllabus";
import {
  paperMetadata,
  paperChoices,
  paperAnswer,
  safePaperOriginal,
} from "@/lib/paperPresentation";
import { resolveQuestionDiagram } from "@/lib/diagramResolver";
import styles from "./MaterialLayout.module.css";
type Question = {
  id: string;
  questionNumber: string;
  questionText: string;
  questionType: string;
  marks?: number;
  difficulty?: string;
  sourceRegion?: any;
  diagramBased?: boolean;
  topics?: { topic: { name: string; topicNumber?: string } }[];
  slos?: { slo: { code?: string; description: string } }[];
};
type Paper = {
  id: string;
  title: string;
  paperCode?: string;
  examYear: number;
  fileUrl?: string;
  subjectId?: string;
  boardCode?: string;
  academicClass?: { name: string; level: number };
  subject?: { id?: string; name: string };
};
export default function PaperViewerClient({
  paper,
  questions,
  backUrl,
  hideHeader = false,
  pdfUrl,
  allowQuiz = true,
  historical = false,
}: {
  paper: Paper;
  questions: Question[];
  backUrl?: string;
  hideHeader?: boolean;
  pdfUrl?: string;
  allowQuiz?: boolean;
  historical?: boolean;
}) {
  const [answers, setAnswers] = useState<Record<string, string>>({}),
    [checked, setChecked] = useState<Record<string, boolean>>({}),
    [showAnswers, setShowAnswers] = useState(false),
    [practice, setPractice] = useState(false),
    [quiz, setQuiz] = useState(false),
    [initialView, setInitialView] = useState<"digital" | "original">(
      questions.length ? "digital" : "original",
    );
  useEffect(() => {
    const q = new URLSearchParams(location.search),
      view = q.get("view");
    if (view === "original" || view === "original_pdf")
      setInitialView("original");
    if (view === "answer_key" || view === "emarking_notes")
      setShowAnswers(true);
    if (
      q.get("quiz") === "1" ||
      q.get("take") === "true" ||
      location.hash === "#quiz"
    )
      setQuiz(true);
  }, []);
  const scored = questions.filter((question) => checked[question.id]);
  const correct = scored.filter((question) => {
    const meta = paperMetadata(question.sourceRegion);
    return (
      answers[question.id] ===
      paperAnswer(
        meta,
        paperChoices(
          meta.choices ||
            meta.options ||
            (question as any).options ||
            (question as any).choices,
        ),
      )
    );
  }).length;
  const original = safePaperOriginal(paper.paperCode, paper.fileUrl || pdfUrl);
  return (
    <div>
      {!hideHeader && (
        <header>
          {backUrl && <Link href={backUrl}>← Back</Link>}
          <h1>{paper.title}</h1>
        </header>
      )}
      <DocumentViews
        title={paper.title}
        original={original}
        initialView={initialView}
      >
        {questions.length ? (
          <div className={styles.digital}>
            <div className={styles.actions}>
              <button
                className={styles.button}
                aria-pressed={showAnswers}
                onClick={() => setShowAnswers((value) => !value)}
              >
                {showAnswers ? "Hide answers" : "Show answers"}
              </button>
              <button
                className={styles.button}
                aria-pressed={practice}
                onClick={() => setPractice((value) => !value)}
              >
                Practise
              </button>
              {allowQuiz && paper.paperCode && (
                <button className={styles.button} onClick={() => setQuiz(true)}>
                  Take quiz
                </button>
              )}
            </div>
            {questions.map((question, index) => {
              const meta = paperMetadata(question.sourceRegion),
                choices = paperChoices(
                  meta.choices ||
                    meta.options ||
                    (question as any).options ||
                    (question as any).choices,
                ),
                key = paperAnswer(meta, choices);
              const mapping = questionSyllabus(
                meta,
                question.slos,
                paper.academicClass?.level || 9,
                paper.subject?.name || "Physics",
                paper.boardCode || "AKU-EB",
                historical,
              );
              const image = resolveQuestionDiagram(
                paper.paperCode,
                question.questionNumber,
                question,
              );
              const visible = showAnswers || checked[question.id];
              const explanation =
                typeof meta.explanation === "string" ? meta.explanation : "";
              const response =
                typeof meta.model_answer === "string"
                  ? meta.model_answer
                  : typeof meta.better_response === "string"
                    ? meta.better_response
                    : "";
              return (
                <article className={styles.question} key={question.id}>
                  <div
                    style={{
                      display: "flex",
                      gap: ".6rem",
                      alignItems: "baseline",
                    }}
                  >
                    <strong style={{ flexShrink: 0, whiteSpace: "nowrap" }}>
                      {question.questionNumber || index + 1}.
                    </strong>
                    <StructuredContent text={question.questionText} />
                    {question.marks !== undefined && (
                      <small
                        className={styles.muted}
                        style={{ marginLeft: "auto", whiteSpace: "nowrap" }}
                      >
                        {question.marks} mark{question.marks === 1 ? "" : "s"}
                      </small>
                    )}
                  </div>
                  {image && (
                    <img
                      src={image}
                      alt={"Diagram for question " + question.questionNumber}
                      loading="lazy"
                      style={{
                        maxWidth: "min(100%,340px)",
                        height: "auto",
                        display: "block",
                        margin: ".8rem 0",
                      }}
                    />
                  )}
                  {historical && mapping.originalCode && (
                    <small className={styles.muted} style={{display:'block'}}>
                      Original reference
                      {paper.examYear ? " (" + paper.examYear + ")" : ""}: SLO{" "}
                      {mapping.originalCode} · unverified
                    </small>
                  )}
                  {mapping.status === "mapped" ? (
                    <Link
                      className={styles.sloLink}
                      href={mapping.href!}
                      title={mapping.description}
                    >
                      {historical ? "Current syllabus: " : ""}SLO {mapping.code}
                    </Link>
                  ) : (
                    <small className={styles.muted} style={{display:'block'}}>
                      {mapping.status === "outside"
                        ? "Outside syllabus (reviewed)"
                        : historical
                          ? "Current syllabus: Mapping pending"
                          : "Mapping pending"}
                    </small>
                  )}
                  {Object.keys(choices).length > 0 && (
                    <fieldset className={styles.options}>
                      <legend className={styles.srOnly}>
                        Answers for question {question.questionNumber}
                      </legend>
                      {Object.entries(choices).map(([option, text]) => (
                        <label className={styles.option} key={option}>
                          {practice ? (
                            <input
                              type="radio"
                              name={"q-" + question.id}
                              checked={answers[question.id] === option}
                              disabled={checked[question.id]}
                              onChange={() =>
                                setAnswers((old) => ({
                                  ...old,
                                  [question.id]: option,
                                }))
                              }
                            />
                          ) : null}
                          <strong>{option}.</strong>
                          <MathText text={text} />
                        </label>
                      ))}
                    </fieldset>
                  )}
                  {practice && Object.keys(choices).length > 0 && (
                    <div className={styles.actions}>
                      <button
                        className={styles.button}
                        disabled={
                          !answers[question.id] || checked[question.id] || !key
                        }
                        onClick={() =>
                          setChecked((old) => ({ ...old, [question.id]: true }))
                        }
                      >
                        Check answer
                      </button>
                      {checked[question.id] && (
                        <span role="status">
                          {answers[question.id] === key
                            ? "Correct"
                            : "Incorrect"}
                        </span>
                      )}
                      {!key && (
                        <small className={styles.muted}>
                          Answer unavailable
                        </small>
                      )}
                    </div>
                  )}
                  {(key ||
                    response ||
                    explanation ||
                    Array.isArray(meta.rubric)) && (
                    <details key={String(visible)} open={visible}>
                      <summary
                        style={{
                          cursor: "pointer",
                          padding: ".6rem 0",
                          minHeight: "44px",
                          boxSizing: "border-box",
                        }}
                      >
                        Answer & explanation
                      </summary>
                      {key && (
                        <p>
                          <strong>{key}. </strong>
                          <MathText text={choices[key]} />
                        </p>
                      )}
                      {explanation && (
                        <p>
                          <MathText text={explanation} />
                        </p>
                      )}
                      {response && response !== explanation && (
                        <p>
                          <MathText text={response} />
                        </p>
                      )}
                      {Array.isArray(meta.rubric) && (
                        <ul>
                          {meta.rubric.map((point: any, i: number) => {
                            const text =
                              typeof point === "string"
                                ? point
                                : point.description ||
                                  point.point ||
                                  point.text;
                            return typeof text === "string" ? (
                              <li key={i}>
                                <MathText text={text} />
                                {typeof point.marks === "number"
                                  ? " (" + point.marks + " marks)"
                                  : ""}
                              </li>
                            ) : null;
                          })}
                        </ul>
                      )}
                    </details>
                  )}
                </article>
              );
            })}
            {practice && (
              <div className={styles.actions} role="status">
                <strong>
                  Practice score: {correct} / {scored.length} checked
                </strong>
                <button
                  className={styles.button}
                  onClick={() => {
                    setAnswers({});
                    setChecked({});
                  }}
                >
                  Reset practice
                </button>
              </div>
            )}
          </div>
        ) : undefined}
      </DocumentViews>
      {allowQuiz && paper.paperCode && questions.length > 0 && (
        <TakeQuizModal
          isOpen={quiz}
          onClose={() => setQuiz(false)}
          paperTitle={paper.title}
          paperCode={paper.paperCode}
          questions={questions}
        />
      )}
    </div>
  );
}
