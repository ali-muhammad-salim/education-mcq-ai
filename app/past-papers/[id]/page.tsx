import React, { Suspense } from "react";
import Breadcrumbs from "@/components/Breadcrumbs";
import { presentPaperQuestion, paperLabel } from "@/lib/paperPresentation";
import styles from "@/components/MaterialLayout.module.css";
import { studyScope } from "@/services/study/navigation";
import prisma from "@/lib/prisma";
import Link from "next/link";
import { notFound } from "next/navigation";
import PaperViewerClient from "./PaperViewerClient";
import { getFallbackPaper } from "@/lib/paperDataService";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function PastPaperDetailPage({ params }: PageProps) {
  const resolvedParams = await Promise.resolve(params);
  const rawId = resolvedParams.id;
  const cleanId = (rawId || "").replace(/\.html?$/i, "").trim();

  // Search by UUID or by paperCode
  let paper: any = null;
  try {
    paper = await prisma.pastPaper.findFirst({
      where: {
        OR: [{ id: cleanId }, { paperCode: cleanId }],
      },
      include: {
        academicClass: { include: { programme: { include: { board: true } } } },
        subject: true,
        questions: {
          include: {
            topics: { include: { topic: true } },
            slos: { include: { slo: true } },
          },
        },
      },
    });
  } catch (err) {
    console.error("Error fetching past paper detail:", err);
  }

  if (!paper) {
    const fallback = getFallbackPaper(cleanId);
    if (fallback) {
      paper = fallback;
    } else {
      return notFound();
    }
  } else if (!paper.questions || paper.questions.length === 0) {
    const fallback = getFallbackPaper(cleanId);
    if (fallback && fallback.questions && fallback.questions.length > 0) {
      paper = fallback;
    }
  }

  // Sort questions numerically
  const sortedQuestions = [...(paper.questions || [])].sort((a, b) => {
    const numA =
      parseInt(String(a.questionNumber || "").replace(/\D/g, "")) || 0;
    const numB =
      parseInt(String(b.questionNumber || "").replace(/\D/g, "")) || 0;
    return numA - numB;
  });

  const displayQuestions = sortedQuestions.map(presentPaperQuestion);
  const isGrade9 =
    paper.academicClass?.level === 9 ||
    paper.academicClass?.name?.includes("IX");
  const gradeLabel = isGrade9 ? "SSC-I" : "SSC-II";
  const subjectName = paper.subject?.name || "Physics";

  const scope = studyScope(
    paper.academicClass?.programme?.board?.shortCode || "AKU-EB",
    String(paper.academicClass?.level || 9),
    subjectName,
  );
  paper.boardCode =
    paper.academicClass?.programme?.board?.shortCode || "AKU-EB";
  return (
    <section className={styles.page}>
      <Breadcrumbs
        items={[
          {
            label: scope?.board.name || "Board",
            href: scope ? "/" + scope.board.id : "/",
          },
          {
            label: scope?.classDef.name || gradeLabel,
            href: scope
              ? "/" + scope.board.id + "/" + scope.classDef.roman
              : "/",
          },
          { label: subjectName, href: scope?.baseUrl || "/" },
          {
            label: "Past papers",
            href: scope ? scope.baseUrl + "/pastpapers" : "/past-papers",
          },
          { label: paper.paperCode || paper.title, active: true },
        ]}
      />
      <h1 title={paper.title}>{paperLabel(paper.paperCode, paper.title)}</h1>
      <Suspense fallback={<p>Loading paper…</p>}>
        <PaperViewerClient
          paper={paper}
          questions={displayQuestions}
          hideHeader
          historical
        />
      </Suspense>
    </section>
  );
}
