import StructuredContent from '@/components/StructuredContent';
import { notFound } from "next/navigation";
import Breadcrumbs from "@/components/Breadcrumbs";
import DocumentViews from "@/components/DocumentViews";
import { studyScope } from "@/services/study/navigation";
import styles from "@/components/MaterialLayout.module.css";
import { subjectMaterials } from '@/services/materials/catalog';
import MaterialList from '@/components/MaterialList';
import Link from 'next/link';
import { hsscPhysicsSyllabus } from '@/lib/hsscPhysicsSyllabus';
import { hsscPhysicsResources } from '@/lib/hsscPhysicsResources';
import ssc1PhysicsPracticals from '@/data/physics/ssc1_practicals.json';
import ssc1CsPracticals from '@/data/computer-science/ssc1_practicals.json';
import ssc2CsPracticals from '@/data/computer-science/ssc2_practicals.json';
import ssc1ChemPracticals from '@/data/chemistry/ssc1_practicals.json';
import ssc2ChemPracticals from '@/data/chemistry/ssc2_practicals.json';
export const dynamic = 'force-dynamic';
export default async function Page({
  params,
}: {
  params: Promise<{ board: string; class: string; subject: string }>;
}) {
  const raw = await params,
    scope = studyScope(raw.board, raw.class, raw.subject);
  if (!scope) notFound();
  const hssc = hsscPhysicsSyllabus(scope.board.id, scope.classDef.level, scope.meta.slug);
  const senior = hsscPhysicsResources(scope.board.id, scope.classDef.level, scope.meta.slug);
  const documents = await subjectMaterials(raw.board, raw.class, raw.subject, 'practical_paper').catch(error => {
    if (hssc && error.name === "PrismaClientInitializationError") return [];
    throw error;
  });
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
  const isChemIX =
    scope.board.id === "akueb" &&
    scope.meta.slug === "chemistry" &&
    scope.classDef.level === 9;
  const isChemX =
    scope.board.id === "akueb" &&
    scope.meta.slug === "chemistry" &&
    scope.classDef.level === 10;

  const original = isPhysicsIX
    ? "/materials/ssc/physics/ssc-1/ssc-i-physics-sample-practical.pdf"
    : isCsIX
      ? "/materials/ssc/computer-science/ssc-1/computer-science-practical-model-paper-ix.pdf"
      : isCsX
        ? "/materials/ssc/computer-science/ssc-2/computer-science-practical-model-paper-x.pdf"
        : isChemIX
          ? "/materials/ssc/chemistry/ssc-1/chemistry-practical-model-paper-ix.pdf"
          : isChemX
            ? "/materials/ssc/chemistry/ssc-2/chemistry-practical-model-paper-x.pdf"
            : undefined;

  const practicalItems: any[] = isCsIX
    ? ssc1CsPracticals
    : isCsX
      ? ssc2CsPracticals
      : isChemIX
        ? ssc1ChemPracticals
        : isChemX
          ? ssc2ChemPracticals
          : ssc1PhysicsPracticals;

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
      {senior && (
        <DocumentViews title="Physics Paper III sample practical" original={senior.practical} continuousPdf>
          <div className={styles.digital}>
            <h2>Sample Practical Paper III · Class {senior.roman}</h2>
            <p>{senior.practicalObjective}</p>
            <p><strong>Time:</strong> 60 minutes · <strong>Marks:</strong> 15</p>
            <ol>
              <li><strong>Stage I (2 marks).</strong> Select and name the apparatus.</li>
              <li><strong>Stage II (6 marks).</strong> {senior.grade === 11 ? 'Determine the zero correction and record the length and diameter measurements.' : 'Record three bridge readings and calculate the resistance for each trial.'}</li>
              <li><strong>Stage III (4 marks).</strong> {senior.grade === 11 ? 'Calculate the mean dimensions and report the test tube’s capacity.' : 'Report the mean resistance and give two experimental precautions.'}</li>
              <li><strong>School record (3 marks).</strong></li>
            </ol>
            <p><a href={senior.practical + '#page=2'} target="_blank" rel="noreferrer">Open the original task and observation tables</a></p>
            <p><Link href={senior.base + '/syllabus#unit-' + senior.practicalTopic}>Related syllabus chapter</Link></p>
          </div>
        </DocumentViews>
      )}
      {hssc && documents.length > 0 && (
        <MaterialList items={documents.map(doc => ({ label: doc.metadata.title || 'Practical paper', href: '/materials/' + doc.id }))} />
      )}
      {hssc ? (
        <div className={styles.digital}>
          <h2>Official syllabus practical activities</h2>
          <p>Paper III is assessed separately and carries 15 marks.</p>
          <p><a href={hssc.original + '#page=' + (scope.classDef.level === 11 ? 48 : 50)} target="_blank" rel="noopener noreferrer">Open the practical activities in the original PDF</a></p>
          <ol>
            {hssc.practicals.map(item => (
              <li key={item.number}>
                <p><Link href={scope.baseUrl + '/syllabus#unit-' + item.chapter}>Chapter {item.chapter}</Link>{': '}{item.activity}</p>
                <p><strong>Apparatus:</strong> {item.apparatus}</p>
              </li>
            ))}
          </ol>
        </div>
      ) : documents.length ? (
        <MaterialList items={documents.map(doc => ({ label: doc.metadata.title || 'Practical paper', href: '/materials/' + doc.id }))} />
      ) : original ? (
        <DocumentViews title={scope.meta.title + " Practical Model Paper III"} original={original}>
          <div className={styles.digital} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div style={{ padding: '1.25rem', border: '1.5px solid var(--border-color, #dce5e1)', borderRadius: 12, background: '#f8faf9' }}>
              <h2 style={{ marginTop: 0, color: '#0b5e4a' }}>
                Model Examination Paper {(isChemX || isCsX) ? '2027' : '2026'} &amp; Onwards — {scope.meta.title} Paper III (Practical)
              </h2>
              {(isCsIX || isCsX) ? (
                <p style={{ margin: 0, lineHeight: 1.6 }}>
                  <strong>Time Allowed:</strong> 1 hour · <strong>Total Marks:</strong> 10 (Stage I: 2 Marks, Stage II: 2 Marks, Stage III: 4 Marks, School Record: 2 Marks) · <strong>Instructions:</strong> Copy and paste the HTML/JavaScript codes for Task 1 through Task 6 into an MS Word file, save it with your Name and Candidate ID, and submit the printout along with the practical booklet.
                </p>
              ) : isChemIX ? (
                <p style={{ margin: 0, lineHeight: 1.6 }}>
                  <strong>Time Allowed:</strong> 40 minutes · <strong>Total Marks:</strong> 10 (Stage I: 1 Mark, Stage II: 2 Marks, Stage III: 5 Marks, School Record: 2 Marks) · <strong>Objective:</strong> To demonstrate the electroplating of copper metal on iron strip using CuSO4 solution.
                </p>
              ) : isChemX ? (
                <p style={{ margin: 0, lineHeight: 1.6 }}>
                  <strong>Time Allowed:</strong> 40 minutes · <strong>Total Marks:</strong> 10 (Stage I: 1 Mark, Stage II: 2 Marks, Stage III: 5 Marks, School Record: 2 Marks) · <strong>Objective:</strong> To demonstrate the methods of removing calcium ions from the given hard water samples A and B.
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
                <p style={{ margin: '0.35rem 0' }}><strong>{isChemIX || isChemX ? 'Equipment & Chemicals' : 'Equipment & Software'}:</strong> {item.apparatus}</p>
                <StructuredContent text={item.description} style={{ lineHeight: 1.6 }} />
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
