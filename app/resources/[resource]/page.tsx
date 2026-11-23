import { notFound } from 'next/navigation';
import Link from 'next/link';
import { uniqueQuestions } from '@/lib/uniqueQuestions';
import { sscComputerScienceMapping } from '@/lib/sscComputerScienceSyllabus';
import DocumentViews from '@/components/DocumentViews';
import BiologyStudyResource from '@/components/BiologyStudyResource';
import { hsscBiologyStudyResources } from '@/lib/hsscBiologyStudyResources';
import key from '@/data/physics/ssc1_2025_official_key.json';
import key2024 from '@/data/physics/ssc1_2024_official_key.json';
import emarking from '@/data/physics/ssc1_2025_emarking.json';
import emarking2024 from '@/data/physics/ssc1_2024_emarking.json';
import keyX2025 from '@/data/physics/ssc2_2025_official_key.json';
import emarkingX2025 from '@/data/physics/ssc2_2025_emarking.json';
import csKey2025 from '@/data/computer-science/ssc1_2025_official_key.json';
import csEmarking2025 from '@/data/computer-science/ssc1_2025_emarking.json';
import csKey2024 from '@/data/computer-science/ssc1_2024_official_key.json';
import csEmarking2024 from '@/data/computer-science/ssc1_2024_emarking.json';
import csKey2023 from '@/data/computer-science/ssc1_2023_official_key.json';
import csEmarking2023 from '@/data/computer-science/ssc1_2023_emarking.json';
import csKey2022 from '@/data/computer-science/ssc1_2022_official_key.json';
import csKey2019 from '@/data/computer-science/ssc1_2019_official_key.json';
import csEmarking2019 from '@/data/computer-science/ssc1_2019_emarking.json';
import csEmarking2018 from '@/data/computer-science/ssc1_2018_emarking.json';
import csKey2017 from '@/data/computer-science/ssc1_2017_official_key.json';
import csEmarking2017 from '@/data/computer-science/ssc1_2017_emarking.json';
import csXKey2025 from '@/data/computer-science/ssc2_2025_official_key.json';
import csXEmarking2025 from '@/data/computer-science/ssc2_2025_emarking.json';
import csXKey2024 from '@/data/computer-science/ssc2_2024_official_key.json';
import csXEmarking2024 from '@/data/computer-science/ssc2_2024_emarking.json';
import csXKey2023 from '@/data/computer-science/ssc2_2023_official_key.json';
import csXEmarking2023 from '@/data/computer-science/ssc2_2023_emarking.json';
import csXKey2022 from '@/data/computer-science/ssc2_2022_official_key.json';
import csXKey2019 from '@/data/computer-science/ssc2_2019_official_key.json';
import csXEmarking2019 from '@/data/computer-science/ssc2_2019_emarking.json';
import csXEmarking2018 from '@/data/computer-science/ssc2_2018_emarking.json';
import csXKey2017 from '@/data/computer-science/ssc2_2017_official_key.json';
import csXEmarking2017 from '@/data/computer-science/ssc2_2017_emarking.json';
import chemKey2025 from '@/data/chemistry/ssc1_2025_official_key.json';
import chemEmarking2025 from '@/data/chemistry/ssc1_2025_emarking.json';
import chemKey2024 from '@/data/chemistry/ssc1_2024_official_key.json';
import chemEmarking2024 from '@/data/chemistry/ssc1_2024_emarking.json';
import chemKey2023 from '@/data/chemistry/ssc1_2023_official_key.json';
import chemEmarking2023 from '@/data/chemistry/ssc1_2023_emarking.json';
import chemKey2022 from '@/data/chemistry/ssc1_2022_official_key.json';
import chemKey2021 from '@/data/chemistry/ssc1_2021_official_key.json';
import chemKey2019 from '@/data/chemistry/ssc1_2019_official_key.json';
import chemEmarking2019 from '@/data/chemistry/ssc1_2019_emarking.json';
import chemKey2018 from '@/data/chemistry/ssc1_2018_official_key.json';
import chemEmarking2018 from '@/data/chemistry/ssc1_2018_emarking.json';
import chemKey2017 from '@/data/chemistry/ssc1_2017_official_key.json';
import chemEmarking2017 from '@/data/chemistry/ssc1_2017_emarking.json';
import chemXKey2025 from '@/data/chemistry/ssc2_2025_official_key.json';
import chemXEmarking2025 from '@/data/chemistry/ssc2_2025_emarking.json';
import chemXKey2024 from '@/data/chemistry/ssc2_2024_official_key.json';
import chemXEmarking2024 from '@/data/chemistry/ssc2_2024_emarking.json';
import chemXKey2023 from '@/data/chemistry/ssc2_2023_official_key.json';
import chemXEmarking2023 from '@/data/chemistry/ssc2_2023_emarking.json';
import bioKey2025 from '@/data/biology/ssc1_2025_official_key.json';
import bioKey2023 from '@/data/biology/ssc1_2023_official_key.json';
import bioKeyX2024 from '@/data/biology/ssc2_2024_official_key.json';
import bioKeyX2019 from '@/data/biology/ssc2_2019_official_key.json';
import bioKeyX2018 from '@/data/biology/ssc2_2018_official_key.json';
import bioKeyX2017 from '@/data/biology/ssc2_2017_official_key.json';
import bioKeyX2021 from '@/data/biology/ssc2_2021_official_key.json';
import rg9 from '@/data/physics/ssc1_resource_guide.json';
import rg10 from '@/data/physics/ssc2_resource_guide.json';
import chemRg9 from '@/data/chemistry/ssc1_resource_guide.json';
import chemRg10 from '@/data/chemistry/ssc2_resource_guide.json';
import pacing9 from '@/data/physics/ssc1_pacing.json';
import pacing10 from '@/data/physics/ssc2_pacing.json';
import chemPacing9 from '@/data/chemistry/ssc1_pacing.json';
import chemPacing10 from '@/data/chemistry/ssc2_pacing.json';
import styles from '@/components/MaterialLayout.module.css';
import { physicsIx2023AnswerKey, physicsIx2023Marking, physicsIx2023References, physicsIx2023Tabs } from '@/lib/physicsIx2023Papers';
import { physicsIx2019AnswerKey, physicsIx2019Marking, physicsIx2019Papers, physicsIx2019References, physicsIx2019Tabs } from '@/lib/physicsIx2019Papers';
import { physicsIx2018AnswerKey, physicsIx2018Marking, physicsIx2018Papers, physicsIx2018References, physicsIx2018Tabs } from '@/lib/physicsIx2018Papers';
import { physicsIx2017AnswerKey, physicsIx2017Marking, physicsIx2017Papers, physicsIx2017References, physicsIx2017Tabs } from '@/lib/physicsIx2017Papers';
import { physicsIx2022AnswerKey, physicsIx2022Key, physicsIx2022Paper, physicsIx2022Tabs } from '@/lib/physicsIx2022Paper';
import { physicsIx2021AnswerKey, physicsIx2021Key, physicsIx2021Paper, physicsIx2021Tabs } from '@/lib/physicsIx2021Paper';
import PaperResourceNav from '@/components/PaperResourceNav';
import { annualAnswerReviews, annual2024AnswerReviews, annualX2025AnswerReviews, csAnnual2025AnswerReviews, csAnnual2024AnswerReviews, csAnnual2023AnswerReviews, csAnnual2022AnswerReviews, csAnnualX2024AnswerReviews, csAnnualX2023AnswerReviews, csAnnualX2019AnswerReviews, physicsIx2024PaperTabs, physicsIx2025PaperTabs } from '@/lib/legacyPaperEvidence';
import { publishedAnswerDecisions } from '@/services/materials/legacy-answer-review';
import StructuredContent from '@/components/StructuredContent';
import { hsscXiAnnualPapers, hsscXiAnnualResources } from '@/lib/hsscXiAnnualPhysics';
import { biologyXi2021AnswerReview, biologyXi2022VerificationReport, biologyXiAnnualArchives } from '@/lib/hsscXiAnnualBiology';
import { getFallbackPaper } from '@/lib/paperDataService';
import { paperChoices, paperMetadata, paperScoringAnswers, safeDocumentUrl } from '@/lib/paperPresentation';
import prisma from '@/lib/prisma';
import { biology2024Archive, biology2024PdfRoot, biologyX2017Archive, biologyX2017PdfRoot, biologyX2018Archive, biologyX2018PdfRoot, biologyX2019Archive, biologyX2019PdfRoot, biologyX2021Archive, biologyX2021PdfRoot, biologyX2023Archive, biologyX2023PdfRoot, biologyX2024Archive, biologyX2024PdfRoot, biologyX2025Archive, biologyX2025PdfRoot } from '@/lib/biology2024Resources';
export const dynamic='force-dynamic';

const SUPPORTED_RESOURCES = [
  'biology-ix-2025-key',
  'biology-ix-2025-emarking',
  'biology-ix-2023-key',
  'biology-ix-2023-emarking',
  'biology-x-2024-key',
  'biology-x-2024-emarking',
  'biology-x-2019-key',
  'biology-x-2019-emarking',
  'biology-x-2018-key',
  'biology-x-2018-emarking',
  'biology-x-2017-key',
  'biology-x-2017-emarking',
  'biology-x-2021-key',
  'physics-ix-2025-key',
  'physics-ix-2024-key',
  'physics-ix-2025-emarking',
  'physics-ix-2024-emarking',
  'physics-x-2025-key',
  'physics-x-2025-emarking',
  'physics-ix-resource-guide',
  'physics-x-resource-guide',
  'physics-ix-pacing-guide',
  'physics-x-pacing-guide',
  'computer-science-ix-2025-key',
  'computer-science-ix-2025-emarking',
  'computer-science-ix-2024-key',
  'computer-science-ix-2024-emarking',
  'computer-science-ix-2023-key',
  'computer-science-ix-2023-emarking',
  'computer-science-ix-2022-key',
  'computer-science-ix-2019-key',
  'computer-science-ix-2019-emarking',
  'computer-science-ix-2018-emarking',
  'computer-science-ix-2017-key',
  'computer-science-ix-2017-emarking',
  'computer-science-x-2025-key',
  'computer-science-x-2025-emarking',
  'computer-science-x-2024-key',
  'computer-science-x-2024-emarking',
  'computer-science-x-2023-key',
  'computer-science-x-2023-emarking',
  'computer-science-x-2022-key',
  'computer-science-x-2019-key',
  'computer-science-x-2019-emarking',
  'computer-science-x-2018-emarking',
  'computer-science-x-2017-key',
  'computer-science-x-2017-emarking',
  'chemistry-ix-2025-key',
  'chemistry-ix-2025-emarking',
  'chemistry-ix-2024-key',
  'chemistry-ix-2024-emarking',
  'chemistry-ix-2023-key',
  'chemistry-ix-2023-emarking',
  'chemistry-ix-2022-key',
  'chemistry-ix-2021-key',
  'chemistry-ix-2019-key',
  'chemistry-ix-2019-emarking',
  'chemistry-ix-2018-key',
  'chemistry-ix-2018-emarking',
  'chemistry-ix-2017-key',
  'chemistry-ix-2017-emarking',
  'chemistry-x-2025-key',
  'chemistry-x-2025-emarking',
  'chemistry-x-2024-key',
  'chemistry-x-2024-emarking',
  'chemistry-x-2023-key',
  'chemistry-x-2023-emarking',
  'chemistry-ix-resource-guide',
  'chemistry-x-resource-guide',
  'chemistry-ix-pacing-guide',
  'chemistry-x-pacing-guide',
] as const;

export default async function Page({params, searchParams}:{params:Promise<{resource:string}>; searchParams?: Promise<{view?: string}>}) {
  const {resource}=await params;
  const resourceHref = '/resources/' + resource;
  const combinedPhysics = [
    { key: physicsIx2021Key, tabs: physicsIx2021Tabs, answerKey: physicsIx2021AnswerKey, paper: physicsIx2021Paper },
    { key: physicsIx2022Key, tabs: physicsIx2022Tabs, answerKey: physicsIx2022AnswerKey, paper: physicsIx2022Paper },
  ].find(archive => archive.key.href === resourceHref);
  const reviewedPhysics = [
    { refs: physicsIx2017References, tabs: physicsIx2017Tabs, answerKey: physicsIx2017AnswerKey, marking: physicsIx2017Marking, paper: physicsIx2017Papers[0] },
    { refs: physicsIx2018References, tabs: physicsIx2018Tabs, answerKey: physicsIx2018AnswerKey, marking: physicsIx2018Marking, paper: physicsIx2018Papers[0] },
    { refs: physicsIx2019References, tabs: physicsIx2019Tabs, answerKey: physicsIx2019AnswerKey, marking: physicsIx2019Marking, paper: physicsIx2019Papers[0] },
    { refs: physicsIx2023References, tabs: physicsIx2023Tabs, answerKey: physicsIx2023AnswerKey, marking: physicsIx2023Marking },
  ].find(archive => archive.refs.some(item => item.href === resourceHref));
  const physicsArchive = combinedPhysics?.key ?? reviewedPhysics?.refs.find(item => item.href === resourceHref);
  if (physicsArchive) {
    const tabs = combinedPhysics?.tabs ?? reviewedPhysics!.tabs;
    const answerKey = combinedPhysics?.answerKey ?? reviewedPhysics!.answerKey;
    const marking = reviewedPhysics?.marking ?? [];
    const scoredPaper = combinedPhysics?.paper ?? reviewedPhysics?.paper;
    const showOriginalSlo = answerKey.some(row => row.slo);
    const practiceAnswers = new Map(scoredPaper?.questions.flatMap(({ questionNumber, sourceRegion }) => {
      const accepted = paperScoringAnswers(sourceRegion, paperChoices(sourceRegion.choices));
      if (accepted.length === 1 && accepted[0] === sourceRegion.official_answer) return [];
      return [[Number(questionNumber), accepted.length === 4 ? 'Any option earns credit' : accepted.join(' or ')]];
    }));
    const isKey = resource.endsWith('-key');
    const title = 'Physics Class IX · ' + physicsArchive.year + ' ' + physicsArchive.label;
    return <section className={styles.page}>
      <p><Link href="/akueb/IX/physics/pastpapers">Class IX Physics past papers</Link></p>
      <h1>{title}</h1>
      <DocumentViews original={physicsArchive.fileUrl} title={title} continuousPdf
        digitalLabel={isKey ? 'Digital Answer Key' : 'Digital Notes'}
        initialView={(await searchParams)?.view === 'original' ? 'original' : 'digital'}
        resourceLinks={<PaperResourceNav tabs={tabs} current={physicsArchive.href} inline />}>
        {isKey ? <div style={{ overflowX: 'auto' }}>
          {combinedPhysics ? <p>Q1–40 are Theory and Q41–50 are Alternate to Practical. The table preserves the published board answers and shows where practice scoring differs.</p> : physicsArchive.year === 2017 ? <p>The board lists D for Q24. Practice scores C because surface colour does not directly affect evaporation at fixed temperature and other conditions.</p> : physicsArchive.year === 2018 ? <p>The board answers are reproduced as printed. The practice adjustments for Q11, Q18 and Q19 are shown in the table.</p> : physicsArchive.year === 2019 ? <p>The board prints an asterisk for Q28. The practice quiz scores D because thermal conductivity is a material property.</p> : <p>For Q30, the board lists C. Practice uses A because surface tension requires higher pressure inside a soap bubble. <a href="https://www.physics.umd.edu/courses/Phys405/Boyd/ajp00917.pdf">See the pressure calculation</a>.</p>}
          <table className={styles.table}>
            <thead><tr><th scope="col">Question</th>{showOriginalSlo && <th scope="col">Original SLO</th>}<th scope="col">Board answer</th>{scoredPaper && <th scope="col">Practice scoring adjustment</th>}<th scope="col">Cognitive level</th></tr></thead>
            <tbody>{answerKey.map(row => <tr key={row.number}>
              <th scope="row"><Link href={'/past-papers/PHY-IX-' + physicsArchive.year + '-P1?view=solved#question-' + row.number}>Q{row.number}</Link></th>
              {showOriginalSlo && <td>{row.slo}</td>}<td>{row.letter}</td>{scoredPaper && <td>{practiceAnswers.get(row.number) ?? '—'}</td>}<td>{({ K: 'Knowledge', U: 'Understanding', A: 'Application' } as Record<string, string>)[row.level]}</td>
            </tr>)}</tbody>
          </table>
        </div> : <div className={styles.digital}>
          <p>AKU-EB commentary and examples of stronger and weaker responses. The original PDF includes the board’s full notes.</p>
          {marking.map(note => <details key={note.number} className={styles.practicalStage}>
            <summary>Question {note.number} · {note.marks} marks</summary>
            <p><Link href={'/past-papers/PHY-IX-' + physicsArchive.year + '-P2?view=solved#question-' + note.number}>Open question</Link> · <a href={note.example.pdf}>PDF page {note.page}</a></p>
            <h3>Checking hints</h3><p>{note.checking}</p>
            <h3>Stronger response</h3><p>{note.better}</p>
            <img src={note.example.better} alt={'Stronger candidate response for Q' + note.number} loading="lazy" style={{ maxWidth: '100%' }} />
            <h3>Weaker response</h3><p>{note.weaker}</p>
            <img src={note.example.weaker} alt={'Weaker candidate response for Q' + note.number} loading="lazy" style={{ maxWidth: '100%' }} />
          </details>)}
        </div>}
      </DocumentViews>
    </section>;
  }
  const study = hsscBiologyStudyResources.find(item => item.href === '/resources/' + resource);
  if (study) return <BiologyStudyResource resource={study} original={(await searchParams)?.view === 'original'} />;
  const xiBiology = biologyXiAnnualArchives.find(archive => archive.resources.some(item => item.href === '/resources/' + resource));
  if (xiBiology) {
    const { year, root, resources, key, marking, papers: [mcqPaper] } = xiBiology;
    const mcqMetadata = new Map(mcqPaper.questions.map(question => [question.questionNumber, question.sourceRegion]));
    const isKey = resource.endsWith('-key');
    const title = `Biology Class XI · ${year} ${isKey ? 'Official MCQ Key' : 'E-marking Notes'}`;
    const original = root + (isKey ? 'key.pdf' : 'emarking.pdf');
    return <section className={styles.page}>
      <p><Link href="/akueb/XI/biology/pastpapers">Class XI Biology past papers</Link></p>
      <h1>{title}</h1>
      <DocumentViews original={original} title={title} continuousPdf
        digitalLabel={isKey ? 'Digital Answer Key' : 'Digital Notes'}
        initialView={(await searchParams)?.view === 'original' ? 'original' : 'digital'}
        resourceLinks={<PaperResourceNav tabs={resources} current={'/resources/' + resource} inline />}>
        {isKey ? <div style={{ overflowX: 'auto' }}>
          {year === 2022 && <p>The original key PDF covers Theory (Q1–50). The Alternate to Practical answers (Q51–65) come from the <a href={biologyXi2022VerificationReport}>AKU-EB verification report</a>.</p>}
          <table className={styles.table}>
            <thead><tr><th scope="col">Question</th>{year > 2019 && <th scope="col">Original SLO</th>}<th scope="col">Board answer</th><th scope="col">Cognitive level</th></tr></thead>
            <tbody>{key.map(row => {
              const review = year === 2021 ? biologyXi2021AnswerReview[row.number] : undefined;
              const extraChoices = paperScoringAnswers(mcqMetadata.get(row.number) ?? {}, row.choices).filter(choice => !row.answer.includes(choice));
              return <tr key={row.number}>
                <th scope="row"><Link href={`/past-papers/BIO-XI-${year}-P1?view=solved#question-${row.number}`}>Q{row.number}</Link></th>
                {year > 2019 && <td>{row.originalSlo}</td>}
                <td>{row.answer.join(' or ')}{row.universal ? ' · Any option earns credit' : extraChoices.length > 0 && <>
                  {' · Also accepted in practice '}{review ? <a href={review.source}>{extraChoices.join(' or ')}</a> : extraChoices.join(' or ')}
                </>}</td>
                <td>{row.level}</td>
              </tr>;
            })}</tbody>
          </table>
        </div> : <div className={styles.digital}>
          <p>{year <= 2019
            ? 'AKU-EB commentary and examples of stronger and weaker candidate responses for Paper II.'
            : 'AKU-EB checking hints, commentary, and candidate response examples for Paper II. The original PDF also includes the teaching suggestions and annexures.'}</p>
          {marking.map(note => <details key={note.number} className={styles.practicalStage}>
            <summary>Question {note.number}{note.originalSlo && ` · Original SLO ${note.originalSlo}`}</summary>
            <p><Link href={`/past-papers/BIO-XI-${year}-P2#question-${note.number}`}>Open question</Link> · <a href={`${original}#page=${note.page}`}>PDF page {note.page}</a></p>
            {note.hints && <h3>Checking hints</h3>}
            {year === 2025 && note.number === '1' && <p>The exam paper assigns 4 marks to this question. The e-marking table lists 3, while the individual checking hints add up to 4.</p>}
            {note.hints && <StructuredContent text={note.hints} />}
            {note.overall && <><h3>Overall performance</h3><StructuredContent text={note.overall} /></>}
            <h3>Stronger response</h3>
            <StructuredContent text={note.better} />
            {note.images.better && <img src={note.images.better} alt={`Stronger response for Q${note.number}`} loading="lazy" style={{ maxWidth: '100%' }} />}
            <h3>Weaker response</h3>
            <StructuredContent text={note.weaker} />
            {note.images.weaker && <img src={note.images.weaker} alt={`Weaker response for Q${note.number}`} loading="lazy" style={{ maxWidth: '100%' }} />}
          </details>)}
        </div>}
      </DocumentViews>
    </section>;
  }
  const mathMarking = /^mathematics-(ix|x)-(201[789]|202[345])-emarking$/.exec(resource);
  const bioMarking = /^biology-(ix|x)-(2017|2018|2019|202[345])-emarking$/.exec(resource);
  if (bioMarking) {
    const [, grade, year] = bioMarking;
    const roman = grade.toUpperCase();
    const code = `BIO-${roman}-${year}-P2`;
    const localArchive = year === '2024' && grade === 'ix' ? { tabs: biology2024Archive, root: biology2024PdfRoot }
      : year === '2017' && grade === 'x' ? { tabs: biologyX2017Archive, root: biologyX2017PdfRoot }
      : year === '2018' && grade === 'x' ? { tabs: biologyX2018Archive, root: biologyX2018PdfRoot }
      : year === '2019' && grade === 'x' ? { tabs: biologyX2019Archive, root: biologyX2019PdfRoot }
      : year === '2023' && grade === 'x' ? { tabs: biologyX2023Archive, root: biologyX2023PdfRoot }
      : year === '2024' && grade === 'x' ? { tabs: biologyX2024Archive, root: biologyX2024PdfRoot }
      : year === '2025' && grade === 'x' ? { tabs: biologyX2025Archive, root: biologyX2025PdfRoot } : null;
    const paper = localArchive ? await prisma.pastPaper.findFirst({
      where: { paperCode: code, verificationStatus: 'REVIEWED_WITH_SOURCE_NOTES' },
      select: { paperCode: true, questions: { select: { id: true, questionNumber: true, questionText: true, sourceRegion: true } } },
    }) : getFallbackPaper(code);
    const original = localArchive ? localArchive.root + 'emarking.pdf'
      : safeDocumentUrl(paperMetadata(paper?.questions[0]?.sourceRegion).original_reference_source);
    if (!paper || !original) notFound();
    const paperPath = '/past-papers/' + paper.paperCode;
    const base = `/akueb/${roman}/biology`;
    const title = `Biology ${roman} · ${year} · E-marking notes`;
    return (
      <section className={styles.page}>
        <Link href={base + '/pastpapers'}>← Biology past papers</Link>
        <h1>{title}</h1>
        <DocumentViews title={title} original={original} resourceLinks={localArchive ? <PaperResourceNav tabs={localArchive.tabs} current={'/resources/' + resource} inline /> : <Link href={paperPath}>Paper 2</Link>}>
          <div className={styles.digital}>
            {[...paper.questions].sort((a, b) => String(a.questionNumber).localeCompare(String(b.questionNumber), undefined, { numeric: true })).map(question => {
              const meta = paperMetadata(question.sourceRegion);
              const sloGrade = meta.mapping_scope?.grade;
              const sloBase = sloGrade === 9 || sloGrade === 10
                ? `/akueb/${sloGrade === 9 ? 'IX' : 'X'}/biology`
                : base;
              return (
                <article key={question.id}>
                  <h2>Question {question.questionNumber}</h2>
                  {meta.choice_instruction && <p>{meta.choice_instruction}</p>}
                  <StructuredContent text={question.questionText} />
                  <p>
                    {meta.current_slo && <><Link href={`${sloBase}/syllabus#slo-${meta.current_slo}`}>SLO {meta.current_slo}</Link> · </>}
                    Cognitive level {meta.cognitive_level} · <Link href={`${paperPath}#question-${question.questionNumber}`}>Open in Paper 2</Link>
                  </p>
                  <h3>Project worked solution</h3>
                  <StructuredContent text={meta.model_answer || ''} />
                  {meta.official_marking_notes && <>
                    <h3>Board marking guidance</h3>
                    <StructuredContent text={meta.official_marking_notes} />
                  </>}
                  {(['better', 'weaker'] as const).map(kind => {
                    const src = safeDocumentUrl(meta[`${kind}_response_image`]);
                    const label = kind === 'better' ? 'Stronger response' : 'Weaker response';
                    return src && <figure key={kind}>
                      <figcaption>{label}</figcaption>
                      <img src={src} alt={`${label} for question ${question.questionNumber}`} loading="lazy" style={{ maxWidth: '100%', height: 'auto' }} />
                    </figure>;
                  })}
                </article>
              );
            })}
          </div>
        </DocumentViews>
      </section>
    );
  }
  if (mathMarking) {
    const [, grade, year] = mathMarking;
    const roman = grade.toUpperCase();
    const paper = getFallbackPaper(`MTH-${roman}-${year}-P2`);
    const original = safeDocumentUrl(paper?.questions[0]?.sourceRegion.original_reference_source);
    if (!paper || !original) notFound();
    const paperPath = '/past-papers/' + paper.paperCode;
    const base = `/akueb/${roman}/mathematics`;
    const title = `Mathematics ${roman} · ${year} · E-marking notes`;
    return (
      <section className={styles.page}>
        <Link href={base + '/pastpapers'}>← Mathematics past papers</Link>
        <h1>{title}</h1>
        <DocumentViews title={title} original={original} resourceLinks={<Link href={paperPath}>Paper 2</Link>}>
          <div className={styles.digital}>
            {uniqueQuestions(paper.questions).map(question => {
              const meta = question.sourceRegion;
              const sloGrade = meta.mapping_scope?.grade;
              const sloBase = sloGrade === 9 || sloGrade === 10
                ? `/akueb/${sloGrade === 9 ? 'IX' : 'X'}/mathematics`
                : base;
              return (
                <article key={question.id}>
                  <h2>Question {question.questionNumber}</h2>
                  <StructuredContent text={question.questionText} />
                  <p>
                    {meta.current_slo && <><Link href={`${sloBase}/syllabus#slo-${meta.current_slo}`}>SLO {meta.current_slo}</Link> · </>}
                    Cognitive level {meta.cognitive_level} · <Link href={`${paperPath}#question-${question.questionNumber}`}>Open in Paper 2</Link>
                  </p>
                  <h3>Worked solution</h3>
                  <StructuredContent text={meta.model_answer || ''} />
                  {(['better', 'weaker'] as const).map(kind => {
                    const src = safeDocumentUrl(meta[`${kind}_response_image`]);
                    const label = kind === 'better' ? 'Stronger response' : 'Weaker response';
                    return src && <figure key={kind}>
                      <figcaption>{label}</figcaption>
                      <img src={src} alt={`${label} for question ${question.questionNumber}`} loading="lazy" style={{ maxWidth: '100%', height: 'auto' }} />
                    </figure>;
                  })}
                </article>
              );
            })}
          </div>
        </DocumentViews>
      </section>
    );
  }
  const markingPath = '/resources/' + resource;
  const annualMarking = hsscXiAnnualResources.find(item => item.href === markingPath && item.original);
  if (annualMarking) {
    const paper = hsscXiAnnualPapers.find(item => item.paperCode === 'PHY-XI-' + annualMarking.year + '-P2')!;
    const paperPath = '/past-papers/' + paper.paperCode;
    const title = 'Physics XI · ' + annualMarking.year + ' · E-marking notes';
    return (
      <section className={styles.page}>
        <Link href="/akueb/XI/physics/pastpapers">← Physics past papers</Link>
        <h1>{title}</h1>
        <DocumentViews title={title} original={annualMarking.original} resourceLinks={<PaperResourceNav tabs={hsscXiAnnualResources.filter(item => item.year === annualMarking.year)} current={markingPath} inline />}>
          <div className={styles.digital}>
            {uniqueQuestions(paper.questions).map(question => {
              const number = question.questionNumber;
              const examples = question.sourceRegion.emarkingExamples ?? [];
              const alternatives = question.questionText.split(/(?:^EITHER|\bOR)\s*\n[ab]\.\s*/);
              return examples.map((item, index) => (
                <article key={item.part} id={'question-' + item.part}>
                  <h2>Question {item.part}</h2>
                  <StructuredContent text={alternatives[index + 1] ?? question.questionText} />
                  <p>
                    {item.currentSlo && <Link href={'/akueb/' + (item.currentSlo.grade === 12 ? 'XII' : 'XI') + '/physics/syllabus#slo-' + item.currentSlo.code}>SLO {item.currentSlo.code}</Link>}
                    {item.currentSlo && item.level && ' · '}
                    {item.level && 'Cognitive level ' + item.level}
                  </p>
                  <p><Link href={paperPath + '#question-' + number}>Open this question in Paper 2</Link></p>
                  <h3>Worked solution</h3>
                  <StructuredContent text={item.solution} />
                  {(['better', 'weaker'] as const).map(kind => (
                    <figure key={kind}>
                      <figcaption>{kind === 'better' ? 'Stronger response' : 'Weaker response'}</figcaption>
                      <img src={item[kind]} alt={(kind === 'better' ? 'Stronger' : 'Weaker') + ' board response for question ' + item.part} loading="lazy" style={{ maxWidth: '100%', height: 'auto' }} />
                    </figure>
                  ))}
                  <p><a href={item.pdf}>Checking hints in the original notes</a></p>
                </article>
              ));
            })}
          </div>
        </DocumentViews>
      </section>
    );
  }
  if (!SUPPORTED_RESOURCES.includes(resource as any)) notFound();

  if (resource === 'biology-x-2024-key' || resource === 'biology-x-2021-key' || resource === 'biology-x-2019-key' || resource === 'biology-x-2018-key' || resource === 'biology-x-2017-key') {
    const year = resource === 'biology-x-2017-key' ? '2017' : resource === 'biology-x-2018-key' ? '2018' : resource === 'biology-x-2019-key' ? '2019' : resource === 'biology-x-2021-key' ? '2021' : '2024';
    const keyData = resource === 'biology-x-2017-key' ? bioKeyX2017 : resource === 'biology-x-2018-key' ? bioKeyX2018 : resource === 'biology-x-2019-key' ? bioKeyX2019 : resource === 'biology-x-2021-key' ? bioKeyX2021 : bioKeyX2024;
    const title = `Biology X · ${year} · Official answer key`;
    const original = `/materials/ssc/biology/ssc-2/biology-x-${year}-keys.pdf`;
    return (
      <section className={styles.page}>
        <Link href="/akueb/X/biology/pastpapers">← Biology X past papers</Link>
        <h1>{title}</h1>
        <DocumentViews title={title} original={original} resourceLinks={<>
            <Link href={`/past-papers/BIO-X-${year}-P1`}>Paper 1</Link>
            {year !== '2021' && <Link href={`/past-papers/BIO-X-${year}-P2`}>Paper 2</Link>}
        </>}>
          <div className={styles.digital}>
            <div style={{overflowX:'auto'}}>
              <table style={{width:'100%',borderCollapse:'collapse'}}>
                <caption>Official {year} SSC-II exam-year references · current 2025 syllabus mappings are shown on each question</caption>
                <thead>
                  <tr>
                    {['Question','Original SLO','Official Key','Verified Key','Level','Notes'].map(x=>(
                      <th key={x} style={{textAlign:'left',padding:'.75rem',borderBottom:'1px solid var(--border-color)'}}>{x}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {keyData.map((row: any)=>(
                    <tr key={row.questionNumber}>
                      <td style={{padding:'.65rem',borderBottom:'1px solid var(--border-color)'}}>{row.questionNumber}</td>
                      <td style={{padding:'.65rem',borderBottom:'1px solid var(--border-color)'}}>{row.originalSlo}</td>
                      <td style={{padding:'.65rem',borderBottom:'1px solid var(--border-color)'}}><strong>{row.officialKey}</strong></td>
                      <td style={{padding:'.65rem',borderBottom:'1px solid var(--border-color)'}}><strong>{row.verifiedKey}</strong></td>
                      <td style={{padding:'.65rem',borderBottom:'1px solid var(--border-color)'}}>{row.cognitiveLevel}</td>
                      <td style={{padding:'.65rem',borderBottom:'1px solid var(--border-color)'}}>{row.note || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p>K: Knowledge · U: Understanding · A: Application and beyond</p>
            <Link href={`/past-papers/BIO-X-${year}-P1?view=solved`}>Paper 1 · answers & explanations →</Link>
          </div>
        </DocumentViews>
      </section>
    );
  }
  if (resource === 'biology-ix-2025-key' || resource === 'biology-ix-2023-key') {
    const is2023 = resource === 'biology-ix-2023-key';
    const year = is2023 ? '2023' : '2025';
    const keyData = is2023 ? bioKey2023 : bioKey2025;
    const title = `Biology IX · ${year} · Official answer key`;
    const original = `/materials/ssc/biology/ssc-1/biology-ix-${year}-keys.pdf`;
    return (
      <section className={styles.page}>
        <Link href="/akueb/IX/biology/pastpapers">← Biology IX past papers</Link>
        <h1>{title}</h1>
        <DocumentViews title={title} original={original} resourceLinks={<>
            <Link href={`/past-papers/BIO-IX-${year}-P1`}>Paper 1</Link>
            <Link href={`/past-papers/BIO-IX-${year}-P2`}>Paper 2</Link>
        </>}>
          <div className={styles.digital}>
            <div style={{overflowX:'auto'}}>
              <table style={{width:'100%',borderCollapse:'collapse'}}>
                <caption>Official {year} SSC-I exam-year references · current 2025 syllabus mappings are shown on each question</caption>
                <thead>
                  <tr>
                    {['Question','Original SLO','Answer','Level'].map(x=>(
                      <th key={x} style={{textAlign:'left',padding:'.75rem',borderBottom:'1px solid var(--border-color)'}}>{x}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {keyData.map((row: any)=>(
                    <tr key={row.question}>
                      <td style={{padding:'.65rem',borderBottom:'1px solid var(--border-color)'}}>{row.question}</td>
                      <td style={{padding:'.65rem',borderBottom:'1px solid var(--border-color)'}}>{row.oldSlo}</td>
                      <td style={{padding:'.65rem',borderBottom:'1px solid var(--border-color)'}}><strong>{row.answer}</strong></td>
                      <td style={{padding:'.65rem',borderBottom:'1px solid var(--border-color)'}}>{row.level}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p>K: Knowledge · U: Understanding · A: Application and beyond</p>
            <Link href={`/past-papers/BIO-IX-${year}-P1?view=solved`}>Paper 1 · answers & explanations →</Link>
          </div>
        </DocumentViews>
      </section>
    );
  }

  if (resource === 'physics-ix-2025-key') {
    const title = 'Physics IX · 2025 · Official answer key';
    const decisions = await publishedAnswerDecisions();
    return (
      <section className={styles.page}>
        <Link href="/akueb/IX/physics/pastpapers">← Physics past papers</Link>
        <h1>{title}</h1>
        <DocumentViews title={title} original={key.sourceUrl} resourceLinks={<PaperResourceNav tabs={physicsIx2025PaperTabs} current="/resources/physics-ix-2025-key" inline />}>
          <div className={styles.digital}>
            <div style={{overflowX:'auto'}}>
              <table style={{width:'100%',borderCollapse:'collapse'}}>
                <caption>Official exam-year references · current syllabus mappings are separate</caption>
                <thead>
                  <tr>
                    {['Question','Original SLO','Answer','Level'].map(x=>(
                      <th key={x} style={{textAlign:'left',padding:'.75rem',borderBottom:'1px solid var(--border-color)'}}>{x}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {key.entries.map(row=>(
                    <tr key={row.questionNumber}>
                      <td style={{padding:'.65rem'}}>
                        <Link href={'/past-papers/PHY-IX-2025-P1?view=solved#question-'+row.questionNumber}>{row.questionNumber}</Link>
                      </td>
                      <td>{row.slo}</td>
                      <td>
                        {row.answer}
                        {decisions.find(item=>item.number===row.questionNumber&&item.status==='APPROVE_CORRECTION')&&(
                          <p>Admin-approved correction: {decisions.find(item=>item.number===row.questionNumber)?.answer}. The answer sheet remains {row.answer}.</p>
                        )}
                        {annualAnswerReviews[row.questionNumber] && (
                          <details><summary>Answer review</summary>{annualAnswerReviews[row.questionNumber]}</details>
                        )}
                      </td>
                      <td>{row.cognitiveLevel}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p>K: Knowledge · U: Understanding · A: Application and beyond</p>
          </div>
        </DocumentViews>
      </section>
    );
  }

  if (resource === 'physics-ix-2024-key') {
    const title = 'Physics IX · 2024 · Official answer key';
    return (
      <section className={styles.page}>
        <Link href="/akueb/IX/physics/pastpapers">← Physics past papers</Link>
        <h1>{title}</h1>
        <DocumentViews title={title} original={key2024.sourceUrl} resourceLinks={<PaperResourceNav tabs={physicsIx2024PaperTabs} current="/resources/physics-ix-2024-key" inline />}>
          <div className={styles.digital}>
            <div style={{overflowX:'auto'}}>
              <table style={{width:'100%',borderCollapse:'collapse'}}>
                <caption>Official 2024 exam-year references · current 2025 syllabus mappings are separate</caption>
                <thead>
                  <tr>
                    {['Question','Original SLO','Answer','Level'].map(x=>(
                      <th key={x} style={{textAlign:'left',padding:'.75rem',borderBottom:'1px solid var(--border-color)'}}>{x}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {key2024.entries.map(row=>(
                    <tr key={row.questionNumber}>
                      <td style={{padding:'.65rem'}}>
                        <Link href={'/past-papers/PHY-IX-2024-P1?view=solved#question-'+row.questionNumber}>{row.questionNumber}</Link>
                      </td>
                      <td>{row.slo}</td>
                      <td>
                        <strong>{row.answer}</strong>
                        {annual2024AnswerReviews[row.questionNumber] && (
                          <details><summary>Source key note</summary>{annual2024AnswerReviews[row.questionNumber]}</details>
                        )}
                      </td>
                      <td>{row.cognitiveLevel}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p>K: Knowledge · U: Understanding · A: Application and beyond</p>
          </div>
        </DocumentViews>
      </section>
    );
  }

  if (resource === 'physics-x-2025-key') {
    const title = 'Physics X · 2025 · Official answer key';
    return (
      <section className={styles.page}>
        <Link href="/akueb/X/physics/pastpapers">← Physics X past papers</Link>
        <h1>{title}</h1>
        <DocumentViews title={title} original={keyX2025.sourceUrl} resourceLinks={<>
            <Link href="/past-papers/PHY-X-2025-P1">2025 Paper 1</Link>
            <Link href="/past-papers/PHY-X-2025-P2">2025 Paper 2</Link>
            <Link href="/resources/physics-x-2025-emarking">2025 E-marking notes</Link>
        </>}>
          <div className={styles.digital}>
            <div style={{overflowX:'auto'}}>
              <table style={{width:'100%',borderCollapse:'collapse'}}>
                <caption>Official 2025 SSC-II exam-year references · current 2025 syllabus mappings are shown on each question</caption>
                <thead>
                  <tr>
                    {['Question','Original SLO','Answer','Level'].map(x=>(
                      <th key={x} style={{textAlign:'left',padding:'.75rem',borderBottom:'1px solid var(--border-color)'}}>{x}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {keyX2025.entries.map(row=>(
                    <tr key={row.questionNumber}>
                      <td style={{padding:'.65rem'}}>
                        <Link href={'/past-papers/PHY-X-2025-P1?view=solved#question-'+row.questionNumber}>{row.questionNumber}</Link>
                      </td>
                      <td>{row.slo}</td>
                      <td>
                        <strong>{row.answer}</strong>
                        {annualX2025AnswerReviews[row.questionNumber] && (
                          <details><summary>Educator review note</summary>{annualX2025AnswerReviews[row.questionNumber]}</details>
                        )}
                      </td>
                      <td>{row.cognitiveLevel}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p>K: Knowledge · U: Understanding · A: Application and beyond</p>
            <Link href="/past-papers/PHY-X-2025-P1?view=solved">2025 Class X Paper 1 · answers & explanations →</Link>
          </div>
        </DocumentViews>
      </section>
    );
  }

  if (resource === 'computer-science-ix-2025-key' || resource === 'computer-science-ix-2024-key' || resource === 'computer-science-ix-2023-key' || resource === 'computer-science-ix-2022-key' || resource === 'computer-science-ix-2019-key' || resource === 'computer-science-ix-2017-key' || resource === 'computer-science-x-2025-key' || resource === 'computer-science-x-2024-key' || resource === 'computer-science-x-2023-key' || resource === 'computer-science-x-2022-key' || resource === 'computer-science-x-2019-key' || resource === 'computer-science-x-2017-key') {
    const isCsX2025Key = resource === 'computer-science-x-2025-key';
    const isCsX2024Key = resource === 'computer-science-x-2024-key';
    const isCsX2023Key = resource === 'computer-science-x-2023-key';
    const isCsX2022Key = resource === 'computer-science-x-2022-key';
    const isCsX2019Key = resource === 'computer-science-x-2019-key';
    const isCsX2017Key = resource === 'computer-science-x-2017-key';
    const isCsXKey = isCsX2025Key || isCsX2024Key || isCsX2023Key || isCsX2022Key || isCsX2019Key || isCsX2017Key;
    const isCs2017Key = resource === 'computer-science-ix-2017-key' || resource === 'computer-science-x-2017-key';
    const isCs2019Key = resource === 'computer-science-ix-2019-key' || resource === 'computer-science-x-2019-key';
    const isCs2022Key = resource === 'computer-science-ix-2022-key' || resource === 'computer-science-x-2022-key';
    const isCs2023Key = resource === 'computer-science-ix-2023-key';
    const isCs2024Key = resource === 'computer-science-ix-2024-key';
    const activeCsKey = isCsX2017Key ? csXKey2017 : isCsX2019Key ? csXKey2019 : isCsX2022Key ? csXKey2022 : isCsX2023Key ? csXKey2023 : isCsX2024Key ? csXKey2024 : isCsX2025Key ? csXKey2025 : isCs2017Key ? csKey2017 : isCs2019Key ? csKey2019 : isCs2022Key ? csKey2022 : isCs2023Key ? csKey2023 : isCs2024Key ? csKey2024 : csKey2025;
    const activeCsReviews = isCsX2019Key ? csAnnualX2019AnswerReviews : isCsX2023Key ? csAnnualX2023AnswerReviews : isCsX2024Key ? csAnnualX2024AnswerReviews : (isCsX2022Key || isCsX2025Key || isCs2017Key || isCs2019Key) ? ({} as Record<number, string>) : isCs2022Key ? csAnnual2022AnswerReviews : isCs2023Key ? csAnnual2023AnswerReviews : isCs2024Key ? csAnnual2024AnswerReviews : csAnnual2025AnswerReviews;
    const csYear = isCs2017Key ? '2017' : isCs2019Key ? '2019' : isCs2022Key ? '2022' : (isCs2023Key || isCsX2023Key) ? '2023' : (isCs2024Key || isCsX2024Key) ? '2024' : '2025';
    const csRoman = isCsXKey ? 'X' : 'IX';
    const csLower = isCsXKey ? 'x' : 'ix';
    const title = `Computer Science ${csRoman} · ${csYear} · Official answer key`;
    return (
      <section className={styles.page}>
        <Link href={`/akueb/${csRoman}/computer-science/pastpapers`}>← Computer Science {csRoman} past papers</Link>
        <h1>{title}</h1>
        <DocumentViews title={title} original={activeCsKey.sourceUrl} resourceLinks={<>
            <Link href={`/past-papers/CS-${csRoman}-${csYear}-P1`}>{csYear} Paper 1</Link>
            {!isCs2022Key && <Link href={`/past-papers/CS-${csRoman}-${csYear}-P2`}>{csYear} Paper 2</Link>}
            {!isCs2022Key && <Link href={`/resources/computer-science-${csLower}-${csYear}-emarking`}>{csYear} E-marking notes</Link>}
        </>}>
          <div className={styles.digital}>
            <div style={{overflowX:'auto'}}>
              <table style={{width:'100%',borderCollapse:'collapse'}}>
                <caption>Official {csYear} SSC-{isCsXKey ? 'II' : 'I'} exam-year references · current 2025 syllabus mappings are shown on each question</caption>
                <thead>
                  <tr>
                    {['Question','Original SLO','Answer','Level'].map(x=>(
                      <th key={x} style={{textAlign:'left',padding:'.75rem',borderBottom:'1px solid var(--border-color)'}}>{x}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {activeCsKey.entries.map(row=>(
                    <tr key={row.questionNumber}>
                      <td style={{padding:'.65rem'}}>
                        <Link href={`/past-papers/CS-${csRoman}-${csYear}-P1?view=solved#question-${row.questionNumber}`}>{row.questionNumber}</Link>
                      </td>
                      <td>{row.slo}</td>
                      <td>
                        <strong>{row.answer}</strong>
                        {activeCsReviews[row.questionNumber] && (
                          <details><summary>Educator review note</summary>{activeCsReviews[row.questionNumber]}</details>
                        )}
                      </td>
                      <td>{row.cognitiveLevel}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p>K: Knowledge · U: Understanding · A: Application and beyond</p>
            <Link href={`/past-papers/CS-${csRoman}-${csYear}-P1?view=solved`}>{csYear} Computer Science Paper 1 · answers & explanations →</Link>
          </div>
        </DocumentViews>
      </section>
    );
  }

  if (resource.startsWith('chemistry-') && resource.endsWith('-key')) {
    const isChemXKey = resource.startsWith('chemistry-x-');
    const chemYear = resource.split('-')[2];
    const activeChemKey: any = chemYear === '2025' ? (isChemXKey ? chemXKey2025 : chemKey2025) : chemYear === '2024' ? (isChemXKey ? chemXKey2024 : chemKey2024) : chemYear === '2023' ? (isChemXKey ? chemXKey2023 : chemKey2023) : chemYear === '2022' ? chemKey2022 : chemYear === '2021' ? chemKey2021 : chemYear === '2019' ? chemKey2019 : chemYear === '2018' ? chemKey2018 : chemKey2017;
    const chemRoman = isChemXKey ? 'X' : 'IX';
    const chemLower = isChemXKey ? 'x' : 'ix';
    const hasPaper2 = chemYear !== '2021' && chemYear !== '2022';
    const hasEmarking = hasPaper2;
    const title = `Chemistry ${chemRoman} · ${chemYear} · Official answer key`;
    return (
      <section className={styles.page}>
        <Link href={`/akueb/${chemRoman}/chemistry/pastpapers`}>← Chemistry {chemRoman} past papers</Link>
        <h1>{title}</h1>
        <DocumentViews title={title} original={activeChemKey.sourceUrl} resourceLinks={<>
            <Link href={`/past-papers/CHM-${chemRoman}-${chemYear}-P1`}>{chemYear} Paper 1</Link>
            {hasPaper2 && <Link href={`/past-papers/CHM-${chemRoman}-${chemYear}-P2`}>{chemYear} Paper 2</Link>}
            {hasEmarking && <Link href={`/resources/chemistry-${chemLower}-${chemYear}-emarking`}>{chemYear} E-marking notes</Link>}
        </>}>
          <div className={styles.digital}>
            <div style={{overflowX:'auto'}}>
              <table style={{width:'100%',borderCollapse:'collapse'}}>
                <caption>Official {chemYear} SSC-{isChemXKey ? 'II' : 'I'} exam-year references · current 2025 syllabus mappings are shown on each question</caption>
                <thead>
                  <tr>
                    {['Question','Original SLO','Answer','Level'].map(x=>(
                      <th key={x} style={{textAlign:'left',padding:'.75rem',borderBottom:'1px solid var(--border-color)'}}>{x}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {activeChemKey.entries.map((row: any)=>(
                    <tr key={row.questionNumber}>
                      <td style={{padding:'.65rem'}}>
                        <Link href={`/past-papers/CHM-${chemRoman}-${chemYear}-P1?view=solved#question-${row.questionNumber}`}>{row.questionNumber}</Link>
                      </td>
                      <td>{row.slo}</td>
                      <td><strong>{row.answer}</strong></td>
                      <td>{row.cognitiveLevel}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p>K: Knowledge · U: Understanding · A: Application and beyond</p>
            <Link href={`/past-papers/CHM-${chemRoman}-${chemYear}-P1?view=solved`}>{chemYear} Chemistry Paper 1 · answers & explanations →</Link>
          </div>
        </DocumentViews>
      </section>
    );
  }

  if (resource === 'physics-ix-2025-emarking' || resource === 'physics-ix-2024-emarking' || resource === 'physics-x-2025-emarking' || resource === 'computer-science-ix-2025-emarking' || resource === 'computer-science-ix-2024-emarking' || resource === 'computer-science-ix-2023-emarking' || resource === 'computer-science-ix-2019-emarking' || resource === 'computer-science-ix-2018-emarking' || resource === 'computer-science-ix-2017-emarking' || resource === 'computer-science-x-2025-emarking' || resource === 'computer-science-x-2024-emarking' || resource === 'computer-science-x-2023-emarking' || resource === 'computer-science-x-2019-emarking' || resource === 'computer-science-x-2018-emarking' || resource === 'computer-science-x-2017-emarking' || resource === 'chemistry-ix-2025-emarking' || resource === 'chemistry-ix-2024-emarking' || resource === 'chemistry-ix-2023-emarking' || resource === 'chemistry-ix-2019-emarking' || resource === 'chemistry-ix-2018-emarking' || resource === 'chemistry-ix-2017-emarking' || resource === 'chemistry-x-2025-emarking' || resource === 'chemistry-x-2024-emarking' || resource === 'chemistry-x-2023-emarking') {
    const isCs = resource.startsWith('computer-science-');
    const isChem = resource.startsWith('chemistry-');
    const isX = resource === 'physics-x-2025-emarking' || (isCs && resource.includes('-x-')) || (isChem && resource.includes('-x-'));
    const is2017 = resource.includes('-2017-emarking');
    const is2018 = resource.includes('-2018-emarking');
    const is2019 = resource.includes('-2019-emarking');
    const is2023 = resource.includes('-2023-emarking');
    const is2024 = resource.includes('-2024-emarking');
    const activeEmarking: any = isChem ? (isX ? (is2023 ? chemXEmarking2023 : is2024 ? chemXEmarking2024 : chemXEmarking2025) : is2017 ? chemEmarking2017 : is2018 ? chemEmarking2018 : is2019 ? chemEmarking2019 : is2023 ? chemEmarking2023 : is2024 ? chemEmarking2024 : chemEmarking2025) : isCs ? (isX ? (is2017 ? csXEmarking2017 : is2018 ? csXEmarking2018 : is2019 ? csXEmarking2019 : is2023 ? csXEmarking2023 : is2024 ? csXEmarking2024 : csXEmarking2025) : is2017 ? csEmarking2017 : is2018 ? csEmarking2018 : is2019 ? csEmarking2019 : is2023 ? csEmarking2023 : is2024 ? csEmarking2024 : csEmarking2025) : isX ? emarkingX2025 : is2024 ? emarking2024 : emarking;
    const yearStr = is2017 ? '2017' : is2018 ? '2018' : is2019 ? '2019' : is2023 ? '2023' : is2024 ? '2024' : '2025';
    const roman = isX ? 'X' : 'IX';
    const subjTitle = isChem ? 'Chemistry' : isCs ? 'Computer Science' : 'Physics';
    const subjSlug = isChem ? 'chemistry' : isCs ? 'computer-science' : 'physics';
    const pPrefix = isChem ? 'CHM' : isCs ? 'CS' : 'PHY';
    const title = `${subjTitle} ${roman} · ${yearStr} · E-Marking Notes (Questions & Solved Better Responses)`;
    return (
      <section className={styles.page}>
        <Link href={`/akueb/${roman}/${subjSlug}/pastpapers`}>← {subjTitle} {roman} past papers</Link>
        <h1>{title}</h1>
        <DocumentViews title={title} original={activeEmarking.sourceUrl} resourceLinks={<>
            {!(isCs && is2018) && <Link href={`/past-papers/${pPrefix}-${roman}-${yearStr}-P1`}>{yearStr} Paper 1</Link>}
            <Link href={`/past-papers/${pPrefix}-${roman}-${yearStr}-P2`}>{yearStr} Paper 2</Link>
            {!(isCs && is2018) && <Link href={`/resources/${subjSlug}-${roman.toLowerCase()}-${yearStr}-key`}>{yearStr} Official answer key</Link>}
        </>}>
          <div
            style={{
              background: '#ffffff',
              border: '2px solid #111827',
              borderRadius: '6px',
              boxShadow: '0 10px 30px rgba(0,0,0,0.06)',
              color: '#111827',
              overflow: 'hidden',
            }}
          >
            {/* Official E-Marking Digital Cover Header */}
            <div
              style={{
                padding: '2.25rem 2rem 1.5rem',
                borderBottom: '2px solid #111827',
                textAlign: 'center',
                background: '#ffffff',
                fontFamily: "'Times New Roman', Times, serif, system-ui",
              }}
            >
              <div style={{ fontSize: '0.9rem', fontWeight: 700, letterSpacing: '1px', color: '#4b5563', marginBottom: '0.25rem' }}>
                AGA KHAN UNIVERSITY EXAMINATION BOARD
              </div>
              <div style={{ fontSize: '1.35rem', fontWeight: 800, color: '#111827', marginBottom: '0.3rem' }}>
                Notes from E-Marking Centre on SSC-{isX ? 'II' : 'I'} {subjTitle} Annual Examinations {yearStr}
              </div>
              <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#066e4f' }}>
                Digital Edition: Questions, Marking Schemes & Solved Better Responses (2025 Syllabus Aligned)
              </div>
            </div>

            <div style={{ padding: '2rem', display: 'flex', flexDirection: 'column', gap: '2rem' }}>
              {uniqueQuestions(activeEmarking.questions).map((q: any) => {
                const reviewed = isCs ? sscComputerScienceMapping(`CS-${roman}-${yearStr}-P2`, q.questionNumber, q.outOfSyllabus ? null : q.currentSlo, q.questionText) : undefined;
                const outcome = reviewed?.current_mapping[0];
                const currentSlo = reviewed ? outcome?.code : q.currentSlo;
                const currentTopic = reviewed ? outcome?.topic : q.currentTopic;
                const syllabusClass = outcome ? outcome.grade === 9 ? 'IX' : 'X' : roman;
                const isOut = !currentSlo || (reviewed ? reviewed.out_of_syllabus : Boolean(q.outOfSyllabus));
                return (
                  <article
                    key={q.questionNumber}
                    style={{
                      padding: '1.5rem',
                      border: '1.5px solid #cbd5e1',
                      borderRadius: '12px',
                      background: '#ffffff',
                      boxShadow: '0 2px 10px rgba(0,0,0,0.02)',
                    }}
                  >
                    {/* Top Question Metadata & Current 2025 Syllabus Badge */}
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        flexWrap: 'wrap',
                        gap: '0.6rem',
                        paddingBottom: '0.85rem',
                        marginBottom: '1rem',
                        borderBottom: '1px solid #e2e8f0',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
                        <span
                          style={{
                            background: '#0f172a',
                            color: '#ffffff',
                            padding: '4px 12px',
                            borderRadius: '6px',
                            fontWeight: 800,
                            fontSize: '0.95rem',
                          }}
                        >
                          {q.questionNumber}
                        </span>
                        <span style={{ fontWeight: 700, color: '#334155', fontSize: '0.9rem' }}>
                          {q.section}
                        </span>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                        {!isOut ? (
                          <Link
                            href={`/akueb/${syllabusClass}/${subjSlug}/syllabus#slo-${currentSlo}`}
                            style={{
                              background: '#ecfdf5',
                              color: '#066e4f',
                              border: '1px solid #a7f3d0',
                              padding: '3px 10px',
                              borderRadius: '6px',
                              fontSize: '0.8rem',
                              fontWeight: 800,
                              textDecoration: 'none',
                            }}
                          >
                            2025 Syllabus: {syllabusClass !== roman ? `Class ${syllabusClass} · ` : ''}SLO {currentSlo}{currentTopic ? ` • ${currentTopic}` : ''} ↗
                          </Link>
                        ) : (
                          <span
                            style={{
                              background: '#fef2f2',
                              color: '#b91c1c',
                              border: '1px solid #fecaca',
                              padding: '3px 10px',
                              borderRadius: '6px',
                              fontSize: '0.8rem',
                              fontWeight: 800,
                            }}
                          >
                            Out of 2025 Syllabus
                          </span>
                        )}
                        {reviewed?.current_mapping.slice(1).map(item => <Link key={item.code} href={`/akueb/${item.grade === 9 ? 'IX' : 'X'}/computer-science/syllabus#slo-${item.code}`}>SLO {item.code} ↗</Link>)}
                        {reviewed?.mapping_reason && <span title={reviewed.mapping_reason}>Legacy-language practice</span>}
                        <span
                          style={{
                            background: '#f1f5f9',
                            color: '#1e293b',
                            border: '1px solid #cbd5e1',
                            padding: '3px 9px',
                            borderRadius: '6px',
                            fontSize: '0.8rem',
                            fontWeight: 700,
                          }}
                        >
                          {q.maxMarks} Marks • Level {q.cognitiveLevel}
                        </span>
                      </div>
                    </div>

                    {/* Question Stem */}
                    <div style={{ marginBottom: '1rem' }}>
                      <div style={{ fontSize: '0.8rem', fontWeight: 800, textTransform: 'uppercase', color: '#475569', marginBottom: '0.35rem' }}>
                        Question Text
                      </div>
                      <div style={{ fontSize: '1.05rem', lineHeight: 1.65, color: '#111827', fontFamily: "'Times New Roman', Times, serif, system-ui" }}>
                        <StructuredContent text={q.questionText} />
                      </div>
                    </div>

                    {q.diagramUrl && <p><Link href={`/past-papers/${pPrefix}-${roman}-${yearStr}-P2`}>View figures in Paper 2</Link></p>}

                    {/* Checking Hints (Marking Scheme) */}
                    {Array.isArray(q.checkingHints) && q.checkingHints.length > 0 && (
                      <div
                        style={{
                          background: '#f8fafc',
                          border: '1px solid #cbd5e1',
                          borderRadius: '8px',
                          padding: '0.9rem 1.15rem',
                          marginBottom: '1rem',
                        }}
                      >
                        <div style={{ fontSize: '0.84rem', fontWeight: 800, color: '#0f172a', marginBottom: '0.4rem' }}>
                          Checking Hints (Marking Scheme • {q.maxMarks} Marks)
                        </div>
                        <ul style={{ margin: 0, paddingLeft: '1.25rem', fontSize: '0.9rem', color: '#334155', lineHeight: 1.6 }}>
                          {q.checkingHints.map((h: string, i: number) => (
                            <li key={i}>
                              <StructuredContent text={h} />
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Better Response (Typeset in Clean Digital Text with LaTeX Equations — No Handwriting) */}
                    <div
                      style={{
                        background: '#f0fdf4',
                        border: '1.5px solid #86efac',
                        borderRadius: '10px',
                        padding: '1.15rem 1.35rem',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.6rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                        <span
                          style={{
                            background: '#066e4f',
                            color: '#ffffff',
                            padding: '3px 10px',
                            borderRadius: '5px',
                            fontSize: '0.8rem',
                            fontWeight: 800,
                          }}
                        >
                          ✓ BETTER RESPONSE (SOLVED MODEL ANSWER)
                        </span>
                        <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#166534' }}>
                          Full Marks ({q.maxMarks}/{q.maxMarks})
                        </span>
                      </div>
                      <div style={{ fontSize: '0.96rem', lineHeight: 1.7, color: '#14532d' }}>
                        <StructuredContent text={q.modelAnswer || q.betterResponses} />
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          </div>
        </DocumentViews>
      </section>
    );
  }

  if (resource === 'physics-ix-resource-guide' || resource === 'physics-x-resource-guide' || resource === 'chemistry-ix-resource-guide' || resource === 'chemistry-x-resource-guide') {
    const isChem = resource.startsWith('chemistry-');
    const isIX = resource.endsWith('-ix-resource-guide');
    const guide = isChem ? (isIX ? chemRg9 : chemRg10) : (isIX ? rg9 : rg10);
    const roman = isIX ? 'IX' : 'X';
    const subjTitle = isChem ? 'Chemistry' : 'Physics';
    const subjSlug = isChem ? 'chemistry' : 'physics';
    return (
      <section className={styles.page}>
        <Link href={`/akueb/${roman}/${subjSlug}`}>← {subjTitle} {roman}</Link>
        <h1>{guide.title}</h1>
        <DocumentViews title={guide.title} original={guide.sourceUrl} resourceLinks={null}>
          <div className={styles.digital}>
            <p><strong>Recommended Key Textbook:</strong> {guide.recommendedKeyTextbook}</p>
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
                  {guide.units.map((u) => (
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
            <p style={{marginTop:'1rem',fontSize:'.9rem'}}>{guide.note}</p>
          </div>
        </DocumentViews>
      </section>
    );
  }

  const isChemPacing = resource.startsWith('chemistry-');
  const isPacingIX = resource === 'physics-ix-pacing-guide' || resource === 'chemistry-ix-pacing-guide';
  const pacing: any[] = Object.values((isChemPacing ? (isPacingIX ? chemPacing9 : chemPacing10) : (isPacingIX ? pacing9 : pacing10)) as Record<string, any>);
  const roman = isPacingIX ? 'IX' : 'X';
  const pacingSubject = isChemPacing ? 'Chemistry' : 'Physics';
  const pacingSlug = isChemPacing ? 'chemistry' : 'physics';
  const pacingTitle = `${pacingSubject} ${roman} · 2025 · 28-Week Instructional Pacing Guide`;
  const pacingOriginal = isChemPacing
    ? (isPacingIX ? '/materials/ssc/chemistry/ssc-1/pacing-guide-2025-for-ssc-i-chemistry.pdf' : '/materials/ssc/chemistry/ssc-2/pacing-guide-for-ssc-ii-chemistry.pdf')
    : isPacingIX
      ? '/materials/ssc/physics/ssc-1/pacing-guide-2025-for-ssc-i-physics.pdf'
      : '/materials/ssc/physics/ssc-2/pacing-guide-for-ssc-ii-physics.pdf';

  return (
    <section className={styles.page}>
      <Link href={`/akueb/${roman}/${pacingSlug}`}>← {pacingSubject} {roman}</Link>
      <h1>{pacingTitle}</h1>
      <DocumentViews title={pacingTitle} original={pacingOriginal} resourceLinks={null}>
        <div className={styles.digital}>
          <div style={{overflowX:'auto'}}>
            <table style={{width:'100%',borderCollapse:'collapse'}}>
              <thead>
                <tr>
                  {['Weeks','Unit & Topic','Periods','SLOs Covered','Suggested Activities & Resources'].map(h => (
                    <th key={h} style={{textAlign:'left',padding:'.75rem',borderBottom:'1px solid var(--border-color)'}}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {pacing.map((row) => (
                  <tr key={row.unitNumber} style={{borderBottom:'1px solid var(--border-color)'}}>
                    <td style={{padding:'.65rem',verticalAlign:'top'}}><strong>{row.week}</strong></td>
                    <td style={{padding:'.65rem',verticalAlign:'top'}}>{row.topic}</td>
                    <td style={{padding:'.65rem',verticalAlign:'top'}}>{row.periods}</td>
                    <td style={{padding:'.65rem',verticalAlign:'top'}}>{row.slos.join(', ')}</td>
                    <td style={{padding:'.65rem',verticalAlign:'top'}}>
                      <p style={{margin:'0 0 .35rem 0'}}>{row.activities}</p>
                      <small><strong>Resources:</strong> {row.resources}</small>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </DocumentViews>
    </section>
  );
}
