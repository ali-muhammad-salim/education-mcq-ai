import { notFound } from "next/navigation";
import Breadcrumbs from "@/components/Breadcrumbs";
import DocumentViews from "@/components/DocumentViews";
import { studyScope } from "@/services/study/navigation";
import styles from "@/components/MaterialLayout.module.css";
import { subjectMaterials } from '@/services/materials/catalog';
import MaterialList from '@/components/MaterialList';
import ssc1PhysicsPracticals from '@/data/physics/ssc1_practicals.json';
import ssc1CsPracticals from '@/data/computer-science/ssc1_practicals.json';
import ssc2CsPracticals from '@/data/computer-science/ssc2_practicals.json';
export const dynamic = 'force-dynamic';
export default async function Page({
  params,
}: {
  params: Promise<{ board: string; class: string; subject: string }>;
}) {
  const raw = await params,
    scope = studyScope(raw.board, raw.class, raw.subject);
  if (!scope) notFound();
  const documents = await subjectMaterials(raw.board, raw.class, raw.subject, 'practical_paper');
  const isPhysicsIX =
    scope.board.id === "akueb" &&
    scope.meta.slug === "physics" &&
    scope.classDef.level === 9;
  const isCsIX =
    scope.board.id === "akueb" &&
    scope.meta.slug === "computer-science" &&
    scope.classDef.level === 9;
  const isCsX =
    scope.board.id === "akueb" &&
    scope.meta.slug === "computer-science" &&
    scope.classDef.level === 10;

  const original = isPhysicsIX
    ? "/materials/ssc/physics/ssc-1/ssc-i-physics-sample-practical.pdf"
    : isCsIX
      ? "/materials/ssc/computer-science/ssc-1/computer-science-practical-model-paper-ix.pdf"
      : isCsX
        ? "/materials/ssc/computer-science/ssc-2/computer-science-practical-model-paper-x.pdf"
        : undefined;

  const practicalItems: any[] = isCsIX ? ssc1CsPracticals : isCsX ? ssc2CsPracticals : ssc1PhysicsPracticals;

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
        <MaterialList items={documents.map(doc => ({ label: doc.metadata.title || 'Practical paper', href: '/materials/' + doc.id }))} />
      ) : original ? (
        <DocumentViews title={scope.meta.title + " Practical Model Paper III"} original={original}>
          <div className={styles.digital} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div style={{ padding: '1.25rem', border: '1.5px solid var(--border-color, #dce5e1)', borderRadius: 12, background: '#f8faf9' }}>
              <h2 style={{ marginTop: 0, color: '#0b5e4a' }}>
                Model Examination Paper {isCsX ? '2027' : '2026'} &amp; Onwards — {scope.meta.title} Paper III (Practical)
              </h2>
              {(isCsIX || isCsX) ? (
                <p style={{ margin: 0, lineHeight: 1.6 }}>
                  <strong>Time Allowed:</strong> 1 hour · <strong>Total Marks:</strong> 10 (Stage I: 2 Marks, Stage II: 2 Marks, Stage III: 4 Marks, School Record: 2 Marks) · <strong>Instructions:</strong> Copy and paste the HTML/JavaScript codes for Task 1 through Task 6 into an MS Word file, save it with your Name and Candidate ID, and submit the printout along with the practical booklet.
                </p>
              ) : (
                <p style={{ margin: 0 }}>
                  <strong>Time Allowed:</strong> 40 minutes · <strong>Total Marks:</strong> 10 · <strong>Objective:</strong> To draw a graph between temperature and time, when ice is converted into water and then into steam by slow heating.
                </p>
              )}
            </div>
            {practicalItems.map((item, idx) => (
              <article key={idx} style={{ padding: '1.25rem', border: '1.5px solid var(--border-color, #dce5e1)', borderRadius: 12, background: '#ffffff' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '.5rem', marginBottom: '.65rem' }}>
                  <strong style={{ fontSize: '1.05rem', color: '#0f172a' }}>{item.title}</strong>
                  <span style={{ background: '#ecfdf5', color: '#065f46', padding: '3px 10px', borderRadius: '6px', fontSize: '0.8rem', fontWeight: 700 }}>
                    {item.stage} · {item.marks} Marks · SLO <code>{item.slo}</code>
                  </span>
                </div>
                <p style={{ margin: '0.35rem 0' }}><strong>Topic:</strong> {item.topic}</p>
                <p style={{ margin: '0.35rem 0' }}><strong>Equipment &amp; Software:</strong> {item.apparatus}</p>
                <p style={{ whiteSpace: 'pre-line', lineHeight: 1.6 }}>{item.description}</p>
                {item.diagramUrl && (
                  <div style={{ margin: '1rem 0', textAlign: 'center' }}>
                    <img
                      src={item.diagramUrl}
                      alt={item.title}
                      style={{ maxWidth: '100%', maxHeight: '340px', objectFit: 'contain', border: '1px solid #cbd5e1', borderRadius: '8px', padding: '6px', background: '#fff' }}
                    />
                  </div>
                )}
                {item.secondaryDiagramUrl && (
                  <div style={{ margin: '1rem 0', textAlign: 'center' }}>
                    <img
                      src={item.secondaryDiagramUrl}
                      alt={item.title + ' output'}
                      style={{ maxWidth: '100%', maxHeight: '320px', objectFit: 'contain', border: '1px solid #cbd5e1', borderRadius: '8px', padding: '6px', background: '#fff' }}
                    />
                  </div>
                )}
                {item.solutionCode && (
                  <div style={{ marginTop: '0.85rem' }}>
                    <div style={{ fontSize: '0.82rem', fontWeight: 800, color: '#0b5e4a', marginBottom: '0.35rem' }}>
                      Reference HTML / JavaScript Solution Code:
                    </div>
                    <pre style={{ background: '#0f172a', color: '#f8fafc', padding: '1rem', borderRadius: '8px', overflowX: 'auto', fontSize: '0.84rem', lineHeight: 1.5, margin: 0 }}>
                      <code>{item.solutionCode}</code>
                    </pre>
                  </div>
                )}
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
