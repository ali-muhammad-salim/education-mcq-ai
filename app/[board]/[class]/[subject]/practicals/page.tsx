import { notFound } from "next/navigation";
import Breadcrumbs from "@/components/Breadcrumbs";
import DocumentViews from "@/components/DocumentViews";
import { studyScope } from "@/services/study/navigation";
import styles from "@/components/MaterialLayout.module.css";
import { subjectMaterials } from '@/services/materials/catalog';
import MaterialList from '@/components/MaterialList';
import ssc1Practicals from '@/data/physics/ssc1_practicals.json';
export const dynamic='force-dynamic';
export default async function Page({
  params,
}: {
  params: Promise<{ board: string; class: string; subject: string }>;
}) {
  const raw = await params,
    scope = studyScope(raw.board, raw.class, raw.subject);
  if (!scope) notFound();
  const documents=await subjectMaterials(raw.board,raw.class,raw.subject,'practical_paper');
  const original =
    scope.board.id === "akueb" &&
    scope.meta.slug === "physics" &&
    scope.classDef.level === 9
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
          { label: "Practicals", active: true },
        ]}
      />
      <h1>Practicals</h1>
      {documents.length ? (
        <MaterialList items={documents.map(doc=>({label:doc.metadata.title||'Practical paper',href:'/materials/'+doc.id}))}/>
      ) : original ? (
        <DocumentViews title="Practical paper" original={original}>
          <div className={styles.digital} style={{display:'flex',flexDirection:'column',gap:'1.25rem'}}>
            <div style={{padding:'1rem',border:'1px solid var(--border-color)',borderRadius:10}}>
              <h2 style={{marginTop:0}}>Model Examination Paper 2026 & Onwards — Physics Paper III</h2>
              <p><strong>Time Allowed:</strong> 40 minutes · <strong>Total Marks:</strong> 10 · <strong>Objective:</strong> To draw a graph between temperature and time, when ice is converted into water and then into steam by slow heating.</p>
            </div>
            {ssc1Practicals.map((item) => (
              <article key={item.pageNumber} style={{padding:'1rem',border:'1px solid var(--border-color)',borderRadius:10}}>
                <div style={{display:'flex',justifyContent:'space-between',flexWrap:'wrap',gap:'.5rem',marginBottom:'.5rem'}}>
                  <strong>{item.title}</strong>
                  <span>{item.stage} · {item.marks} Marks · SLO <code>{item.slo}</code></span>
                </div>
                <p><strong>Topic:</strong> {item.topic}</p>
                <p><strong>Apparatus:</strong> {item.apparatus}</p>
                <p>{item.description}</p>
              </article>
            ))}
          </div>
        </DocumentViews>
      ) : (
        <p className={styles.muted}>Coming soon</p>
      )}
    </section>
  );
}
