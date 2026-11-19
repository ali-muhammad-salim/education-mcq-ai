import Link from "next/link";
import { redirect } from "next/navigation";
import { notFound } from "next/navigation";
import DocumentViews from "@/components/DocumentViews";
import StructuredContent from "@/components/StructuredContent";
import { studyScope } from "@/services/study/navigation";
import { hsscComputerScienceResources } from "@/lib/hsscComputerScienceResources";
import { computerSciencePractical } from "@/lib/hsscComputerSciencePractical";
import styles from "@/components/MaterialLayout.module.css";

export default async function Page({ params }: {
  params: Promise<{ board: string; class: string; subject: string; paper: string }>;
}) {
  const raw = await params;
  const scope = studyScope(raw.board, raw.class, raw.subject);
  if (!scope) notFound();
  const resources = hsscComputerScienceResources(scope.board.id, scope.classDef.level, scope.meta.slug);
  const paper = resources?.papers.find(item => item.slug === raw.paper);
  if (!resources || !paper) notFound();
  if (raw.paper !== "practical") redirect(`/past-papers/CS-${resources.roman}-P${raw.paper === "paper-i" ? 1 : 2}`);
  const practical = raw.paper === "practical" ? computerSciencePractical(resources.grade) : null;
  return <section className={styles.page}>
    <p><Link href={scope.baseUrl + "/model-papers"}>Model papers</Link></p>
    <h1>Computer Science Class {resources.roman} · {paper.label}</h1>
    <p>{resources.year} and onwards · {paper.minutes} minutes · {paper.marks} marks</p>
    <nav className={styles.actions} aria-label="Model paper resources">
      {resources.papers.map(item => <Link key={item.slug} href={item.href} aria-current={item.slug === raw.paper ? "page" : undefined}>{item.label}</Link>)}
      <a href={paper.file} target="_blank" rel="noopener noreferrer">Original PDF</a>
    </nav>
    {practical ? <DocumentViews title={paper.label} original={paper.file} continuousPdf>
      <div className={styles.digital}>
        <StructuredContent text={practical.tasks} />
        <p><Link href={scope.baseUrl + "/syllabus#unit-" + (resources.grade === 11 ? 3 : 11)}>Related syllabus chapter</Link></p>
        <details><summary>Worked solution</summary><StructuredContent text={practical.solution} /></details>
      </div>
    </DocumentViews> : <DocumentViews title={paper.label} original={paper.file} continuousPdf />}
  </section>;
}
