import Breadcrumbs from '@/components/Breadcrumbs';
import PaperResourceNav from '@/components/PaperResourceNav';
import PaperViewerClient from '@/components/PaperViewerClient';
import { hsscBiologyQuestionChapter } from '@/lib/hsscBiologyChapterQuestions';
import { hsscBiologyMcqMetadata, type hsscBiologyModelPapers } from '@/lib/hsscBiologyModelPapers';
import { hsscBiologySyllabus } from '@/lib/hsscBiologySyllabus';
import styles from './MaterialLayout.module.css';

export default function BiologyModelPaper({ papers, paper, baseUrl, originalView }: {
  papers: ReturnType<typeof hsscBiologyModelPapers>;
  paper: ReturnType<typeof hsscBiologyModelPapers>[number];
  baseUrl: string;
  originalView: boolean;
}) {
  const grade = paper.roman === 'XI' ? 11 : 12;
  const title = `Biology Class ${paper.roman} · ${paper.label}`;
  const last = paper.questions.length;
  const code = `BIO-${paper.roman}-MODEL-${paper.year}-P${paper.part}`;
  const questions = paper.questions.flatMap(question => {
    const entry = (number: string, text: string, type: string, alternative?: number) => {
      const unit = hsscBiologyQuestionChapter(grade, paper.part, question.number, alternative);
      const chapterGrade = unit > 14 ? 12 : 11;
      const chapter = hsscBiologySyllabus('akueb', chapterGrade, 'biology')!.units.find(chapter => chapter.unitNumber === unit);
      const chapterClass = chapterGrade === 11 ? 'XI' : 'XII';
      return {
        id: `${code}-${number}`, questionNumber: number, questionText: text,
        questionType: type, marks: question.marks,
        sourceRegion: {
          chapter_mapping_verified: Boolean(chapter),
          chapter_href: chapter ? `/akueb/${chapterClass}/biology/syllabus#unit-${chapter.unitNumber}` : undefined,
          chapter_name: chapter ? `${chapterGrade === grade ? '' : `Class ${chapterClass} · `}${chapter.name}` : undefined,
          ...('choices' in question ? hsscBiologyMcqMetadata(paper.roman, question) : {}),
          choice_instruction: alternative === undefined ? undefined : alternative === 0 ? 'EITHER' : 'OR',
          group_question_number: alternative === 0 ? question.number : undefined,
        },
      };
    };
    if ('choices' in question) return [entry(String(question.number), question.stem, 'MULTIPLE_CHOICE')];
    if (question.alternatives) return question.alternatives.map((text, index) => entry(`${question.number}${index === 0 ? 'a' : 'b'}`, text, 'EXTENDED_RESPONSE', index));
    return [entry(String(question.number), question.text, 'CONSTRUCTED_RESPONSE')];
  });
  const instructions = paper.part === 1 ? [
    'Check your name and school information on the question paper and Optical Mark Recognition (OMR) sheet. Sign both if the information is correct.',
    'Read each question carefully.',
    'Answer all questions on the OMR sheet within the allotted time. Mark your answers on the OMR sheet only.',
    'The OMR sheet has 100 answer numbers. Use numbers 1 to 50 only.',
    'Each question has four choices. Choose one and fill its circle completely with a pencil.\n\n![Examples of correctly and incorrectly filled circles](/materials/hssc/biology/model-paper-questions/biology-omr-example.webp)',
    'To change an answer, erase the first choice completely before filling a new circle. Make your marks dark and complete. The OMR machine only records marks inside the circles.',
    'Keep the OMR sheet flat and undamaged so it can be scanned correctly.',
    'You may use a scientific calculator.',
  ] : [
    'Check your name and school information. Sign if it is correct.',
    'Read each question carefully.',
    `Answer all ${last} questions. For each of Questions ${last - 1} and ${last}, attempt one alternative only.`,
    'Use a black pen for written answers and a black pencil for drawings. Avoid coloured pencils, markers, highlighters, staples, paper clips, glue, correcting fluid and ink erasers. Cross out mistakes neatly and write the correction beside them. Write only in the allocated answer space. Answers outside it will receive no marks.',
    'Use the marks shown beside each question to manage your time.',
    'Keep your name and school name off the inside pages.',
    'You may use a scientific calculator.',
  ];
  return (
    <section className={styles.page}>
      <Breadcrumbs items={[
        { label: 'AKU-EB', href: '/akueb' },
        { label: `Class ${paper.roman}`, href: `/akueb/${paper.roman}` },
        { label: 'Biology', href: baseUrl },
        { label: 'Model papers', href: `${baseUrl}/model-papers` },
        { label: paper.label, active: true },
      ]} />
      <h1>{title}</h1>
      <PaperResourceNav current={paper.href} tabs={[
        ...papers.map(item => ({ label: item.label, href: item.href })),
        { label: 'Paper III · Practical', href: `${baseUrl}/practicals` },
        { label: 'Open PDF', href: paper.original },
      ]} />
      <PaperViewerClient hideHeader readOnly={paper.part === 2} initialView={originalView ? 'original' : undefined}
        paper={{ id: code, paperCode: code, title, examYear: paper.year, examSession: 'Model Examination',
          totalMarks: paper.part === 1 ? 50 : 35, durationMinutes: 90, questionCount: last, instructions,
          coverNote: grade === 12 ? 'This model paper illustrates the topics and cognitive demands in the table of specifications.' : undefined,
          answerKeyLabel: paper.part === 1 ? 'RiseLearner answer key · Where two options are accepted, either earns full credit.' : undefined,
          fileUrl: paper.original, academicClass: { level: grade, name: `Class ${paper.roman}` }, subject: { name: 'Biology' } }}
        questions={questions} />
    </section>
  );
}
