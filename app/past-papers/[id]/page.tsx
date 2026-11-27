import { hsscComputerScience2019Resources } from '@/lib/hsscComputerScience2019';
import { hsscComputerScience2021Resources } from '@/lib/hsscComputerScience2021';
import { hsscComputerScience2023Resources } from '@/lib/hsscComputerScience2023';
import React, { Suspense } from "react";
import Breadcrumbs from "@/components/Breadcrumbs";
import { presentPaperQuestion, paperLabel } from "@/lib/paperPresentation";
import styles from "@/components/MaterialLayout.module.css";
import { studyScope } from "@/services/study/navigation";
import prisma from "@/lib/prisma";
import Link from "next/link";
import { notFound } from "next/navigation";
import PaperViewerClient from "./PaperViewerClient";
import PaperResourceNav from "@/components/PaperResourceNav";
import { combinedChemistryXArchives, getFallbackPaper } from "@/lib/paperDataService";
import { physicsIx2026Tabs } from '@/lib/physicsIx2026Papers';
import { physicsX2017Tabs } from '@/lib/physicsX2017Papers';
import { physicsX2018Tabs } from '@/lib/physicsX2018Papers';
import { physicsX2019Tabs } from '@/lib/physicsX2019Papers';
import { physicsX2021Tabs } from '@/lib/physicsX2021Paper';
import { physicsX2022Tabs } from '@/lib/physicsX2022Paper';
import { physicsX2023Tabs } from '@/lib/physicsX2023Papers';
import { physicsX2024Tabs } from '@/lib/physicsX2024Papers';
import { physicsX2026Tabs } from '@/lib/physicsX2026Papers';
import { chemistryX2026Tabs } from '@/lib/chemistryX2026';
import { chemistryIx2026Tabs } from '@/lib/chemistryIx2026';
import { chemistryX2019Tabs } from '@/lib/chemistryX2019';
import { chemistryX2018Tabs } from '@/lib/chemistryX2018';
import { chemistryX2017Tabs } from '@/lib/chemistryX2017';
import { physicsIx2023Tabs } from '@/lib/physicsIx2023Papers';
import { physicsIx2019Tabs } from '@/lib/physicsIx2019Papers';
import { physicsIx2018Tabs } from '@/lib/physicsIx2018Papers';
import { physicsIx2017Tabs } from '@/lib/physicsIx2017Papers';
import { physicsIx2022Tabs } from '@/lib/physicsIx2022Paper';
import { physicsIx2021Tabs } from '@/lib/physicsIx2021Paper';
import { mathematicsPaperManifests } from '@/lib/mathematicsPapers';
import { mathematicsIx2026Tabs } from '@/lib/mathematicsIx2026';
import { mathematicsX2026Tabs } from '@/lib/mathematicsX2026';
import { mathematicsXModelTabs } from '@/lib/mathematicsXModel';
import {publicMaterialWhere} from '@/lib/materialVisibility';
import {
  annualOriginalReference,
  annualCurrentMapping,
  annual2024OriginalReference,
  annual2024CurrentMapping,
  physicsIx2024PaperTabs,
  physicsIx2025PaperTabs,
} from '@/lib/legacyPaperEvidence';
import { publishedCurriculum } from '@/services/materials/curriculum';
import { mathematicsStoreUnavailable } from '@/services/materials/mathematicsAvailability';
import { paperResources } from '@/services/materials/references';
import { publishedAnswerDecisions } from '@/services/materials/legacy-answer-review';
import { applyAnswerDecision } from '@/lib/legacyAnswerReview';
import { hsscComputerScience2024Resources } from '@/lib/hsscComputerScience2024';
import { hsscComputerScienceResources } from '@/lib/hsscComputerScienceResources';
import { hsscXiAnnualResources } from '@/lib/hsscXiAnnualPhysics';
import { computerScienceXi2025Resources } from '@/lib/hsscXiAnnualComputerScience';
import { biologyXiAnnualArchives } from '@/lib/hsscXiAnnualBiology';
import { biologyIx2026Tabs } from '@/lib/biologyIx2026';
import { biologyIx2021Tabs } from '@/lib/biologyIx2021';
import { biologyIxAnnualArchives } from '@/lib/biologyPapers';
import { biology2022Archive, biology2024Archive, biologyX2017Archive, biologyX2018Archive, biologyX2019Archive, biologyX2021Archive, biologyX2022Archive, biologyX2023Archive, biologyX2024Archive, biologyX2025Archive } from '@/lib/biology2024Resources';

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function PastPaperDetailPage({ params }: PageProps) {
  const resolvedParams = await Promise.resolve(params);
  const rawId = resolvedParams.id;
  const cleanId = (rawId || "").replace(/\.html?$/i, "").trim();
  const bundledPaper = getFallbackPaper(cleanId);

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
    if (!bundledPaper || !mathematicsStoreUnavailable(err)) {
      console.error("Error fetching past paper detail:", err);
    }
  }

  const fallback = paper?.paperCode ? getFallbackPaper(paper.paperCode) : bundledPaper;
  const biologyIx2026 = /^BIO-IX-2026-P[12]$/.test(fallback?.paperCode || '');
  const biologyIx2021 = fallback?.paperCode === 'BIO-IX-2021-P1';
  const biologyIxArchive = biologyIxAnnualArchives.find(archive => archive.papers.some(entry => entry.paperCode === fallback?.paperCode))?.tabs;
  const chemistryModel = /^CHM-(IX|X)-P[12]$/.test(fallback?.paperCode || '');
  const mathematics2026Tabs = [mathematicsIx2026Tabs, mathematicsX2026Tabs]
    .find(tabs => tabs.some(tab => tab.href === '/past-papers/' + fallback?.paperCode));
  const mathematicsXModel = /^MTH-X-P[12]$/.test(fallback?.paperCode || '');
  const chemistry2026Tabs = [chemistryIx2026Tabs, chemistryX2026Tabs]
    .find(tabs => tabs.some(tab => tab.href === '/past-papers/' + fallback?.paperCode));
  const earlyChemistryTabs = [chemistryX2017Tabs, chemistryX2018Tabs, chemistryX2019Tabs]
    .find(tabs => tabs.some(tab => tab.href === '/past-papers/' + fallback?.paperCode));
  const combinedChemistry = combinedChemistryXArchives.find(archive => archive.paper.paperCode === fallback?.paperCode);
  const xiBiologyArchive = biologyXiAnnualArchives.find(archive => archive.papers.some(item => item.paperCode === fallback?.paperCode));
  const physics2026Tabs = [physicsIx2026Tabs, physicsX2026Tabs]
    .find(tabs => tabs.some(tab => tab.href === '/past-papers/' + fallback?.paperCode));
  const physicsTabs = /^PHY-IX-2017-P[12]$/.test(fallback?.paperCode || '') ? physicsIx2017Tabs
    : /^PHY-IX-2018-P[12]$/.test(fallback?.paperCode || '') ? physicsIx2018Tabs
    : /^PHY-IX-2019-P[12]$/.test(fallback?.paperCode || '') ? physicsIx2019Tabs
    : /^PHY-IX-2023-P[12]$/.test(fallback?.paperCode || '') ? physicsIx2023Tabs
    : /^PHY-X-2024-P[12]$/.test(fallback?.paperCode || '') ? physicsX2024Tabs
    : /^PHY-X-2023-P[12]$/.test(fallback?.paperCode || '') ? physicsX2023Tabs
    : /^PHY-X-2019-P[12]$/.test(fallback?.paperCode || '') ? physicsX2019Tabs
    : /^PHY-X-2018-P[12]$/.test(fallback?.paperCode || '') ? physicsX2018Tabs
    : /^PHY-X-2017-P[12]$/.test(fallback?.paperCode || '') ? physicsX2017Tabs : undefined;
  const combinedPhysicsTabs = fallback?.paperCode === 'PHY-IX-2021-P1' ? physicsIx2021Tabs
    : fallback?.paperCode === 'PHY-IX-2022-P1' ? physicsIx2022Tabs
    : fallback?.paperCode === 'PHY-X-2022-P1' ? physicsX2022Tabs
    : fallback?.paperCode === 'PHY-X-2021-P1' ? physicsX2021Tabs : undefined;
  if (fallback && (chemistryModel || mathematicsXModel || mathematics2026Tabs || chemistry2026Tabs || earlyChemistryTabs || combinedChemistry || biologyIx2026 || biologyIx2021 || biologyIxArchive || xiBiologyArchive || physics2026Tabs || physicsTabs || combinedPhysicsTabs) && !paper?.sourceDocumentId) {
    paper = fallback;
  } else if (!paper) {
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
    paper.totalMarks = fallback.totalMarks;
    paper.durationMinutes = fallback.durationMinutes;
    paper.rubricInstruction = fallback.rubricInstruction;
    paper.markScalingNote = fallback.markScalingNote;
    const fbMap = new Map(fallback.questions.map(fq => [String(fq.questionNumber), fq]));
    paper.questions = paper.questions.map((dbQ: any) => {
      const fbQ = fbMap.get(String(dbQ.questionNumber));
      if (!fbQ) return dbQ;
      const sscComputer = /^CS-(?:IX|X)-(?:\d{4}-)?P[12]$/.test(fallback.paperCode);
      const useBundledMcq = sscComputer && !paper.sourceDocumentId && fallback.paperCode.endsWith('-P1');
      const useBundledMathReview = !paper.sourceDocumentId && fallback.paperCode === 'MTH-X-2024-P1' && ['31', '32'].includes(String(fbQ.questionNumber));
      return {
        ...dbQ,
        ...(useBundledMcq ? { questionText: fbQ.questionText } : {}),
        sourceRegion: {
          ...fbQ.sourceRegion,
          ...(typeof dbQ.sourceRegion === 'object' && dbQ.sourceRegion ? dbQ.sourceRegion : {}),
          ...(useBundledMcq || useBundledMathReview ? fbQ.sourceRegion : {}),
          current_syllabus_reviewed: fbQ.sourceRegion.current_syllabus_reviewed ?? true,
          syllabus_reviewed: fbQ.sourceRegion.syllabus_reviewed ?? true,
          mapping_scope: fbQ.sourceRegion.mapping_scope,
          current_mapping: fbQ.sourceRegion.current_mapping,
          current_slo: fbQ.sourceRegion.current_slo,
          ...(sscComputer ? {
            in_syllabus: fbQ.sourceRegion.in_syllabus,
            out_of_syllabus: fbQ.sourceRegion.out_of_syllabus,
            mapping_reason: fbQ.sourceRegion.mapping_reason,
          } : {}),
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
  const useReviewedLegacy = (legacyAnnual2025 || legacyAnnual2024) && !await publishedCurriculum('AKU-EB',9,'Physics');
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
  const mathematicsManifest = /^MTH-IX-20\d{2}-P[12]$/.test(paper.paperCode || '') ? mathematicsPaperManifests[paper.examYear] : undefined;
  const hsscModel = /^(?:PHY|CS)-XII?-P[12]$/.test(paper.paperCode || '');
  const csAnnual = /^CS-XI-2019-P[12]$/.test(paper.paperCode || '') ? hsscComputerScience2019Resources : paper.paperCode === 'CS-XI-2021-P1' ? hsscComputerScience2021Resources : /^CS-XI-2023-P[12]$/.test(paper.paperCode || '') ? hsscComputerScience2023Resources : /^CS-XI-2024-P[12]$/.test(paper.paperCode || '') ? hsscComputerScience2024Resources : null;
  const csResources = /^CS-XII?-P[12]$/.test(paper.paperCode || '') ? hsscComputerScienceResources('akueb', paper.academicClass.level, 'computer-science') : null;
  const biologyModel = /^BIO-(?:IX|X)-MODEL-20\d{2}-P[12]$/.test(paper.paperCode || '');
  const isModelPaper = paper.examType === 'MODEL_EXAM' || fallback?.examType === 'MODEL_EXAM' || hsscModel || biologyModel;
  const biology2024 = /^BIO-IX-2024-P[12]$/.test(paper.paperCode || '');
  const biologyXArchive = /^BIO-X-2017-P[12]$/.test(paper.paperCode || '') ? biologyX2017Archive
    : /^BIO-X-2018-P[12]$/.test(paper.paperCode || '') ? biologyX2018Archive
    : /^BIO-X-2019-P[12]$/.test(paper.paperCode || '') ? biologyX2019Archive
    : /^BIO-X-2023-P[12]$/.test(paper.paperCode || '') ? biologyX2023Archive
    : /^BIO-X-2024-P[12]$/.test(paper.paperCode || '') ? biologyX2024Archive
    : /^BIO-X-2025-P[12]$/.test(paper.paperCode || '') ? biologyX2025Archive : null;
  const biology2022 = /^BIO-(?:IX|X)-2022-P1$/.test(paper.paperCode || '');
  const biology2021 = /^BIO-(?:IX|X)-2021-P1$/.test(paper.paperCode || '');
  if (biology2022 || biology2021) {
    paper.totalMarks = 50;
    paper.durationMinutes = 100;
  }
  if (biologyModel || biology2024 || biologyXArchive) {
    const written = paper.paperCode.endsWith('-P2');
    if (paper.paperCode === 'BIO-X-2017-P1') {
      paper.totalMarks = 25;
      paper.durationMinutes = 35;
    } else if (paper.paperCode === 'BIO-X-2017-P2') {
      paper.totalMarks = 40;
      paper.durationMinutes = 145;
      paper.rubricInstruction = 'Answer all eight questions. For each of Questions 7 and 8, attempt one alternative only.';
    } else if (paper.paperCode === 'BIO-X-2018-P1') {
      paper.totalMarks = 25;
      paper.durationMinutes = 35;
    } else if (paper.paperCode === 'BIO-X-2018-P2') {
      paper.totalMarks = 40;
      paper.durationMinutes = 145;
      paper.rubricInstruction = 'Answer all eight questions. For each of Questions 7 and 8, attempt one alternative only.';
    } else if (paper.paperCode === 'BIO-X-2019-P1') {
      paper.totalMarks = 25;
      paper.durationMinutes = 40;
    } else if (paper.paperCode === 'BIO-X-2019-P2') {
      paper.totalMarks = 40;
      paper.durationMinutes = 140;
      paper.rubricInstruction = 'Answer all eight questions. For each of Questions 7 and 8, attempt one alternative only.';
    } else {
      paper.totalMarks = written ? 25 : 40;
      paper.durationMinutes = written ? 110 : 70;
      if (written) paper.rubricInstruction = biology2024
        ? 'Answer all seven questions. For each of Questions 6 and 7, attempt one alternative only.'
        : biologyXArchive ? 'Answer all six questions. For each of Questions 5 and 6, attempt one alternative only.'
        : `Answer all ${isGrade9 ? 'eight' : 'seven'} questions. For each of Questions ${isGrade9 ? '7 and 8' : '6 and 7'}, attempt one alternative only.`;
    }
  }
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
            label: isModelPaper ? "Model papers" : "Past papers",
            href: (scope?.baseUrl || '') + (isModelPaper ? "/model-papers" : scope ? "/pastpapers" : "/past-papers"),
          },
          { label: paper.paperCode || paper.title, active: true },
        ]}
      />
      <h1 title={paper.title}>{paperLabel(paper.paperCode, paper.title)}</h1>
      {resources.length>0 && <nav className={styles.actions} aria-label="Paper resources">{resources.map(item=><Link className={styles.button} key={item.href} href={item.href}>{item.label}</Link>)}</nav>}
      {mathematicsManifest && !mathematics2026Tabs && <PaperResourceNav tabs={[
        { label: 'Digital Paper I', href: `/past-papers/MTH-IX-${paper.examYear}-P1` },
        ...(mathematicsManifest.sources.p2 ? [{ label: 'Digital Paper II and worked solutions', href: `/past-papers/MTH-IX-${paper.examYear}-P2` }] : []),
        { label: 'Original Paper I', href: mathematicsManifest.sources.p1.url },
        ...(mathematicsManifest.sources.p2 ? [{ label: 'Original Paper II', href: mathematicsManifest.sources.p2.url }] : []),
        ...(mathematicsManifest.sources.key ? [{ label: 'Official MCQ key', href: mathematicsManifest.sources.key.url }] : []),
        ...(mathematicsManifest.sources.em ? [{ label: 'E-marking notes', href: `/resources/mathematics-ix-${paper.examYear}-emarking` }] : []),
      ]} />}
      {mathematics2026Tabs && <PaperResourceNav tabs={mathematics2026Tabs} current={'/past-papers/' + paper.paperCode} />}
      {mathematicsXModel && <PaperResourceNav tabs={mathematicsXModelTabs} current={'/past-papers/' + paper.paperCode} />}
      {mathematicsXModel && paper.paperCode.endsWith('-P1') && <p>RiseLearner worked out the MCQ answers. Question 39 has multiple possible answers and is excluded from scored practice.</p>}
      {mathematics2026Tabs && paper.paperCode.endsWith('-P1') && <p>RiseLearner worked out the MCQ answers. The board’s e-marking notes cover Paper II.</p>}
      {paper.paperCode === 'MTH-X-2026-P1' && <p>Questions 10, 39 and 43 remain available for review and are excluded from scored practice.</p>}
      {!paper.sourceDocumentId && /^PHY-IX-2025-P[12]$/.test(paper.paperCode||'') && <PaperResourceNav tabs={physicsIx2025PaperTabs} />}
      {!paper.sourceDocumentId && /^PHY-IX-2024-P[12]$/.test(paper.paperCode||'') && <PaperResourceNav tabs={physicsIx2024PaperTabs} />}
      {combinedPhysicsTabs && <PaperResourceNav tabs={combinedPhysicsTabs} current={'/past-papers/' + paper.paperCode} />}
      {physicsTabs && <PaperResourceNav tabs={physicsTabs} current={'/past-papers/' + paper.paperCode} />}
      {chemistry2026Tabs && !paper.sourceDocumentId && <>
        <PaperResourceNav tabs={chemistry2026Tabs} current={'/past-papers/' + paper.paperCode} />
        {paper.paperCode.endsWith('-P1') && <p>MCQ answers and explanations were prepared by RiseLearner. The board’s e-marking notes cover Paper II.</p>}
      </>}
      {earlyChemistryTabs && !paper.sourceDocumentId && <PaperResourceNav tabs={earlyChemistryTabs} current={'/past-papers/' + paper.paperCode} />}
      {combinedChemistry && !earlyChemistryTabs && !paper.sourceDocumentId && <>
        <PaperResourceNav tabs={combinedChemistry.tabs} current={'/past-papers/' + paper.paperCode} />
        {combinedChemistry.paper.questions.length === 50 && <p>100 minutes · 50 marks · 40 Theory MCQs and 10 Alternate to Practical MCQs. The board scaled the Theory marks from 40 to 65 for examination results.</p>}
      </>}
      {physics2026Tabs && !paper.sourceDocumentId && <>
        <PaperResourceNav tabs={physics2026Tabs} current={'/past-papers/' + paper.paperCode} />
        <p>RiseLearner independently solved these questions. The answers and worked solutions are for practice.</p>
      </>}
      {/^PHY-XI-(?:201[7-9]|202[1-5])-P[12]$/.test(paper.paperCode || '') && <PaperResourceNav tabs={hsscXiAnnualResources.filter(item => item.year === paper.examYear)} />}
      {/^CS-XI-(?:201[7-9]|202[1-5])-P[12]$/.test(paper.paperCode || '') && <PaperResourceNav tabs={computerScienceXi2025Resources.filter(item => item.year === paper.examYear)} />}
      {xiBiologyArchive && <PaperResourceNav tabs={xiBiologyArchive.resources} current={'/past-papers/' + paper.paperCode} />}
      {csAnnual && <><PaperResourceNav tabs={csAnnual.papers.map(p=>({label:p.label,href:p.href}))} /><p>Historical {csAnnual.year} paper. Some topics have no direct outcome in the current syllabus. {csAnnual.year === 2024 ? "The marking guide is project-authored." : (csAnnual.year === 2023 || csAnnual.year === 2019) ? "Official e-marking examples accompany reviewed typed questions and worked answers." : "This combined paper includes 50 theory and 15 alternate-to-practical MCQs. Only the paper and key were supplied."}</p></>}
      {csResources && <PaperResourceNav tabs={csResources.papers.map(item => ({label: item.label, href: item.href}))} />}
      {biology2024 && <PaperResourceNav tabs={biology2024Archive} current={'/past-papers/' + paper.paperCode} />}
      {biologyIxArchive && !paper.sourceDocumentId && <PaperResourceNav tabs={biologyIxArchive} current={'/past-papers/' + paper.paperCode} />}
      {biologyIx2026 && !paper.sourceDocumentId && <>
        <PaperResourceNav tabs={biologyIx2026Tabs} current={'/past-papers/' + paper.paperCode} />
        {paper.paperCode.endsWith('-P1') && <p>RiseLearner independently solved these MCQs for practice. The board’s official Paper I key is not included.</p>}
      </>}
      {biologyXArchive && <PaperResourceNav tabs={biologyXArchive} current={'/past-papers/' + paper.paperCode} />}
      {biology2022 && <>
        <PaperResourceNav tabs={isGrade9 ? biology2022Archive : biologyX2022Archive} current={'/past-papers/' + paper.paperCode} />
        <p>100 minutes · 50 marks · 40 Theory MCQs and 10 Alternate to Practical MCQs. The board scaled the 40 Theory marks to 65 for examination results.</p>
      </>}
      {biology2021 && <>
        <PaperResourceNav tabs={biologyIx2021 ? biologyIx2021Tabs : biologyX2021Archive} current={'/past-papers/' + paper.paperCode} />
        <p>100 minutes · 50 marks · 40 Theory MCQs and 10 Alternate to Practical (ATP) MCQs. The marks obtained on the 40 MCQs will be equated to the total marks of 65 for the theory examination results.</p>
      </>}
      <Suspense fallback={<p>Loading paper…</p>}>
        <PaperViewerClient
          paper={paper}
          questions={displayQuestions}
          hideHeader
          historical={!(hsscModel || biologyModel)}
        />
      </Suspense>
    </section>
  );
}
