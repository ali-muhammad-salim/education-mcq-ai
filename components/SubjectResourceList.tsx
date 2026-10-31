import Link from "next/link";
import {paperLabel} from "@/lib/paperPresentation";
import { notFound } from "next/navigation";
import Breadcrumbs from "./Breadcrumbs";
import MaterialList, { type MaterialItem } from "./MaterialList";
import DocumentViews from "./DocumentViews";
import styles from "./MaterialLayout.module.css";
import { studyScope } from "@/services/study/navigation";
import { subjectMaterials } from "@/services/materials/catalog";
import { getAllStandardPapers } from "@/lib/paperDataService";
import prisma from "@/lib/prisma";
import {publicMaterialWhere} from '@/lib/materialVisibility';
import { physics2025Resources, physicsX2025Resources, cs2025Resources } from '@/lib/legacyPaperEvidence';
import rg9 from '@/data/physics/ssc1_resource_guide.json';
import rg10 from '@/data/physics/ssc2_resource_guide.json';

export default async function SubjectResourceList({
  params,
  type,
  guide = false,
  after = "",
}: {
  params: { board: string; class: string; subject: string };
  type: "model_paper" | "past_paper" | "textbook";
  guide?: boolean;
  after?: string;
}) {
  const scope = studyScope(params.board, params.class, params.subject);
  if (!scope) notFound();
  const titles = {
    model_paper: "Model papers",
    past_paper: "Past papers",
    textbook: "Books",
  };
  const documents = await subjectMaterials(
    params.board,
    params.class,
    params.subject,
    type==='past_paper'?['past_paper','answer_key','e_marking']:type,
    after,
  );
  const items: MaterialItem[] = documents
    .slice(0, 100)
    .map((doc) => ({
      label: doc.metadata.title || titles[type],
      href: doc.metadata.compiledPaperId?'/past-papers/'+doc.metadata.compiledPaperId:"/materials/" + doc.id,
      year: /^\d{4}$/.test(doc.metadata.examYear||'')?Number(doc.metadata.examYear):undefined,
    }));
  const legacy =
    scope.board.id === "akueb" &&
    scope.meta.slug === "physics" &&
    [9, 10].includes(scope.classDef.level);
  const hasStandardPapers =
    legacy ||
    (scope.board.id === "akueb" &&
      scope.meta.slug === "computer-science" &&
      scope.classDef.level === 9);
  if (legacy && type==='past_paper' && !after) items.push(...(scope.classDef.level===9 ? physics2025Resources : physicsX2025Resources));
  if (scope.board.id === 'akueb' && scope.meta.slug === 'computer-science' && scope.classDef.level === 9 && type === 'past_paper' && !after) {
    items.push(...cs2025Resources);
  }
  if (type !== "textbook" && !after) {
    const stored = await prisma.pastPaper.findMany({
      where: {
        academicClass: {
          level: scope.classDef.level,
          programme: {
            board: {
              shortCode: { equals: scope.board.shortCode, mode: "insensitive" },
            },
          },
        },
        subject: { name: { equals: scope.meta.title, mode: "insensitive" } },
        examType: type === "model_paper" ? "MODEL_EXAM" : "ANNUAL",
        OR:[{sourceDocumentId:null},{sourceDocument:publicMaterialWhere}],
      },
      select: {
        id: true,
        paperCode: true,
        title: true,
        fileUrl: true,
        examYear:true,
        sourceDocument:{select:{catalogMetadata:true}},
        _count: { select: { questions: true } },
      },
      orderBy: { examYear: "desc" },
      take: 100,
    });
    const seen = new Set<string>();
    const listed=new Set(items.map(i=>i.href));
    for (const paper of [
      ...stored.filter(p=>!p.sourceDocument||(p.sourceDocument.catalogMetadata as Record<string,unknown>|null)?.compiledPaperId===p.id),
      ...(hasStandardPapers
        ? getAllStandardPapers().filter(
            (p) =>
              p.academicClass?.level === scope.classDef.level &&
              (p.subject?.name || "").toLowerCase() === scope.meta.title.toLowerCase() &&
              (type === "model_paper"
                ? /MODEL/i.test(p.examSession || "")
                : !/MODEL/i.test(p.examSession || "")),
          )
        : []),
    ]) {
      const code = paper.paperCode || paper.id;
      if (/CHAP1-2/i.test(code) || /Chapters\s*1\s*&\s*2/i.test(paper.title || "")) continue;
      if (seen.has(code)) continue;
      if(listed.has('/past-papers/'+encodeURIComponent(code)))continue;
      seen.add(code);
      if (!paper.fileUrl && !paper._count.questions) continue;
      items.push({
        label: paperLabel(paper.paperCode,paper.title),
        href: "/past-papers/" + encodeURIComponent(code),
        year:paper.examYear,
      });
    }
    if (
      type === "model_paper" &&
      hasStandardPapers &&
      scope.classDef.level === 9 &&
      !after
    )
      items.push({
        label: "Practical paper",
        href: scope.baseUrl + "/practicals",
      });
  } else if (legacy && !after) {
    items.push(
      {
        label: "Resources guide",
        href: scope.baseUrl + "/books?view=guide",
      },
      {
        label: "28-week pacing guide",
        href: scope.classDef.level === 9 ? "/resources/physics-ix-pacing-guide" : "/resources/physics-x-pacing-guide",
      }
    );
  }
  const activeGuide = scope.classDef.level === 9 ? rg9 : rg10;
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
          { label: titles[type], active: true },
        ]}
      />
      <h1>{titles[type]}</h1>
      {guide && legacy ? (
        <DocumentViews
          title="Resources guide"
          original={
            "/materials/ssc/physics/ssc-" +
            (scope.classDef.level === 9 ? "1" : "2") +
            "/resources-guide-2025-ssc-" +
            (scope.classDef.level === 9 ? "i" : "ii") +
            "-physics-dedicated.pdf"
          }
        >
          <div className={styles.digital}>
            <p><strong>Recommended Key Textbook:</strong> {activeGuide.recommendedKeyTextbook}</p>
            <div style={{overflowX:'auto'}}>
              <table style={{width:'100%',borderCollapse:'collapse'}}>
                <thead>
                  <tr>
                    {['Unit','Topic Title','Reference Books & Chapters','Websites & Simulations'].map(h => (
                      <th key={h} style={{textAlign:'left',padding:'.75rem',borderBottom:'1px solid var(--border-color)'}}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {activeGuide.units.map((u) => (
                    <tr key={u.topicNumber} style={{borderBottom:'1px solid var(--border-color)'}}>
                      <td style={{padding:'.65rem',verticalAlign:'top'}}><strong>{u.topicNumber}</strong></td>
                      <td style={{padding:'.65rem',verticalAlign:'top'}}><strong>{u.topicTitle}</strong></td>
                      <td style={{padding:'.65rem',verticalAlign:'top'}}>
                        <ul style={{margin:0,paddingLeft:'1.1rem'}}>
                          {u.references.map((r, i) => <li key={i}>{r.book} — <em>{r.topic}</em></li>)}
                        </ul>
                      </td>
                      <td style={{padding:'.65rem',verticalAlign:'top'}}>
                        <ul style={{margin:0,paddingLeft:'1.1rem'}}>
                          {u.websites.map((w, i) => <li key={i}><a href={w} target="_blank" rel="noreferrer">{w}</a></li>)}
                        </ul>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p style={{marginTop:'1rem',fontSize:'.9rem'}}>{activeGuide.note}</p>
          </div>
        </DocumentViews>
      ) : items.length ? (
        type==='past_paper'?<>{[...new Set(items.map(i=>i.year))].sort((a,b)=>(b||0)-(a||0)).map(year=><section key={year||'other'}><h2 style={{margin:'1.5rem 0 .6rem'}}>{year||'Other resources'}</h2><MaterialList items={items.filter(i=>i.year===year)} /></section>)}</>:<MaterialList items={items} />
      ) : (
        <p className={styles.muted}>Coming soon</p>
      )}
      {documents.length > 100 && (
        <p>
          <Link href={"?after=" + documents[99].id}>More documents →</Link>
        </p>
      )}
    </section>
  );
}
