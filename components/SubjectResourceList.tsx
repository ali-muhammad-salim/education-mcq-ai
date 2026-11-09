import Link from "next/link";
import {paperLabel, safeDocumentUrl} from "@/lib/paperPresentation";
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
import { physics2025Resources, physicsX2025Resources, cs2025Resources, csX2025Resources, chem2025Resources, chemXResources } from '@/lib/legacyPaperEvidence';
import chemRg9 from '@/data/chemistry/ssc1_resource_guide.json';
import chemRg10 from '@/data/chemistry/ssc2_resource_guide.json';
import rg9 from '@/data/physics/ssc1_resource_guide.json';
import rg10 from '@/data/physics/ssc2_resource_guide.json';
import { hsscPhysicsResources } from '@/lib/hsscPhysicsResources';
import { hsscPhysicsSyllabus } from '@/lib/hsscPhysicsSyllabus';
import { hsscXiAnnualResources } from '@/lib/hsscXiAnnualPhysics';

export default async function SubjectResourceList({
  params,
  type,
  guide = false,
  pacing = false,
  after = "",
}: {
  params: { board: string; class: string; subject: string };
  type: "model_paper" | "past_paper" | "textbook";
  guide?: boolean;
  pacing?: boolean;
  after?: string;
}) {
  const scope = studyScope(params.board, params.class, params.subject);
  if (!scope) notFound();
  const hssc = hsscPhysicsResources(scope.board.id, scope.classDef.level, scope.meta.slug);
  const titles = {
    model_paper: "Model papers",
    past_paper: "Past papers",
    textbook: "Books",
  };
  const mathematics = scope.board.id === 'akueb' && scope.meta.slug === 'mathematics';
  const documents = await subjectMaterials(
    params.board,
    params.class,
    params.subject,
    type==='past_paper'?['past_paper','answer_key','e_marking']:type,
    after,
  ).catch(error => {
    if (hssc && error.name === "PrismaClientInitializationError") return [];
    throw error;
  });
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
    legacy || Boolean(hssc) ||
    (scope.board.id === "akueb" &&
      ["computer-science", "chemistry"].includes(scope.meta.slug) &&
      [9, 10].includes(scope.classDef.level));
  if (legacy && type==='past_paper' && !after) items.push(...(scope.classDef.level===9 ? physics2025Resources : physicsX2025Resources));
  if (hssc?.grade === 11 && type === "past_paper" && !after) items.push(...hsscXiAnnualResources);
  if (scope.board.id === 'akueb' && scope.meta.slug === 'computer-science' && [9, 10].includes(scope.classDef.level) && type === 'past_paper' && !after) {
    items.push(...(scope.classDef.level === 9 ? cs2025Resources : csX2025Resources));
  }
  if (scope.board.id === 'akueb' && scope.meta.slug === 'chemistry' && [9, 10].includes(scope.classDef.level) && type === 'past_paper' && !after) {
    items.push(...(scope.classDef.level === 9 ? chem2025Resources : chemXResources));
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
    }).catch(error => {
      if (hssc && error.name === "PrismaClientInitializationError") return [];
      throw error;
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
      (hssc || scope.classDef.level === 9 || ["computer-science", "chemistry"].includes(scope.meta.slug)) &&
      !after
    )
      items.push({
        label: "Practical paper",
        href: scope.baseUrl + "/practicals",
      });
  } else if (hssc && type === "textbook" && !after) {
    items.push(
      { label: "Teaching & learning resource guide", href: hssc.base + "/books?view=guide" },
      { label: "28-week pacing guide", href: hssc.base + "/books?view=pacing" },
    );
  } else if ((legacy || (scope.board.id === "akueb" && scope.meta.slug === "chemistry")) && !after) {
    const isChem = scope.meta.slug === "chemistry";
    items.push(
      {
        label: "Resources guide",
        href: scope.baseUrl + "/books?view=guide",
      },
      {
        label: "28-week pacing guide",
        href: isChem
          ? (scope.classDef.level === 9 ? "/resources/chemistry-ix-pacing-guide" : "/resources/chemistry-x-pacing-guide")
          : (scope.classDef.level === 9 ? "/resources/physics-ix-pacing-guide" : "/resources/physics-x-pacing-guide"),
      }
    );
  }
  if (mathematics && type === 'past_paper' && !after) {
    const references = await prisma.book.findMany({
      where: { subject: { equals: 'Mathematics', mode: 'insensitive' }, className: scope.classDef.name, boardAssociation: 'AKU-EB' },
      select: { sourceFile: true, publicationYear: true, metadata: true },
    });
    for (const reference of references) {
      const kind = (reference.metadata as Record<string, unknown> | null)?.resourceType;
      const href = safeDocumentUrl(reference.sourceFile);
      if (!href || !reference.publicationYear || !['answer_key', 'e_marking'].includes(String(kind))) continue;
      const markingPage = /^\/materials\/ssc\/mathematics\/ssc-[12]\/(mathematics-(?:ix|x)-(?:201[789]|202[345])-emarking)\.pdf$/.exec(href)?.[1];
      items.push({ label: kind === 'answer_key' ? 'Paper 1 keys' : 'Paper 2 E-marking', href: markingPage ? '/resources/' + markingPage : href, year: reference.publicationYear });
    }
  }
  const archiveLabels = ['Paper 1', 'Paper 1 keys', 'Paper 2', 'Paper 2 E-marking'];
  const displayItems = mathematics && type === 'past_paper'
    ? [...new Map(items.map(item => {
      const label = /e[- ]?marking/i.test(item.label) ? 'Paper 2 E-marking'
        : /\bkeys?\b/i.test(item.label) ? 'Paper 1 keys'
        : /\bpaper\s*(2|II)\b/i.test(item.label) ? 'Paper 2'
        : /\bpaper\s*(1|I)\b/i.test(item.label) ? 'Paper 1' : item.label;
      return [`${item.year}:${label}`, { ...item, label }] as const;
    })).values()].sort((a, b) => archiveLabels.indexOf(a.label) - archiveLabels.indexOf(b.label))
    : items;
  const activeGuide =
    scope.meta.slug === "chemistry"
      ? (scope.classDef.level === 9 ? chemRg9 : chemRg10)
      : (scope.classDef.level === 9 ? rg9 : rg10);
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
      {hssc && type === "textbook" && (guide || pacing) ? (
        <DocumentViews title={pacing ? "28-week pacing guide" : "Teaching & learning resource guide"} original={pacing ? hssc.pacing : hssc.guide} continuousPdf>
          <div className={styles.digital}>
            <h2>{pacing ? "28-week instructional pacing guide" : "Teaching & learning resource guide"}</h2>
            <p><strong>Recommended textbook:</strong> Model Textbook of Physics {hssc.grade}, National Book Foundation, Islamabad.</p>
            {pacing && <p>Five theory periods per week. Each period is 40 minutes.</p>}
            <ol start={hssc.grade === 11 ? 1 : 11}>
              {hsscPhysicsSyllabus(scope.board.id, hssc.grade, scope.meta.slug)!.units.map((unit, index) => (
                <li key={unit.unitNumber}>
                  <a href={(pacing ? hssc.pacing : hssc.guide) + "#page=" + (pacing ? 2 + 2 * index : hssc.guidePages[index])} target="_blank" rel="noreferrer">{unit.name}</a>
                  {pacing && ` · ${hssc.periods[index]} periods`}
                </li>
              ))}
            </ol>
            <p><a href={(pacing ? hssc.pacing : hssc.guide) + "#page=" + (pacing ? 1 : hssc.guidePage)} target="_blank" rel="noreferrer">Open the official Class {hssc.roman} guide</a></p>
          </div>
        </DocumentViews>
      ) : guide && (legacy || scope.meta.slug === "chemistry") ? (
        <DocumentViews
          title="Resources guide"
          original={
            scope.meta.slug === "chemistry"
              ? "/materials/ssc/chemistry/ssc-" +
                (scope.classDef.level === 9 ? "1" : "2") +
                "/resource-guide-2025-ssc-chemistry.pdf"
              : "/materials/ssc/physics/ssc-" +
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
      ) : displayItems.length ? (
        type==='past_paper'?<>{[...new Set(displayItems.map(i=>i.year))].sort((a,b)=>(b||0)-(a||0)).map(year=><section key={year||'other'}><h2 style={{margin:'1.5rem 0 .6rem'}}>{year||'Other resources'}</h2><MaterialList items={displayItems.filter(i=>i.year===year)} /></section>)}</>:<MaterialList items={displayItems} />
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
