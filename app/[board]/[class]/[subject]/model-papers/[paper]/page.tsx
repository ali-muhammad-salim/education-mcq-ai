import Link from "next/link";
import { redirect } from "next/navigation";
import { notFound } from "next/navigation";
import DocumentViews from "@/components/DocumentViews";
import PracticalPaperReader from "@/components/PracticalPaperReader";
import StructuredContent from "@/components/StructuredContent";
import { studyScope } from "@/services/study/navigation";
import { hsscComputerScienceResources } from "@/lib/hsscComputerScienceResources";
import { computerSciencePractical } from "@/lib/hsscComputerSciencePractical";
import { hsscBiologyModelPapers } from "@/lib/hsscBiologyModelPapers";
import BiologyModelPaper from "@/components/BiologyModelPaper";
import styles from "@/components/MaterialLayout.module.css";

export default async function Page({ params, searchParams }: {
  params: Promise<{ board: string; class: string; subject: string; paper: string }>;
  searchParams?: Promise<{ view?: string }>;
}) {
  const raw = await params;
  const scope = studyScope(raw.board, raw.class, raw.subject);
  if (!scope) notFound();
  const biology = hsscBiologyModelPapers(scope.board.id, scope.classDef.level, scope.meta.slug);
  const biologyPaper = biology.find(item => item.slug === raw.paper);
  if (biologyPaper) return <BiologyModelPaper papers={biology} paper={biologyPaper} baseUrl={scope.baseUrl} originalView={(await searchParams)?.view === 'original'} />;
  if (biology.length && raw.paper === 'practical') redirect(`${scope.baseUrl}/practicals`);
  const resources = hsscComputerScienceResources(scope.board.id, scope.classDef.level, scope.meta.slug);
  const paper = resources?.papers.find(item => item.slug === raw.paper);
  if (!resources || !paper) notFound();
  if (raw.paper !== "practical") redirect(`/past-papers/CS-${resources.roman}-P${raw.paper === "paper-i" ? 1 : 2}`);
  const practical = raw.paper === "practical" ? computerSciencePractical(resources.grade) : null;
  const practicalChapter = resources.grade === 11 ? 3 : 11;
  return <section className={styles.page}>
    <p><Link href={scope.baseUrl + "/model-papers"}>Model papers</Link></p>
    <h1>Computer Science Class {resources.roman} · {paper.label}</h1>
    <p>{resources.year} and onwards · {paper.minutes} minutes · {paper.marks} marks</p>
    <nav className={styles.actions} aria-label="Model paper resources">
      {resources.papers.map(item => <Link key={item.slug} href={item.href} aria-current={item.slug === raw.paper ? "page" : undefined}>{item.label}</Link>)}
    </nav>
    {practical ? <PracticalPaperReader subject={scope.meta.title} subjectCode={scope.meta.code}
      grade={scope.classDef.level} roman={resources.roman} year={resources.year} durationMinutes={paper.minutes}
      totalMarks={paper.marks} original={paper.file} initialView={(await searchParams)?.view === 'original' ? 'original' : undefined}>
      <div className={styles.digital}>
        <StructuredContent text={practical.tasks} />
        <p><Link href={scope.baseUrl + "/syllabus#unit-" + practicalChapter}>2025 syllabus · Chapter {practicalChapter}</Link></p>
        <details><summary>Worked solution</summary><StructuredContent text={practical.solution} /></details>
      </div>
    </PracticalPaperReader> : <DocumentViews title={paper.label} original={paper.file} continuousPdf />}
  </section>;
}
