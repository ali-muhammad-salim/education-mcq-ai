import { notFound } from "next/navigation";
import { studyScope } from "@/services/study/navigation";
import { getFallbackPaper } from "@/lib/paperDataService";
import prisma from "@/lib/prisma";
import { presentPaperQuestion } from "@/lib/paperPresentation";
import Breadcrumbs from "@/components/Breadcrumbs";
import DocumentViews from "@/components/DocumentViews";
import PaperViewerClient from "@/components/PaperViewerClient";
import styles from "@/components/MaterialLayout.module.css";
export const dynamic = "force-dynamic";
export default async function Page({
  params,
}: {
  params: Promise<{
    board: string;
    class: string;
    subject: string;
    paper: string;
  }>;
}) {
  const raw = await params,
    scope = studyScope(raw.board, raw.class, raw.subject);
  if (!scope) notFound();
  const part = raw.paper
    .toUpperCase()
    .replace(/^PAPER-?/, "P")
    .replace(/^([123])$/, "P$1");
  if (!["P1", "P2", "P3"].includes(part)) notFound();
  const legacy =
    scope.board.id === "akueb" &&
    scope.meta.slug === "physics" &&
    [9, 10].includes(scope.classDef.level);
  const code = "PHY-" + scope.classDef.roman + "-" + part;
  const fallback = legacy ? getFallbackPaper(code) : null;
  const stored = legacy
    ? await prisma.pastPaper.findFirst({
        where: {
          paperCode: code,
          academicClass: {
            level: scope.classDef.level,
            programme: {
              board: {
                shortCode: {
                  equals: scope.board.shortCode,
                  mode: "insensitive",
                },
              },
            },
          },
          subject: { name: { equals: scope.meta.title, mode: "insensitive" } },
        },
        include: {
          academicClass: true,
          subject: true,
          questions: {
            include: {
              topics: { include: { topic: true } },
              slos: { include: { slo: true } },
            },
          },
        },
      })
    : null;
  const paper = stored?.questions.length
    ? {
        ...stored,
        paperCode: stored.paperCode || code,
        fileUrl: stored.fileUrl || fallback?.fileUrl || undefined,
        boardCode: scope.board.shortCode,
      }
    : fallback;
  const questions = paper
    ? [...paper.questions]
        .sort((a, b) =>
          String(a.questionNumber).localeCompare(
            String(b.questionNumber),
            undefined,
            { numeric: true },
          ),
        )
        .map(presentPaperQuestion)
    : [];
  const practical =
    legacy && scope.classDef.level === 9 && part === "P3"
      ? "/materials/ssc/physics/ssc-1/ssc-i-physics-sample-practical.pdf"
      : undefined;
  return (
    <section className={styles.page}>
      <Breadcrumbs
        items={[
          { label: scope.board.name, href: "/" + scope.board.id },
          {
            label: scope.classDef.name,
            href: "/" + scope.board.id + "/" + scope.classDef.roman,
          },
          { label: scope.meta.title, href: scope.baseUrl },
          { label: "Model papers", href: scope.baseUrl + "/model-papers" },
          { label: part, active: true },
        ]}
      />
      <h1>
        {part === "P3" ? "Practical paper" : "Model paper " + part.slice(1)}
      </h1>
      {paper ? (
        <PaperViewerClient paper={paper} questions={questions} hideHeader />
      ) : practical ? (
        <DocumentViews original={practical} title="Practical paper" />
      ) : (
        <p className={styles.muted}>Coming soon</p>
      )}
    </section>
  );
}
