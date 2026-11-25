import { physicsIx2023References } from '@/lib/physicsIx2023Papers';
import { physicsIx2019References } from '@/lib/physicsIx2019Papers';
import { physicsIx2018References } from '@/lib/physicsIx2018Papers';
import { physicsIx2017References } from '@/lib/physicsIx2017Papers';
import { physicsIx2022Key } from '@/lib/physicsIx2022Paper';
import { physicsIx2021Key } from '@/lib/physicsIx2021Paper';
import { hsscComputerScience2019Resources } from '@/lib/hsscComputerScience2019';
import { hsscComputerScience2021Resources } from '@/lib/hsscComputerScience2021';
import { hsscComputerScience2022Resources } from '@/lib/hsscComputerScience2022';
import { hsscComputerScience2023Resources } from '@/lib/hsscComputerScience2023';
import Link from "next/link";
import { hsscComputerScience2024Resources } from "@/lib/hsscComputerScience2024";
import { hsscComputerScienceResources } from "@/lib/hsscComputerScienceResources";
import {paperLabel, safeDocumentUrl, biologyPaperPdfHref, mergePaperListings} from "@/lib/paperPresentation";
import { notFound } from "next/navigation";
import Breadcrumbs from "./Breadcrumbs";
import MaterialList, { type MaterialItem } from "./MaterialList";
import DocumentViews from "./DocumentViews";
import styles from "./MaterialLayout.module.css";
import { studyScope } from "@/services/study/navigation";
import { subjectMaterials, subjectPaperListings } from "@/services/materials/catalog";
import { combinedChemistryXArchives, getFallbackPaper } from "@/lib/paperDataService";
import prisma from "@/lib/prisma";
import { physics2025Resources, physicsX2025Resources, cs2025Resources, csX2025Resources, chem2025Resources, chemXResources } from '@/lib/legacyPaperEvidence';
import chemRg9 from '@/data/chemistry/ssc1_resource_guide.json';
import chemRg10 from '@/data/chemistry/ssc2_resource_guide.json';
import rg9 from '@/data/physics/ssc1_resource_guide.json';
import rg10 from '@/data/physics/ssc2_resource_guide.json';
import { hsscPhysicsResources } from '@/lib/hsscPhysicsResources';
import { hsscPhysicsSyllabus } from '@/lib/hsscPhysicsSyllabus';
import { hsscBiologyPractical } from '@/lib/hsscBiologyPractical';
import { hsscBiologyModelPapers } from '@/lib/hsscBiologyModelPapers';
import { hsscXiAnnualResources } from '@/lib/hsscXiAnnualPhysics';
import { computerScienceXi2025Resources } from '@/lib/hsscXiAnnualComputerScience';
import { biologyXiAnnualArchives } from '@/lib/hsscXiAnnualBiology';
import { biologyIx2026Notes } from '@/lib/biologyIx2026';
import { chemistryX2026Notes } from '@/lib/chemistryX2026';
import { chemistryX2019Notes } from '@/lib/chemistryX2019';
import { chemistryX2018Notes } from '@/lib/chemistryX2018';
import { chemistryX2017Notes } from '@/lib/chemistryX2017';
import { biologyIx2021Tabs } from '@/lib/biologyIx2021';
import { biologyIxAnnualArchives } from '@/lib/biologyPapers';
import { biology2022Archive, biology2024Archive, biologyX2017Archive, biologyX2018Archive, biologyX2019Archive, biologyX2021Archive, biologyX2022Archive, biologyX2023Archive, biologyX2024Archive, biologyX2025Archive } from '@/lib/biology2024Resources';

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
  const computerScience = hsscComputerScienceResources(scope.board.id, scope.classDef.level, scope.meta.slug);
  const hssc = hsscPhysicsResources(scope.board.id, scope.classDef.level, scope.meta.slug);
  const biologyPractical = type === 'model_paper' ? hsscBiologyPractical(scope.board.id, scope.classDef.level, scope.meta.slug) : null;
  const titles = {
    model_paper: "Model papers",
    past_paper: "Past papers",
    textbook: "Books",
  };
  const mathematics = scope.board.id === 'akueb' && scope.meta.slug === 'mathematics';
  const biology = scope.board.id === 'akueb' && scope.meta.slug === 'biology';
  const biologyXiAnnual = biology && scope.classDef.level === 11 && type === 'past_paper';
  const physicsIxAnnual = scope.board.id === 'akueb' && scope.meta.slug === 'physics' &&
    scope.classDef.level === 9 && type === 'past_paper';
  const documents = await subjectMaterials(
    params.board,
    params.class,
    params.subject,
    type==='past_paper'?['past_paper','answer_key','e_marking']:type,
    after,
  ).catch(error => {
    if ((hssc || computerScience || (biology && type !== "textbook") || physicsIxAnnual) && error.name === "PrismaClientInitializationError") return [];
    throw error;
  });
  const items: MaterialItem[] = documents
    .slice(0, 100)
    .map((doc) => ({
      label: doc.metadata.title || titles[type],
      href: doc.metadata.compiledPaperId?'/past-papers/'+doc.metadata.compiledPaperId:"/materials/" + doc.id,
      year: /^\d{4}$/.test(doc.metadata.examYear||'')?Number(doc.metadata.examYear):undefined,
    }));
  if (computerScience && type === "model_paper" && !after) {
    items.push(...computerScience.papers.map(paper => ({ label: paper.label, href: paper.href, year: computerScience.year })));
  }
  if (biologyPractical && !after) {
    items.push(...hsscBiologyModelPapers(scope.board.id, scope.classDef.level, scope.meta.slug).map(paper => ({
      label: `Biology ${paper.label} · ${paper.part === 1 ? 'Multiple choice' : 'Written responses'}`,
      href: paper.href,
      year: paper.year,
    })));
    items.push({ label: 'Biology Paper III · Sample practical', href: `${scope.baseUrl}/practicals`, year: biologyPractical.year });
  }
  if (computerScience?.grade === 11 && type === "past_paper" && !after) for (const archive of [hsscComputerScience2024Resources,hsscComputerScience2023Resources,hsscComputerScience2022Resources,hsscComputerScience2021Resources,hsscComputerScience2019Resources]) items.push(...archive.papers.map(paper => ({label:paper.label, href:paper.href, year:archive.year})));
  const legacy =
    scope.board.id === "akueb" &&
    scope.meta.slug === "physics" &&
    [9, 10].includes(scope.classDef.level);
  const ssc = scope.board.id === 'akueb' && [9, 10].includes(scope.classDef.level);
  const sscChemistry = ssc && scope.meta.slug === 'chemistry';
  const sscPracticals = ssc && (
    ['biology', 'chemistry', 'computer-science'].includes(scope.meta.slug) ||
    (legacy && scope.classDef.level === 9)
  );
  if (legacy && scope.classDef.level === 9 && type === "past_paper" && !after) items.push(...physicsIx2023References, physicsIx2022Key, physicsIx2021Key, ...physicsIx2019References, ...physicsIx2018References, ...physicsIx2017References);
  if (legacy && type==='past_paper' && !after) items.push(...(scope.classDef.level===9 ? physics2025Resources : physicsX2025Resources));
  if (hssc?.grade === 11 && type === "past_paper" && !after) items.push(...hsscXiAnnualResources);
  if (biologyXiAnnual && !after) items.push(...biologyXiAnnualArchives.flatMap(archive => archive.resources));
  if (biology && scope.classDef.level === 9 && type === 'past_paper' && !after) {
    items.push(biologyIx2026Notes, biologyIx2021Tabs[1], ...biologyIxAnnualArchives.flatMap(archive => archive.tabs.slice(2)));
  }
  if (scope.board.id === 'akueb' && scope.meta.slug === 'computer-science' && scope.classDef.level === 11 && type === 'past_paper' && !after) {
    items.push(...computerScienceXi2025Resources);
  }
  if (scope.board.id === 'akueb' && scope.meta.slug === 'computer-science' && [9, 10].includes(scope.classDef.level) && type === 'past_paper' && !after) {
    items.push(...(scope.classDef.level === 9 ? cs2025Resources : csX2025Resources));
  }
  if (scope.board.id === 'akueb' && scope.meta.slug === 'chemistry' && [9, 10].includes(scope.classDef.level) && type === 'past_paper' && !after) {
    items.push(...(scope.classDef.level === 9 ? chem2025Resources : chemXResources));
    if (scope.classDef.level === 10) items.push(chemistryX2026Notes, chemistryX2019Notes, chemistryX2018Notes, chemistryX2017Notes, ...combinedChemistryXArchives.map(archive => archive.tabs[1]));
  }
  if (type !== "textbook" && !after) {
    const papers = await subjectPaperListings(scope, type === "model_paper" ? "MODEL_EXAM" : "ANNUAL", scope.board.id === 'akueb');
    const seen = new Set<string>();
    const listed = new Set(items.map(item => item.href));
    for (const paper of papers) {
      const code = paper.paperCode || paper.id;
      if (seen.has(code)) continue;
      if(listed.has('/past-papers/'+encodeURIComponent(code)))continue;
      seen.add(code);
      items.push({
        label: paperLabel(paper.paperCode,paper.title),
        href: "/past-papers/" + encodeURIComponent(code),
        year:paper.examYear,
      });
    }
    if (
      type === "model_paper" &&
      (hssc || sscPracticals)
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
  } else if ((legacy || sscChemistry) && !after) {
    items.push(
      {
        label: "Resources guide",
        href: scope.baseUrl + "/books?view=guide",
      },
      {
        label: "28-week pacing guide",
        href: sscChemistry
          ? (scope.classDef.level === 9 ? "/resources/chemistry-ix-pacing-guide" : "/resources/chemistry-x-pacing-guide")
          : (scope.classDef.level === 9 ? "/resources/physics-ix-pacing-guide" : "/resources/physics-x-pacing-guide"),
      }
    );
  }
  if ((mathematics || biology) && type === 'past_paper' && !after) {
    const references = await prisma.book.findMany({
      where: { subject: { equals: mathematics ? 'Mathematics' : 'Biology', mode: 'insensitive' }, className: scope.classDef.name, boardAssociation: 'AKU-EB' },
      select: { sourceFile: true, publicationYear: true, metadata: true },
    });
    for (const reference of references) {
      const kind = (reference.metadata as Record<string, unknown> | null)?.resourceType;
      const href = safeDocumentUrl(reference.sourceFile);
      if (!href || !reference.publicationYear || !['answer_key', 'e_marking'].includes(String(kind))) continue;
      const markingPage = /^\/materials\/ssc\/(?:mathematics|biology)\/ssc-[12]\/((?:mathematics|biology)-(?:ix|x)-(?:201[789]|202[345])-emarking)\.pdf$/.exec(href)?.[1];
      const keyPage = /^\/materials\/ssc\/biology\/ssc-[12]\/((?:biology-ix-202[35]|biology-x-(?:2017|2018|2019|2021|2024))-keys)\.pdf$/.exec(href)?.[1];
      const linkHref = kind === 'answer_key' ? (keyPage ? '/resources/' + keyPage.replace(/-keys$/, '-key') : href) : (markingPage ? '/resources/' + markingPage : href);
      items.push({ label: kind === 'answer_key' ? 'Paper 1 keys' : 'Paper 2 E-marking', href: linkHref, year: reference.publicationYear });
    }
  }
  if (biology && type === 'past_paper' && !after) {
    const seenHrefs = new Set(items.map(item => item.href));
    const roman = scope.classDef.roman;
    for (const archive of [biology2022Archive, biology2024Archive, biologyX2017Archive, biologyX2018Archive, biologyX2019Archive, biologyX2021Archive, biologyX2022Archive, biologyX2023Archive, biologyX2024Archive, biologyX2025Archive]) {
      if (!archive[0].href.includes(`BIO-${roman}-`)) continue;
      for (const entry of archive) {
        let href = entry.href;
        if (href.startsWith('/past-papers/')) {
          const code = decodeURIComponent(href.slice('/past-papers/'.length));
          if (!getFallbackPaper(code)) href = biologyPaperPdfHref(code) ?? href;
        }
        if (seenHrefs.has(href)) continue;
        seenHrefs.add(href);
        items.push({ ...entry, href });
      }
    }
  }
  const archiveLabels = ['Paper 1', 'Paper 1 keys', 'Paper 2', 'Paper 2 E-marking'];
  const displayItems = (mathematics || biology) && type === 'past_paper'
    ? mergePaperListings(items).sort((a, b) => archiveLabels.indexOf(a.label) - archiveLabels.indexOf(b.label))
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
      ) : type === "textbook" && guide && (legacy || sscChemistry) ? (
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
