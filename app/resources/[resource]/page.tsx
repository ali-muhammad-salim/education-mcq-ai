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
import { physicsX2017AnswerKey, physicsX2017Marking, physicsX2017Papers, physicsX2017References, physicsX2017Tabs } from '@/lib/physicsX2017Papers';
import { physicsX2018AnswerKey, physicsX2018Marking, physicsX2018Papers, physicsX2018References, physicsX2018Tabs } from '@/lib/physicsX2018Papers';
import { physicsX2019AnswerKey, physicsX2019Marking, physicsX2019Papers, physicsX2019References, physicsX2019Tabs } from '@/lib/physicsX2019Papers';
import { physicsX2021AnswerKey, physicsX2021Key, physicsX2021Paper, physicsX2021Tabs } from '@/lib/physicsX2021Paper';
import { physicsX2022AnswerKey, physicsX2022Key, physicsX2022Paper, physicsX2022Tabs } from '@/lib/physicsX2022Paper';
import { physicsX2023AnswerKey, physicsX2023Marking, physicsX2023Papers, physicsX2023References, physicsX2023Tabs } from '@/lib/physicsX2023Papers';
import { physicsX2024AnswerKey, physicsX2024Marking, physicsX2024Papers, physicsX2024References, physicsX2024Tabs } from '@/lib/physicsX2024Papers';
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
import { biologyIx2026Notes, biologyIx2026ResponseImage, biologyIx2026Tabs } from '@/lib/biologyIx2026';
import { biologyIx2021Key, biologyIx2021Tabs } from '@/lib/biologyIx2021';
import { biologyIxAnnualArchives } from '@/lib/biologyPapers';
import { biologyIx2026Written } from '@/lib/biologyIx2026Written';
import { chemistryX2026Notes, chemistryX2026ResponseImage, chemistryX2026Tabs } from '@/lib/chemistryX2026';
import { chemistryX2026Written } from '@/lib/chemistryX2026Written';
import { chemistryIx2026Notes, chemistryIx2026ResponseImage, chemistryIx2026Tabs } from '@/lib/chemistryIx2026';
import { chemistryIx2026Written } from '@/lib/chemistryIx2026Written';
import { mathematicsIx2026Notes, mathematicsIx2026Tabs } from '@/lib/mathematicsIx2026';
import { mathematicsX2026Notes, mathematicsX2026Tabs } from '@/lib/mathematicsX2026';
import { chemistryX2019Notes, chemistryX2019ResponseImage, chemistryX2019Tabs } from '@/lib/chemistryX2019';
import { chemistryX2019Written } from '@/lib/chemistryX2019Written';
import { chemistryX2018Notes, chemistryX2018ResponseImage, chemistryX2018Tabs } from '@/lib/chemistryX2018';
import { chemistryX2018Written } from '@/lib/chemistryX2018Written';
import { chemistryX2017Notes, chemistryX2017ResponseImage, chemistryX2017Tabs } from '@/lib/chemistryX2017';
import { chemistryX2017Written } from '@/lib/chemistryX2017Written';
import { combinedChemistryXArchives, getFallbackPaper } from '@/lib/paperDataService';
import { paperChoices, paperMetadata, paperQuestionNumber, paperScoringAnswers, safeDocumentUrl } from '@/lib/paperPresentation';
import prisma from '@/lib/prisma';
import { biology2024Archive, biology2024PdfRoot, biologyX2017Archive, biologyX2017PdfRoot, biologyX2018Archive, biologyX2018PdfRoot, biologyX2019Archive, biologyX2019PdfRoot, biologyX2021Archive, biologyX2021PdfRoot, biologyX2023Archive, biologyX2023PdfRoot, biologyX2024Archive, biologyX2024PdfRoot, biologyX2025Archive, biologyX2025PdfRoot } from '@/lib/biology2024Resources';
export const dynamic='force-dynamic';

const SUPPORTED_RESOURCES = [
  'biology-ix-2025-key',
  'biology-ix-2025-emarking',
  'biology-ix-2023-key',
  'biology-ix-2021-key',
  'biology-ix-2019-key',
  'biology-ix-2019-emarking',
  'biology-ix-2018-key',
  'biology-ix-2018-emarking',
  'biology-ix-2017-key',
  'biology-ix-2017-emarking',
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
  'physics-x-2024-key',
  'physics-x-2024-emarking',
  'physics-x-2023-key',
  'physics-x-2023-emarking',
  'physics-x-2022-key',
  'physics-x-2021-key',
  'physics-x-2019-key',
  'physics-x-2019-emarking',
  'physics-x-2018-key',
  'physics-x-2018-emarking',
  'physics-x-2017-key',
  'physics-x-2017-emarking',
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
  'chemistry-x-2022-key',
  'chemistry-x-2021-key',
  'chemistry-x-2019-key',
  'chemistry-x-2019-emarking',
  'chemistry-x-2018-key',
  'chemistry-x-2018-emarking',
  'chemistry-x-2017-key',
  'chemistry-x-2017-emarking',
  'chemistry-ix-resource-guide',
  'chemistry-x-resource-guide',
  'chemistry-ix-pacing-guide',
  'chemistry-x-pacing-guide',
] as const;

export default async function Page({params, searchParams}:{params:Promise<{resource:string}>; searchParams?: Promise<{view?: string}>}) {
  const {resource}=await params;
  const resourceHref = '/resources/' + resource;
  const combinedPhysics = [
    { key: physicsX2021Key, tabs: physicsX2021Tabs, answerKey: physicsX2021AnswerKey, paper: physicsX2021Paper },
    { key: physicsX2022Key, tabs: physicsX2022Tabs, answerKey: physicsX2022AnswerKey, paper: physicsX2022Paper },
    { key: physicsIx2021Key, tabs: physicsIx2021Tabs, answerKey: physicsIx2021AnswerKey, paper: physicsIx2021Paper },
    { key: physicsIx2022Key, tabs: physicsIx2022Tabs, answerKey: physicsIx2022AnswerKey, paper: physicsIx2022Paper },
  ].find(archive => archive.key.href === resourceHref);
  const reviewedPhysics = [
    { refs: physicsX2017References, tabs: physicsX2017Tabs, answerKey: physicsX2017AnswerKey, marking: physicsX2017Marking, paper: physicsX2017Papers[0] },
    { refs: physicsX2018References, tabs: physicsX2018Tabs, answerKey: physicsX2018AnswerKey, marking: physicsX2018Marking, paper: physicsX2018Papers[0] },
    { refs: physicsX2019References, tabs: physicsX2019Tabs, answerKey: physicsX2019AnswerKey, marking: physicsX2019Marking, paper: physicsX2019Papers[0] },
    { refs: physicsX2023References, tabs: physicsX2023Tabs, answerKey: physicsX2023AnswerKey, marking: physicsX2023Marking, paper: physicsX2023Papers[0] },
    { refs: physicsX2024References, tabs: physicsX2024Tabs, answerKey: physicsX2024AnswerKey, marking: physicsX2024Marking, paper: physicsX2024Papers[0] },
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
      if ((scoredPaper?.paperCode === 'PHY-X-2023-P1' && [5, 12, 39].includes(Number(questionNumber))) ||
        (scoredPaper?.paperCode === 'PHY-X-2021-P1' && questionNumber === '5')) {
        const letter = accepted[0];
        return [[Number(questionNumber), letter + ' · ' + paperChoices(sourceRegion.choices)[letter]]];
      }
      if (accepted.length === 1 && accepted[0] === sourceRegion.official_answer) return [];
      return [[Number(questionNumber), accepted.length === 4 ? 'Any option earns credit' : accepted.join(' or ')]];
    }));
    const isKey = resource.endsWith('-key');
    const roman = resource.startsWith('physics-x-') ? 'X' : 'IX';
    const paperPrefix = '/past-papers/PHY-' + roman + '-' + physicsArchive.year;
    const title = 'Physics Class ' + roman + ' · ' + physicsArchive.year + ' ' + physicsArchive.label;
    return <section className={styles.page}>
      <p><Link href={'/akueb/' + roman + '/physics/pastpapers'}>Class {roman} Physics past papers</Link></p>
      <h1>{title}</h1>
      <DocumentViews original={physicsArchive.fileUrl} title={title} continuousPdf
        digitalLabel={isKey ? 'Digital Answer Key' : 'Digital Notes'}
        initialView={(await searchParams)?.view === 'original' ? 'original' : 'digital'}
        resourceLinks={<PaperResourceNav tabs={tabs} current={physicsArchive.href} inline />}>
        {isKey ? <div style={{ overflowX: 'auto' }}>
          {combinedPhysics ? <p>Q1–40 are Theory and Q41–50 are Alternate to Practical. The table preserves the published board answers and shows where practice scoring differs.</p> : roman === 'X' && physicsArchive.year === 2017 ? <p>Practice uses the board’s answer letters. Q3 uses four 15 cm wavefront intervals to give 45 cm/s. The digital versions of Q6 and Q23–25 clarify the conditions for the keyed answers.</p> : roman === 'X' && physicsArchive.year === 2018 ? <p>Q9 and Q16 each accept A or C. The digital version updates option A in Q25 because the original liver example can occur after liver irradiation. <a href="https://pubmed.ncbi.nlm.nih.gov/16183482/">Clinical study</a>.</p> : roman === 'X' && physicsArchive.year === 2019 ? <p>Q5 scores C (12 cm) from the signed mirror equation. Q8 accepts A or C for the relaxed-eye and finite-image adjustments of a magnifier.</p> : roman === 'X' && physicsArchive.year === 2023 ? <p>Q2 accepts B or C. Digital Q5 uses regularity of vibration, Q12 gives the image distance as infinity and Q39 gives I only for the direct peaceful application of fission. The board letters below are as printed.</p> : roman === 'X' ? <p>The printed key shows 0 in several cells and a dot for Q10. The table keeps those entries and gives the independently checked practice answers. Q10 uses a corrected 15 cm option. Q23 accepts A or C.</p> : physicsArchive.year === 2017 ? <p>The board lists D for Q24. Practice scores C because surface colour does not directly affect evaporation at fixed temperature and other conditions.</p> : physicsArchive.year === 2018 ? <p>The board answers are reproduced as printed. The practice adjustments for Q11, Q18 and Q19 are shown in the table.</p> : physicsArchive.year === 2019 ? <p>The board prints an asterisk for Q28. The practice quiz scores D because thermal conductivity is a material property.</p> : <p>For Q30, the board lists C. Practice uses A because surface tension requires higher pressure inside a soap bubble. <a href="https://www.physics.umd.edu/courses/Phys405/Boyd/ajp00917.pdf">See the pressure calculation</a>.</p>}
          {scoredPaper?.paperCode === 'PHY-X-2021-P1' && <p>Digital Q5 uses 90 cm/s. Practice scores A for Q12 and B (3.333 Ω) for Q25.</p>}
          {scoredPaper?.paperCode === 'PHY-X-2022-P1' && <p>Q29 accepts B or C for overheating from excessive current. Q30 scores B (242 W). Over two seconds the bulb transfers 484 J of energy.</p>}
          <table className={styles.table}>
            <thead><tr><th scope="col">Question</th>{showOriginalSlo && <th scope="col">Original SLO</th>}<th scope="col">Board answer</th>{scoredPaper && <th scope="col">Practice scoring adjustment</th>}<th scope="col">Cognitive level</th></tr></thead>
            <tbody>{answerKey.map(row => <tr key={row.number}>
              <th scope="row"><Link href={paperPrefix + '-P1?view=solved#question-' + row.number}>Q{row.number}</Link></th>
              {showOriginalSlo && <td>{row.slo}</td>}<td>{row.letter}</td>{scoredPaper && <td>{practiceAnswers.get(row.number) ?? '—'}</td>}<td>{({ K: 'Knowledge', U: 'Understanding', A: 'Application' } as Record<string, string>)[row.level]}</td>
            </tr>)}</tbody>
          </table>
        </div> : <div className={styles.digital}>
          <p>AKU-EB commentary and examples of stronger and weaker responses. The original PDF includes the board’s full notes.</p>
          {marking.map(note => <details key={note.number} className={styles.practicalStage}>
            <summary>Question {note.number} · {note.marks} marks</summary>
            <p><Link href={paperPrefix + '-P2?view=solved#question-' + note.number}>Open question</Link> · <a href={note.example.pdf}>PDF page {note.page}</a></p>
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
  const annualNotes = biologyIxAnnualArchives.find(archive => archive.notes.href === '/resources/' + resource);
  const chemistryNotes = [
    { grade: 'IX', notes: chemistryIx2026Notes, rows: chemistryIx2026Written, responseImage: chemistryIx2026ResponseImage, tabs: chemistryIx2026Tabs },
    { grade: 'X', notes: chemistryX2026Notes, rows: chemistryX2026Written, responseImage: chemistryX2026ResponseImage, tabs: chemistryX2026Tabs },
    { grade: 'X', notes: chemistryX2019Notes, rows: chemistryX2019Written, responseImage: chemistryX2019ResponseImage, tabs: chemistryX2019Tabs },
    { grade: 'X', notes: chemistryX2018Notes, rows: chemistryX2018Written, responseImage: chemistryX2018ResponseImage, tabs: chemistryX2018Tabs },
    { grade: 'X', notes: chemistryX2017Notes, rows: chemistryX2017Written, responseImage: chemistryX2017ResponseImage, tabs: chemistryX2017Tabs },
  ].find(archive => archive.notes.href === '/resources/' + resource);
  const reviewedNotes = chemistryNotes?.notes
    ?? annualNotes?.notes ?? (biologyIx2026Notes.href === '/resources/' + resource ? biologyIx2026Notes : null);
  if (reviewedNotes) {
    const { year, href, fileUrl } = reviewedNotes;
    const writtenItems = chemistryNotes?.rows ?? annualNotes?.writtenItems;
    const rows = writtenItems?.map(row => ({ ...row, stronger: undefined, weaker: undefined })) ?? biologyIx2026Written;
    const responseImage = chemistryNotes?.responseImage ?? annualNotes?.responseImage ?? biologyIx2026ResponseImage;
    const tabs = chemistryNotes?.tabs ?? annualNotes?.tabs ?? biologyIx2026Tabs;
    const title = `${chemistryNotes ? 'Class ' + chemistryNotes.grade + ' Chemistry' : 'Class IX Biology'} ${year} E-marking Notes`;
    return <section className={styles.page}>
      <p><Link href={chemistryNotes ? '/akueb/' + chemistryNotes.grade + '/chemistry/pastpapers' : '/akueb/IX/biology/pastpapers'}>Past papers</Link></p>
      <h1>{title}</h1>
      <DocumentViews title={title} original={fileUrl} continuousPdf digitalLabel="Digital Notes"
        initialView={(await searchParams)?.view === 'original' ? 'original' : 'digital'}
        resourceLinks={<PaperResourceNav tabs={tabs} current={href} inline />}>
        <div className={styles.digital}>
          <p>Summaries of the board’s marking guidance with original candidate examples. Open the PDF for the full commentary.</p>
          {rows.map(row => <details key={row.number} className={styles.practicalStage}>
            <summary>Question {row.number} · {row.marks} marks</summary>
            <p><Link href={`${tabs[1].href}?view=solved#question-${row.number}`}>Open question</Link> · <a href={fileUrl + '#page=' + row.notesPage}>PDF page {row.notesPage}</a></p>
            <h3>Checking hints</h3><p>{row.hints}</p>
            <h3>Stronger response</h3>{row.stronger && <p>{row.stronger}</p>}
            <img src={responseImage(row.number, 'stronger')} alt={'Stronger candidate response for Q' + row.number} loading="lazy" style={{ maxWidth: '100%' }} />
            <h3>Weaker response</h3>{row.weaker && <p>{row.weaker}</p>}
            <img src={responseImage(row.number, 'weaker')} alt={'Weaker candidate response for Q' + row.number} loading="lazy" style={{ maxWidth: '100%' }} />
          </details>)}
        </div>
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
  const mathMarking = /^mathematics-(ix|x)-(201[789]|202[3456])-emarking$/.exec(resource);
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
    const notes2026 = year === '2026' ? (roman === 'X' ? mathematicsX2026Notes : mathematicsIx2026Notes) : undefined;
    const tabs2026 = roman === 'X' ? mathematicsX2026Tabs : mathematicsIx2026Tabs;
    const original = notes2026?.fileUrl ?? safeDocumentUrl(paper?.questions[0]?.sourceRegion.original_reference_source);
    if (!paper || !original) notFound();
    const paperPath = '/past-papers/' + paper.paperCode;
    const base = `/akueb/${roman}/mathematics`;
    const title = `Mathematics ${roman} · ${year} · E-marking notes`;
    return (
      <section className={styles.page}>
        <Link href={base + '/pastpapers'}>← Mathematics past papers</Link>
        <h1>{title}</h1>
        <DocumentViews title={title} original={original} continuousPdf={Boolean(notes2026)} initialView={(await searchParams)?.view === 'original' ? 'original' : 'digital'}
          resourceLinks={notes2026 ? <PaperResourceNav tabs={tabs2026} current={notes2026.href} inline /> : <Link href={paperPath}>Paper 2</Link>}>
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
                  {notes2026 && meta.diagramUrl && <img src={meta.diagramUrl} alt={`Diagram for question ${question.questionNumber}`} loading="lazy" style={{ maxWidth: '100%', height: 'auto' }} />}
                  <p>
                    {meta.current_slo && <><Link href={`${sloBase}/syllabus#slo-${meta.current_slo}`}>SLO {meta.current_slo}</Link> · </>}
                    Cognitive level {meta.cognitive_level} · <Link href={`${paperPath}#question-${question.questionNumber}`}>Open in Paper 2</Link>
                  </p>
                  {notes2026 && <p><a href={meta.original_reference_source}>Marking notes for this question (PDF)</a></p>}
                  <h3>Worked solution</h3>
                  <StructuredContent text={meta.model_answer || ''} />
                  {notes2026 && meta.official_marking_notes && <>
                    <h3>Checking hints</h3>
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
  const ixAnnualKey = biologyIxAnnualArchives.find(archive => archive.tabs[2].href === '/resources/' + resource);
  if (ixAnnualKey || resource === 'biology-ix-2025-key' || resource === 'biology-ix-2023-key' || resource === 'biology-ix-2021-key') {
    const is2021 = resource === 'biology-ix-2021-key';
    const is2023 = resource === 'biology-ix-2023-key';
    const year = resource.split('-')[2];
    const keyData = ixAnnualKey ? ixAnnualKey.key.map(row => ({ ...row, question: row.number, oldSlo: undefined })) : is2021 ? biologyIx2021Key.map(row => ({
      question: row.number,
      oldSlo: row.originalSlo,
      answer: row.alternate ? row.answer + ' (main), ' + row.alternate + ' (alternate)' : row.answer,
      level: row.level,
    })) : is2023 ? bioKey2023 : bioKey2025;
    const title = `Biology IX · ${year} · Official answer key`;
    const original = `/materials/ssc/biology/ssc-1/biology-ix-${year}-keys.pdf`;
    return (
      <section className={styles.page}>
        <Link href="/akueb/IX/biology/pastpapers">← Biology IX past papers</Link>
        <h1>{title}</h1>
        <DocumentViews title={title} original={original} resourceLinks={is2021 || ixAnnualKey
          ? <PaperResourceNav tabs={ixAnnualKey?.tabs ?? biologyIx2021Tabs} current={'/resources/' + resource} inline />
          : <>
            <Link href={`/past-papers/BIO-IX-${year}-P1`}>Paper 1</Link>
            <Link href={`/past-papers/BIO-IX-${year}-P2`}>Paper 2</Link>
        </>}>
          <div className={styles.digital}>
            <div style={{overflowX:'auto'}}>
              <table style={{width:'100%',borderCollapse:'collapse'}}>
                <caption>Official {year} SSC-I answer key · current 2025 syllabus mappings are shown on each question</caption>
                <thead>
                  <tr>
                    {(ixAnnualKey ? ['Question','Answer','Level'] : ['Question','Original SLO','Answer','Level']).map(x=>(
                      <th key={x} style={{textAlign:'left',padding:'.75rem',borderBottom:'1px solid var(--border-color)'}}>{x}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {keyData.map((row: any)=>(
                    <tr key={row.question}>
                      <td style={{padding:'.65rem',borderBottom:'1px solid var(--border-color)'}}>{row.question}</td>
                      {!ixAnnualKey && <td style={{padding:'.65rem',borderBottom:'1px solid var(--border-color)'}}>{row.oldSlo}</td>}
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
    const combinedChemistry = combinedChemistryXArchives.find(archive => archive.tabs[1].href === '/resources/' + resource);
    const activeChemKey: any = combinedChemistry?.key ?? (chemYear === '2025' ? (isChemXKey ? chemXKey2025 : chemKey2025) : chemYear === '2024' ? (isChemXKey ? chemXKey2024 : chemKey2024) : chemYear === '2023' ? (isChemXKey ? chemXKey2023 : chemKey2023) : chemYear === '2022' ? chemKey2022 : chemYear === '2021' ? chemKey2021 : chemYear === '2019' ? chemKey2019 : chemYear === '2018' ? chemKey2018 : chemKey2017);
    const hasOriginalSlo = !combinedChemistry || combinedChemistry.key.entries.some(row => row.slo);
    const chemRoman = isChemXKey ? 'X' : 'IX';
    const chemLower = isChemXKey ? 'x' : 'ix';
    const hasPaper2 = chemYear !== '2021' && chemYear !== '2022';
    const hasEmarking = hasPaper2;
    const title = `Chemistry ${chemRoman} · ${chemYear} · Official answer key`;
    return (
      <section className={styles.page}>
        <Link href={`/akueb/${chemRoman}/chemistry/pastpapers`}>← Chemistry {chemRoman} past papers</Link>
        <h1>{title}</h1>
        <DocumentViews title={title} original={activeChemKey.sourceUrl}
          initialView={combinedChemistry && (await searchParams)?.view === 'original' ? 'original' : 'digital'}
          resourceLinks={<>
            <Link href={`/past-papers/CHM-${chemRoman}-${chemYear}-P1`}>{chemYear} Paper 1</Link>
            {hasPaper2 && <Link href={`/past-papers/CHM-${chemRoman}-${chemYear}-P2`}>{chemYear} Paper 2</Link>}
            {hasEmarking && <Link href={`/resources/chemistry-${chemLower}-${chemYear}-emarking`}>{chemYear} E-marking notes</Link>}
        </>}>
          <div className={styles.digital}>
            {combinedChemistry?.paper.questions.length === 50 && <p>Questions 1–40 are Theory. Questions 41–50 are Alternate to Practical. The table shows the board’s published answers.{chemYear === '2021' ? ' The quiz also accepts B and D on Q5.' : ' The quiz also accepts C on Q1 and D on Q3 and Q49.'}</p>}
            <div style={{overflowX:'auto'}}>
              <table style={{width:'100%',borderCollapse:'collapse'}}>
                <caption>Official {chemYear} SSC-{isChemXKey ? 'II' : 'I'} exam-year references · current 2025 syllabus mappings are shown on each question</caption>
                <thead>
                  <tr>
                    {(hasOriginalSlo ? ['Question','Original SLO','Answer','Level'] : ['Question','Answer','Level']).map(x=>(
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
                      {hasOriginalSlo && <td>{row.slo}</td>}
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
    const chemistryQuestions = isChem ? getFallbackPaper([pPrefix, roman, yearStr, 'P2'].join('-'))?.questions : undefined;
    const chemistryMappings = new Map(chemistryQuestions?.map(question => [paperQuestionNumber(question.questionNumber), question.sourceRegion]));
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
                const chemistry = isChem ? chemistryMappings.get(paperQuestionNumber(q.questionNumber)) : undefined;
                const outcome = isChem
                  ? chemistry?.current_syllabus_reviewed ? chemistry.current_mapping?.[0] : undefined
                  : reviewed?.current_mapping[0];
                const currentSlo = isChem || reviewed ? outcome?.code : q.currentSlo;
                const currentTopic = isChem || reviewed ? outcome?.topic : q.currentTopic;
                const syllabusGrade = outcome?.grade ?? chemistry?.mapping_scope?.grade;
                const syllabusClass = syllabusGrade === 9 ? 'IX' : syllabusGrade === 10 ? 'X' : roman;
                const isOut = !currentSlo || (!isChem && (reviewed ? reviewed.out_of_syllabus : Boolean(q.outOfSyllabus)));
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
                            {isChem && chemistry?.mapping_status !== 'NO_DIRECT_OUTCOME' ? 'SLO mapping awaiting review' : 'Out of 2025 Syllabus'}
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
