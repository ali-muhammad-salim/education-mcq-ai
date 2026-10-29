import Link from 'next/link';
import { ArrowRight, FileText, ListChecks, Play, BookOpen, Download, FileCheck2 } from 'lucide-react';
import { SUPPORTED_BOARDS } from '@/lib/boardCatalog';
import AnswerSheet from '@/components/rise/AnswerSheet';
import styles from '@/components/rise/home.module.css';

const RESOURCES = [
  {
    href: '/past-papers',
    name: 'Past papers',
    body: 'Every archived paper in two views: the original scan, and a digital paper you can read, filter and practise against question by question.',
    icon: FileText,
    wide: true,
    iconClass: '',
  },
  {
    href: '/mcqs',
    name: 'Solved MCQs',
    body: 'Objective questions with the marked answer and a worked explanation.',
    icon: ListChecks,
    wide: false,
    iconClass: 'tileIconSubject' as const,
  },
  {
    href: '/quizzes',
    name: 'Practice quizzes',
    body: 'Timed attempts and shared quiz codes. Scores and answer review after you submit.',
    icon: Play,
    wide: false,
    iconClass: 'tileIconInsight' as const,
  },
  {
    href: '/syllabus',
    name: 'Syllabus & SLOs',
    body: 'Learning outcomes per topic, linked to the questions that test them.',
    icon: BookOpen,
    wide: false,
    iconClass: '',
  },
  {
    href: '/resources',
    name: 'Books & downloads',
    body: 'Textbooks, notes and reference material, organised by class and subject.',
    icon: Download,
    wide: false,
    iconClass: 'tileIconFlag' as const,
  },
  {
    href: '/model-papers',
    name: 'Model papers',
    body: 'Board-pattern practice papers with the same mark distribution as the real thing.',
    icon: FileCheck2,
    wide: true,
    iconClass: '',
  },
] as const;

export default function Home() {
  const activeBoard = SUPPORTED_BOARDS.find((b) => b.status === 'ACTIVE') ?? SUPPORTED_BOARDS[0];

  return (
    <div className="rise-ui">
      <div className={styles.home}>
        <section className={styles.hero}>
          <div>
            <p className={styles.eyebrow}>
              <span className={styles.eyebrowMark} />
              {SUPPORTED_BOARDS.map((b) => b.shortCode).join(' · ')}
            </p>
            <h1 className={styles.title}>
              Past papers, <span className={styles.titleMark}>marked up</span> and searchable.
            </h1>
            <p className={styles.lede}>
              Rise Learner turns the paper archive into something you can actually study from: every
              question readable on screen, every answer explained, every outcome traceable back to
              the syllabus.
            </p>
            <div className={styles.heroActions}>
              <Link href={`/${activeBoard.id}`} className={styles.primaryAction}>
                Open the {activeBoard.shortCode} archive
                <ArrowRight size={18} aria-hidden />
              </Link>
              <Link href="/quizzes" className={styles.ghostAction}>
                Enter a quiz code
              </Link>
            </div>
          </div>

          <AnswerSheet boards={SUPPORTED_BOARDS} />
        </section>

        <section>
          <div className={styles.sectionHead}>
            <h2 className={styles.sectionTitle}>What&rsquo;s inside</h2>
            <span className={styles.sectionNote}>Six sections</span>
          </div>
          <div className={styles.bento}>
            {RESOURCES.map(({ href, name, body, icon: Icon, wide, iconClass }) => (
              <Link
                key={href}
                href={href}
                className={wide ? `${styles.tile} ${styles.tileWide}` : styles.tile}
              >
                <span
                  className={
                    iconClass ? `${styles.tileIcon} ${styles[iconClass]}` : styles.tileIcon
                  }
                >
                  <Icon size={19} aria-hidden />
                </span>
                <h3 className={styles.tileName}>{name}</h3>
                <p className={styles.tileBody}>{body}</p>
              </Link>
            ))}
          </div>
        </section>

        <section className={styles.boards}>
          <div className={styles.sectionHead}>
            <h2 className={styles.sectionTitle}>Boards</h2>
            <span className={styles.sectionNote}>Choose your board</span>
          </div>
          <ul className={styles.boardList}>
            {SUPPORTED_BOARDS.map((board) => (
              <li key={board.id}>
                <Link href={`/${board.id}`} className={styles.boardRow}>
                  <span className={styles.boardRowCode}>{board.shortCode}</span>
                  <span>
                    <span className={styles.boardRowName}>{board.fullName}</span>
                    <span className={styles.boardRowDesc}>{board.description}</span>
                  </span>
                  <span
                    className={
                      board.status === 'ACTIVE' ? `${styles.pill} ${styles.pillLive}` : styles.pill
                    }
                  >
                    {board.status === 'ACTIVE' ? 'Archive live' : board.tag}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}
