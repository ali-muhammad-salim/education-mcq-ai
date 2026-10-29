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
import {
  annualOriginalReference,
  annualCurrentMapping,
  annual2024OriginalReference,
  annual2024CurrentMapping,
  physics2025Resources,
  physics2024Resources,
  physicsX2025Resources,
  annualX2025OriginalReference,
  annualX2025CurrentMapping,
} from '@/lib/legacyPaperEvidence';
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

  const fallback = getFallbackPaper(cleanId);
  // The bundled 2025 SSC-II transcription has been checked against the original
  // PDFs. Prefer it over any older, unlinked legacy database transcription.
  if (fallback && /^PHY-X-2025-P[12]$/.test(fallback.paperCode) && paper && !paper.sourceDocumentId) {
    paper = fallback;
  }
  if (!paper) {
    if (fallback) {
      paper = fallback;
    } else {
      return notFound();
    }
  } else if (!paper.questions || paper.questions.length === 0) {
    if (fallback && fallback.questions && fallback.questions.length > 0) {
      paper = fallback;
    }
  } else if (fallback && fallback.questions?.length) {
    // Enrich DB questions with any newly reviewed SLO mappings & E-Marking metadata from the canonical bundle
    const fbMap = new Map(fallback.questions.map(fq => [String(fq.questionNumber), fq]));
    paper.questions = paper.questions.map((dbQ: any) => {
      const fbQ = fbMap.get(String(dbQ.questionNumber));
      if (!fbQ) return dbQ;
      return {
        ...dbQ,
        sourceRegion: {
          ...fbQ.sourceRegion,
          ...(typeof dbQ.sourceRegion === 'object' && dbQ.sourceRegion ? dbQ.sourceRegion : {}),
          current_syllabus_reviewed: fbQ.sourceRegion.current_syllabus_reviewed ?? true,
          syllabus_reviewed: fbQ.sourceRegion.syllabus_reviewed ?? true,
          mapping_scope: fbQ.sourceRegion.mapping_scope,
          current_mapping: fbQ.sourceRegion.current_mapping,
          current_slo: fbQ.sourceRegion.current_slo,
          slo: fbQ.sourceRegion.slo || (dbQ.sourceRegion as any)?.slo,
          original_slo_text: fbQ.sourceRegion.original_slo_text,
          original_reference_verified: fbQ.sourceRegion.original_reference_verified,
          original_reference_source: fbQ.sourceRegion.original_reference_source,
          better_response: fbQ.sourceRegion.better_response || (dbQ.sourceRegion as any)?.better_response,
          weaker_response: fbQ.sourceRegion.weaker_response || (dbQ.sourceRegion as any)?.weaker_response,
          better_response_image: fbQ.sourceRegion.better_response_image,
          weaker_response_image: fbQ.sourceRegion.weaker_response_image,
          suggestions: fbQ.sourceRegion.suggestions || (dbQ.sourceRegion as any)?.suggestions,
        },
      };
    });
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
      parseFloat(String(a.questionNumber || "").replace(/[^0-9.]/g, "")) || 0;
    const numB =
      parseFloat(String(b.questionNumber || "").replace(/[^0-9.]/g, "")) || 0;
    if (numA !== numB) return numA - numB;
    return String(a.questionNumber || "").localeCompare(String(b.questionNumber || ""));
  });

  const legacyAnnual2025 = !paper.sourceDocumentId && paper.paperCode === 'PHY-IX-2025-P1';
  const legacyAnnual2024 = !paper.sourceDocumentId && paper.paperCode === 'PHY-IX-2024-P1';
  const legacyX2025 = !paper.sourceDocumentId && paper.paperCode === 'PHY-X-2025-P1';
  const useReviewedLegacy = (legacyAnnual2025 || legacyAnnual2024) && !await publishedCurriculum('AKU-EB',9,'Physics');
  const useReviewedX = legacyX2025 && !await publishedCurriculum('AKU-EB',10,'Physics');
  const resources = await paperResources(paper.sourceDocumentId);
  const answerDecisions = legacyAnnual2025 ? await publishedAnswerDecisions() : [];
  const displayQuestions = sortedQuestions.map(q => {
    if (legacyAnnual2025) {
      return presentPaperQuestion({
        ...q,
        sourceRegion: applyAnswerDecision(
          {
            ...q.sourceRegion,
            ...annualOriginalReference(q.questionNumber),
            ...(useReviewedLegacy ? annualCurrentMapping(q.questionNumber, q.questionText) : {}),
          },
          q.questionNumber,
          q.questionText,
          q.sourceRegion?.choices || {},
          answerDecisions
        ),
      });
    }
    if (legacyAnnual2024) {
      return presentPaperQuestion({
        ...q,
        sourceRegion: {
          ...q.sourceRegion,
          ...annual2024OriginalReference(q.questionNumber),
          ...(useReviewedLegacy ? annual2024CurrentMapping(q.questionNumber, q.questionText) : {}),
        },
      });
    }
    if (legacyX2025) {
      return presentPaperQuestion({
        ...q,
        sourceRegion: {
          ...q.sourceRegion,
          ...annualX2025OriginalReference(q.questionNumber),
          ...(useReviewedX ? annualX2025CurrentMapping(q.questionNumber, q.questionText) : {}),
        },
      });
    }
    return presentPaperQuestion(q);
  });
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
      {!paper.sourceDocumentId && /^PHY-IX-2025-P[12]$/.test(paper.paperCode||'') && <nav className={styles.actions} aria-label="Paper resources">{physics2025Resources.filter(item=>item.year===2025).map(item=><Link className={styles.button} key={item.href} href={item.href}>{item.label}</Link>)}<Link className={styles.button} href="/past-papers/PHY-IX-2025-P1?view=solved">Paper 1 · answers & explanations</Link><Link className={styles.button} href="/past-papers/PHY-IX-2025-P2">Paper 2 (CRQ & ERQ)</Link></nav>}
      {!paper.sourceDocumentId && /^PHY-IX-2024-P[12]$/.test(paper.paperCode||'') && <nav className={styles.actions} aria-label="Paper resources">{physics2024Resources.map(item=><Link className={styles.button} key={item.href} href={item.href}>{item.label}</Link>)}<Link className={styles.button} href="/past-papers/PHY-IX-2024-P1?view=solved">Paper 1 · answers & explanations</Link><Link className={styles.button} href="/past-papers/PHY-IX-2024-P2">Paper 2 (CRQ & ERQ)</Link></nav>}
      {!paper.sourceDocumentId && /^PHY-X-2025-P[12]$/.test(paper.paperCode||'') && <nav className={styles.actions} aria-label="Paper resources">{physicsX2025Resources.map(item=><Link className={styles.button} key={item.href} href={item.href}>{item.label}</Link>)}<Link className={styles.button} href="/past-papers/PHY-X-2025-P1?view=solved">Paper 1 · answers & explanations</Link><Link className={styles.button} href="/past-papers/PHY-X-2025-P2">Paper 2 (CRQ & ERQ)</Link></nav>}
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
