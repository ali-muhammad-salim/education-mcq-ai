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
import {publicMaterialWhere} from '@/lib/materialVisibility';
import { annualOriginalReference, annualCurrentMapping, physics2025Resources } from '@/lib/legacyPaperEvidence';
import { publishedCurriculum } from '@/services/materials/curriculum';
import { paperResources } from '@/services/materials/references';
import { publishedAnswerDecisions } from '@/services/materials/legacy-answer-review';
import { applyAnswerDecision } from '@/lib/legacyAnswerReview';

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
      where: {AND:[{OR: [{ id: cleanId }, { paperCode: cleanId }]},{OR:[{sourceDocumentId:null},{sourceDocument:publicMaterialWhere}]}]},
      include: {
        academicClass: { include: { programme: { include: { board: true } } } },
        subject: true,
        sourceDocument:{select:{catalogMetadata:true}},
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

  if(paper.sourceDocumentId&&paper.sourceDocument?.catalogMetadata?.compiledPaperId!==paper.id)return notFound();

  // Sort questions numerically
  if(paper.sourceDocumentId){
    const active=await prisma.syllabusVersion.findMany({where:{subjectId:paper.subjectId,isLatest:true,OR:[{sourceDocumentId:null},{sourceDocument:publicMaterialWhere}]},select:{id:true}});
    const allowed=new Set(active.map(v=>v.id));
    paper.questions=paper.questions.map((q:any)=>({...q,sourceRegion:{...q.sourceRegion,current_syllabus_reviewed:allowed.has(q.sourceRegion?.current_syllabus_version)}}));
  }
  const sortedQuestions = [...(paper.questions || [])].sort((a, b) => {
    const numA =
      parseInt(String(a.questionNumber || "").replace(/\D/g, "")) || 0;
    const numB =
      parseInt(String(b.questionNumber || "").replace(/\D/g, "")) || 0;
    return numA - numB;
  });

  const legacyAnnual = !paper.sourceDocumentId && paper.paperCode==='PHY-IX-2025-P1';
  const useReviewedLegacy = legacyAnnual && !await publishedCurriculum('AKU-EB',9,'Physics');
  const resources = await paperResources(paper.sourceDocumentId);
  const answerDecisions=legacyAnnual?await publishedAnswerDecisions():[];
  const displayQuestions = sortedQuestions.map(q=>presentPaperQuestion(legacyAnnual?{...q,sourceRegion:applyAnswerDecision({...q.sourceRegion,...annualOriginalReference(q.questionNumber),...(useReviewedLegacy?annualCurrentMapping(q.questionNumber,q.questionText):{})},q.questionNumber,q.questionText,q.sourceRegion?.choices||{},answerDecisions)}:q));
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
      {resources.length>0 && <nav className={styles.actions} aria-label="Paper resources">{resources.map(item=><Link className={styles.button} key={item.href} href={item.href}>{item.label}</Link>)}</nav>}
      {!paper.sourceDocumentId && /^PHY-IX-2025-P[12]$/.test(paper.paperCode||'') && <nav className={styles.actions} aria-label="Paper resources">{physics2025Resources.map(item=><Link className={styles.button} key={item.href} href={item.href}>{item.label}</Link>)}<Link className={styles.button} href="/past-papers/PHY-IX-2025-P1?view=solved">Paper 1 · answers & explanations</Link></nav>}
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
