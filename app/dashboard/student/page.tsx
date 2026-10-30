'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  AlertCircle, ArrowRight, Award, BarChart3, BookOpen, ChevronRight, Clock, Flame,
  GraduationCap, Layers, ListChecks, LogIn, LogOut, ShieldAlert, Sparkles, Target,
  TrendingUp, Users,
} from 'lucide-react';
import { clearExamCache } from '@/lib/exam-cache';
import AuthModal from '@/components/AuthModal';
import styles from './dashboard.module.css';

type Tab = 'available' | 'results' | 'progress';

type AvailableQuiz = {
  id: string;
  code: string | null;
  title: string;
  totalMarks: number;
  durationMin: number;
  questionCount: number;
  teacherName: string;
};

type CompletedAttempt = {
  attemptId: string;
  quizId: string;
  title: string;
  released: boolean;
  status: string;
  score: number | null;
  maxMarks: number;
  percentage: number | null;
  submittedAt: string | null;
  tabSwitchCount: number;
};

type TopicRow = {
  topic: string;
  earned: number;
  possible: number;
  questions: number;
  missed: number;
  percent: number;
};

type TrendPoint = { at: string | null; percent: number; title: string };

type ArchiveSubject = {
  name: string;
  slug: string;
  description: string;
  papersCount: number;
  sloCount: number;
};

type Dashboard = {
  isGuest?: boolean;
  page?: number;
  hasMore?: boolean;
  student?: { id: string; name: string; email: string; role: string };
  metrics?: {
    totalAttempts: number;
    inProgressCount: number;
    avgPercentage: number;
    totalQuizzesAvailable: number;
    streakDays: number;
  };
  classrooms?: { id: string; name: string }[];
  completedAttempts?: CompletedAttempt[];
  inProgressAttempts?: { attemptId: string; quizId: string; title: string; deadline: string; remainingSec: number }[];
  availableQuizzes?: AvailableQuiz[];
  topics?: TopicRow[];
  unmappedTopics?: number;
  trend?: TrendPoint[];
  archives?: { boardId: string; classRoman: string; subjects: ArchiveSubject[] };
};

function formatDate(value: string | null) {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? '—'
    : date.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
}

function formatMarks(value: number) {
  return Math.round(value * 10) / 10;
}

function Sparkline({ points }: { points: TrendPoint[] }) {
  const width = 320;
  const height = 104;
  const pad = 12;
  const x = (index: number) => (points.length === 1 ? width / 2 : pad + (index * (width - pad * 2)) / (points.length - 1));
  const y = (percent: number) => height - pad - (Math.max(0, Math.min(100, percent)) / 100) * (height - pad * 2);
  const line = points.map((point, index) => `${x(index)},${y(point.percent)}`).join(' ');
  const area = `${pad},${height - pad} ${line} ${width - pad},${height - pad}`;
  return (
    <svg
      className={styles.trendSvg}
      viewBox={`0 0 ${width} ${height}`}
      role="img"
      aria-label={`Score trend, oldest to latest: ${points.map((point) => `${point.percent} percent`).join(', ')}`}
    >
      <line
        x1={pad}
        y1={y(50)}
        x2={width - pad}
        y2={y(50)}
        stroke="var(--r-rule-strong)"
        strokeDasharray="4 4"
        strokeWidth="1"
      />
      <polygon points={area} fill="var(--r-emerald-wash)" />
      <polyline
        points={line}
        fill="none"
        stroke="var(--r-emerald)"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {points.map((point, index) => (
        <circle
          key={`${point.at ?? 'point'}-${index}`}
          cx={x(index)}
          cy={y(point.percent)}
          r="3.5"
          fill="var(--r-surface)"
          stroke="var(--r-emerald)"
          strokeWidth="2"
        />
      ))}
    </svg>
  );
}

export default function StudentDashboardPage() {
  const [page, setPage] = useState(1);
  const [data, setData] = useState<Dashboard | null>(null);
  const [loadError, setLoadError] = useState('');
  const [loading, setLoading] = useState(true);
  const [isTeacherBlocked, setIsTeacherBlocked] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>('available');
  const [authModalOpen, setAuthModalOpen] = useState(false);

  const [isJoinModalOpen, setIsJoinModalOpen] = useState(false);
  const [joinCode, setJoinCode] = useState('');
  const [joinMessage, setJoinMessage] = useState<string | null>(null);
  const [isJoining, setIsJoining] = useState(false);

  useEffect(() => {
    fetchDashboard();
  }, [page]);

  async function fetchDashboard() {
    try {
      setLoading(true);
      setLoadError('');
      const res = await fetch('/api/dashboard/student?page=' + page);
      const json = await res.json();
      if (!res.ok) {
        if (res.status === 401) {
          setData({ isGuest: true });
          return;
        }
        if (res.status === 403) {
          setIsTeacherBlocked(true);
          setTimeout(() => window.location.replace('/dashboard/teacher'), 1200);
          return;
        }
        throw new Error(typeof json.error === 'string' ? json.error : json.error?.message || 'Unable to load dashboard.');
      }

      // Students are the only role this endpoint serves; a teacher or admin is
      // sent on to the portal that actually holds their work.
      if (!json.success && json.redirect) {
        setIsTeacherBlocked(true);
        setTimeout(() => window.location.replace(json.redirect), 1200);
        return;
      }

      if (json.success) setData(json);
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'Unable to load dashboard.');
      console.error('Failed to load student dashboard:', err);
    } finally {
      setLoading(false);
    }
  }

  async function handleLogout() {
    try {
      await clearExamCache().catch(() => undefined);
      await fetch('/api/auth/logout', { method: 'POST' });
      window.location.href = '/dashboard/student';
    } catch {
      window.location.reload();
    }
  }

  async function handleJoinClassroom(event: React.FormEvent) {
    event.preventDefault();
    if (!joinCode.trim()) return;

    if (data?.isGuest) {
      setJoinMessage('Sign in or register as a student to enroll in teacher classrooms.');
      setTimeout(() => {
        setIsJoinModalOpen(false);
        setAuthModalOpen(true);
      }, 1200);
      return;
    }

    try {
      setIsJoining(true);
      setJoinMessage(null);
      const res = await fetch('/api/classrooms/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: joinCode }),
      });
      const json = await res.json();
      if (json.success) {
        setJoinMessage(`Success: ${json.message}`);
        setTimeout(() => {
          setIsJoinModalOpen(false);
          setJoinCode('');
          setJoinMessage(null);
          fetchDashboard();
        }, 1500);
      } else {
        setJoinMessage(`Error: ${json.error || 'Failed to join'}`);
      }
    } catch {
      setJoinMessage('Error connecting to server.');
    } finally {
      setIsJoining(false);
    }
  }

  if (loadError && !loading) {
    return (
      <div className="rise-ui">
        <div className={styles.stateWrap}>
          <AlertCircle size={32} color="var(--r-wrong)" aria-hidden />
          <h1>We could not open your desk</h1>
          <p role="alert" className={styles.stateText}>{loadError}</p>
          <button type="button" className={styles.pagerButton} onClick={fetchDashboard}>
            Try again
          </button>
        </div>
      </div>
    );
  }

  if (isTeacherBlocked) {
    return (
      <div className="rise-ui">
        <div className={styles.guard}>
          <div className={styles.guardPanel}>
            <div className={styles.guardIcon}>
              <ShieldAlert size={26} aria-hidden />
            </div>
            <h1 className={styles.guardTitle}>Teacher account detected</h1>
            <p className={styles.guardNote}>
              The student portal is reserved for students. Your assessment builder, gradebook and
              classroom rosters live in the teacher portal.
            </p>
            <div className={styles.guardNotice}>Redirecting to the teacher desk…</div>
            <Link href="/dashboard/teacher" className={styles.guardAction}>
              <GraduationCap size={16} aria-hidden />
              Open teacher dashboard
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="rise-ui">
        <div className={styles.stateWrap}>
          <div className={styles.spinner} aria-hidden />
          <p className={styles.stateText}>Loading your examination desk…</p>
        </div>
      </div>
    );
  }

  const metrics = data?.metrics ?? {
    totalAttempts: 0,
    inProgressCount: 0,
    avgPercentage: 0,
    totalQuizzesAvailable: 0,
    streakDays: 0,
  };
  const inProgress = data?.inProgressAttempts ?? [];
  const available = data?.availableQuizzes ?? [];
  const completed = data?.completedAttempts ?? [];
  const classrooms = data?.classrooms ?? [];
  const topics = data?.topics ?? [];
  const trend = data?.trend ?? [];
  const archives = data?.archives;
  const isGuest = Boolean(data?.isGuest);
  const firstName = data?.student?.name?.trim().split(/\s+/)[0];
  const streak = metrics.streakDays;

  const tabs: { id: Tab; label: string; icon: React.ReactNode; count?: number }[] = [
    { id: 'available', label: 'Available', icon: <BookOpen size={15} aria-hidden />, count: available.length },
    { id: 'results', label: 'Results', icon: <ListChecks size={15} aria-hidden />, count: completed.length },
    { id: 'progress', label: 'Progress', icon: <Target size={15} aria-hidden />, count: topics.length },
  ];

  return (
    <div className="rise-ui">
      <div className={styles.shell}>
        <header className={styles.topbar}>
          <div className={styles.identity}>
            <div className={styles.avatar} aria-hidden>
              {data?.student?.name?.charAt(0).toUpperCase() || 'R'}
            </div>
            <div className={styles.identityText}>
              <span className={styles.portalLabel}>Student portal</span>
              <span className={styles.studentName}>{data?.student?.name || 'Student learning desk'}</span>
            </div>
          </div>

          <div className={styles.topActions}>
            <button type="button" className={styles.ghostAction} onClick={() => setIsJoinModalOpen(true)}>
              <Users size={15} aria-hidden />
              Join class
            </button>
            <Link href="/quizzes" className={styles.primaryAction}>
              <BookOpen size={15} aria-hidden />
              Browse quizzes
            </Link>
            {!isGuest && (
              <button
                type="button"
                className={styles.iconAction}
                onClick={handleLogout}
                title="Sign out of student account"
                aria-label="Sign out of student account"
              >
                <LogOut size={16} aria-hidden />
              </button>
            )}
          </div>
        </header>

        {isGuest && (
          <div className={styles.guestBanner}>
            <div className={styles.guestText}>
              <div className={styles.guestIcon}>
                <Sparkles size={20} aria-hidden />
              </div>
              <div>
                <span className={styles.guestTitle}>Previewing in guest mode</span>
                <p className={styles.guestNote}>
                  Sign in to sit a timed attempt, keep your results, and join a teacher classroom.
                </p>
              </div>
            </div>
            <button type="button" className={styles.primaryAction} onClick={() => setAuthModalOpen(true)}>
              <LogIn size={15} aria-hidden />
              Sign in or register
            </button>
          </div>
        )}

        <section className={styles.desk}>
          <div>
            <p className={styles.eyebrow}>
              <span className={styles.eyebrowMark} aria-hidden />
              AKU-EB · Class IX–XII
            </p>
            <h1 className={styles.heading}>
              {isGuest ? (
                <>The student <span className={styles.headingMark}>desk</span>.</>
              ) : (
                <>Good to see you, <span className={styles.headingMark}>{firstName || 'candidate'}</span>.</>
              )}
            </h1>
            <p className={styles.lede}>
              Resume a timed assessment, read a marked script, or find the topic where the marks
              are leaking.
            </p>
          </div>

          <dl className={styles.ledger}>
            <div className={styles.ledgerCell}>
              <dt className={styles.ledgerLabel}>Assessments open</dt>
              <dd className={styles.ledgerValue}>{isGuest ? '—' : metrics.totalQuizzesAvailable}</dd>
            </div>
            <div className={styles.ledgerCell}>
              <dt className={styles.ledgerLabel}>Completed</dt>
              <dd className={styles.ledgerValue}>{isGuest ? '—' : metrics.totalAttempts}</dd>
            </div>
            <div className={styles.ledgerCell}>
              <dt className={styles.ledgerLabel}>Average</dt>
              <dd className={`${styles.ledgerValue} ${styles.ledgerValueAccent}`}>
                {isGuest ? '—' : `${metrics.avgPercentage}%`}
              </dd>
            </div>
            <div className={styles.ledgerCell}>
              <dt className={styles.ledgerLabel}>Day streak</dt>
              <dd className={styles.ledgerValue}>{isGuest ? '—' : streak}</dd>
            </div>
          </dl>
        </section>

        {inProgress.length > 0 && (
          <div className={styles.resume}>
            <div className={styles.resumeText}>
              <div className={styles.resumeIcon}>
                <Clock size={20} aria-hidden />
              </div>
              <div>
                <span className={styles.resumeKicker}>Attempt in progress</span>
                <span className={styles.resumeTitle}>{inProgress[0].title}</span>
                <p className={styles.resumeNote}>
                  {inProgress[0].remainingSec > 0
                    ? `About ${Math.max(1, Math.round(inProgress[0].remainingSec / 60))} minutes left on the server clock.`
                    : 'The deadline has passed — submit as soon as you can.'}
                </p>
              </div>
            </div>
            <Link href={`/quizzes/${inProgress[0].quizId}/take`} className={styles.resumeAction}>
              Resume attempt
              <ArrowRight size={16} aria-hidden />
            </Link>
          </div>
        )}

        {classrooms.length > 0 && (
          <div className={styles.classrooms}>
            <span className={styles.classroomLabel}>Your classrooms</span>
            {classrooms.map((classroom) => (
              <span key={classroom.id} className={styles.classroomChip}>
                <Users size={13} aria-hidden />
                {classroom.name}
              </span>
            ))}
          </div>
        )}

        <div className={styles.tabs} role="tablist" aria-label="Student dashboard views">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              role="tab"
              id={`tab-${tab.id}`}
              aria-selected={activeTab === tab.id}
              aria-controls={`panel-${tab.id}`}
              className={`${styles.tab} ${activeTab === tab.id ? styles.tabActive : ''}`}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.icon}
              {tab.label}
              {tab.count !== undefined && <span className={styles.tabCount}>{tab.count}</span>}
            </button>
          ))}
        </div>

        {activeTab === 'available' && (
          <section
            className={styles.panel}
            role="tabpanel"
            id="panel-available"
            aria-labelledby="tab-available"
          >
            <div className={styles.panelHead}>
              <div>
                <h2 className={styles.panelTitle}>Practice tests &amp; model assessments</h2>
                <p className={styles.panelNote}>Timed attempts run on the server clock; answers save as you go.</p>
              </div>
              <Link href="/quizzes" className={styles.panelLink}>
                Full catalog
                <ChevronRight size={15} aria-hidden />
              </Link>
            </div>

            {available.length === 0 ? (
              <div className={styles.emptyState}>
                <div className={styles.emptyIcon}>
                  <BookOpen size={20} aria-hidden />
                </div>
                <h3 className={styles.emptyTitle}>
                  {isGuest ? 'Sign in to load your assessments' : 'Nothing open on this page'}
                </h3>
                <p className={styles.emptyNote}>
                  {isGuest
                    ? 'Your assigned tests and shared quiz codes appear here once you sign in.'
                    : 'Check the public catalog, or ask your teacher for a classroom code.'}
                </p>
                <div className={styles.emptyActions}>
                  {isGuest && (
                    <button type="button" className={styles.primaryAction} onClick={() => setAuthModalOpen(true)}>
                      <LogIn size={15} aria-hidden />
                      Sign in
                    </button>
                  )}
                  <Link href="/quizzes" className={styles.ghostAction}>
                    Browse the catalog
                    <ArrowRight size={15} aria-hidden />
                  </Link>
                </div>
              </div>
            ) : (
              <div className={styles.quizzes}>
                {available.map((quiz) => (
                  <article key={quiz.id} className={styles.quizTile}>
                    <div className={styles.quizTop}>
                      <span className={styles.quizTag}>
                        <Clock size={12} aria-hidden />
                        {quiz.durationMin} min · timed
                      </span>
                      <span className={styles.quizMarks}>{quiz.totalMarks} marks</span>
                    </div>
                    <h3 className={styles.quizTitle}>{quiz.title}</h3>
                    <div className={styles.quizFoot}>
                      <strong>{quiz.questionCount} questions</strong>
                      <span aria-hidden>·</span>
                      <span>{quiz.teacherName || 'Rise Learner'}</span>
                    </div>
                    <Link href={`/quizzes/${quiz.id}/take`} className={styles.quizAction}>
                      <span>Start timed assessment</span>
                      <ArrowRight size={15} className={styles.quizArrow} aria-hidden />
                    </Link>
                  </article>
                ))}
              </div>
            )}
          </section>
        )}

        {activeTab === 'results' && (
          <section
            className={styles.panel}
            role="tabpanel"
            id="panel-results"
            aria-labelledby="tab-results"
          >
            <div className={styles.panelHead}>
              <div>
                <h2 className={styles.panelTitle}>Results &amp; marked scripts</h2>
                <p className={styles.panelNote}>
                  Scores appear once the teacher releases them. A held result is marked but not yet shared.
                </p>
              </div>
            </div>

            {completed.length === 0 ? (
              <div className={styles.emptyState}>
                <div className={styles.emptyIcon}>
                  <Award size={20} aria-hidden />
                </div>
                <h3 className={styles.emptyTitle}>No marked scripts yet</h3>
                <p className={styles.emptyNote}>
                  Sit an assessment from the Available tab and your first result will land here.
                </p>
                <div className={styles.emptyActions}>
                  <button type="button" className={styles.ghostAction} onClick={() => setActiveTab('available')}>
                    See available assessments
                    <ArrowRight size={15} aria-hidden />
                  </button>
                </div>
              </div>
            ) : (
              <div className={styles.tableWrap}>
                <table
                  className={`mobile-data-table ${styles.resultsTable}`}
                  tabIndex={0}
                  aria-label="Assessment results; scroll horizontally for all columns"
                >
                  <thead>
                    <tr>
                      <th scope="col"><span>Assessment</span></th>
                      <th scope="col"><span>Score</span></th>
                      <th scope="col"><span>Result</span></th>
                      <th scope="col"><span>Submitted</span></th>
                      <th scope="col"><span>Review</span></th>
                    </tr>
                  </thead>
                  <tbody>
                    {completed.map((attempt) => (
                      <tr key={attempt.attemptId}>
                        <td>
                          <span className={styles.resultTitle}>{attempt.title}</span>
                        </td>
                        <td>
                          <span className={styles.scoreCell}>
                            {attempt.released ? attempt.score ?? '—' : 'Held'}
                            <span className={styles.scoreMax}> / {attempt.maxMarks}</span>
                          </span>
                        </td>
                        <td>
                          {attempt.percentage === null ? (
                            <span className={`${styles.resultChip} ${styles.resultHeld}`}>
                              {attempt.released ? 'Grading' : 'Awaiting release'}
                            </span>
                          ) : (
                            <span
                              className={`${styles.resultChip} ${
                                attempt.percentage >= 50 ? styles.resultRight : styles.resultWrong
                              }`}
                            >
                              {attempt.percentage}%
                            </span>
                          )}
                        </td>
                        <td>
                          <span className={styles.dateCell}>{formatDate(attempt.submittedAt)}</span>
                        </td>
                        <td className={styles.reviewCell}>
                          <Link
                            href={`/quizzes/${attempt.quizId}/results?attemptId=${attempt.attemptId}`}
                            className={styles.reviewLink}
                          >
                            Review
                            <ArrowRight size={13} aria-hidden />
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        )}

        {activeTab === 'progress' && (
          <section
            className={styles.panel}
            role="tabpanel"
            id="panel-progress"
            aria-labelledby="tab-progress"
          >
            {topics.length === 0 && trend.length === 0 ? (
              <div className={styles.emptyState}>
                <div className={styles.emptyIcon}>
                  <Target size={20} aria-hidden />
                </div>
                <h3 className={styles.emptyTitle}>No marked work to analyse yet</h3>
                <p className={styles.emptyNote}>
                  Once a graded result is released, this tab maps the topics that are holding your
                  marks back and the score trend across your scripts.
                </p>
              </div>
            ) : (
              <>
                <div className={styles.progressGrid}>
                  <section className={styles.mastery} aria-labelledby="mastery-title">
                    <h2 id="mastery-title" className={styles.blockTitle}>
                      <BarChart3 size={18} aria-hidden />
                      Where the marks are
                    </h2>
                    <p className={styles.blockNote}>
                      Weakest topics first, across your recent graded scripts. This is a map of what
                      to revise next, not a measure of ability.
                    </p>
                    <ul className={styles.masteryList}>
                      {topics.slice(0, 8).map((topic) => {
                        const tone =
                          topic.percent >= 75
                            ? styles.fillRight
                            : topic.percent >= 50
                              ? styles.fill
                              : topic.percent >= 30
                                ? styles.fillFlag
                                : styles.fillWrong;
                        return (
                          <li key={topic.topic} className={styles.masteryRow}>
                            <div className={styles.masteryHead}>
                              <span className={styles.masteryName} title={topic.topic}>
                                {topic.topic}
                              </span>
                              <span className={styles.masteryNums}>
                                {topic.percent}% · {formatMarks(topic.earned)}/{formatMarks(topic.possible)}
                              </span>
                            </div>
                            <div
                              className={styles.track}
                              role="progressbar"
                              aria-label={topic.topic}
                              aria-valuemin={0}
                              aria-valuemax={100}
                              aria-valuenow={topic.percent}
                            >
                              <div
                                className={`${styles.fill} ${tone}`}
                                style={{ width: `${Math.max(2, topic.percent)}%` }}
                              />
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                    {(data?.unmappedTopics ?? 0) > 0 && (
                      <p className={styles.masteryFoot}>
                        {data?.unmappedTopics} graded question
                        {data?.unmappedTopics === 1 ? '' : 's'} carried no topic tag, so
                        {data?.unmappedTopics === 1 ? ' it is' : ' they are'} not counted above.
                      </p>
                    )}
                  </section>

                  <section className={styles.trend} aria-labelledby="trend-title">
                    <h2 id="trend-title" className={styles.blockTitle}>
                      <TrendingUp size={18} aria-hidden />
                      Score trend
                    </h2>
                    <p className={styles.blockNote}>Released results, oldest to latest.</p>
                    {trend.length === 0 ? (
                      <p className={styles.blockNote}>No released scores to chart yet.</p>
                    ) : (
                      <Sparkline points={trend} />
                    )}
                    {trend.length > 0 && (
                      <ul className={styles.trendList}>
                        {trend
                          .slice(-3)
                          .reverse()
                          .map((point, index) => (
                            <li key={`${point.at ?? 'trend'}-${index}`} className={styles.trendRow}>
                              <span className={styles.trendLabel} title={point.title}>
                                {point.title}
                              </span>
                              <span className={styles.trendValue}>{point.percent}%</span>
                            </li>
                          ))}
                      </ul>
                    )}
                    <p className={styles.streak}>
                      <Flame size={15} aria-hidden />
                      {streak === 0
                        ? 'No submission streak — one attempt today starts it.'
                        : `${streak} day${streak === 1 ? '' : 's'} of submitting in a row.`}
                    </p>
                  </section>
                </div>

                {archives && archives.subjects.length > 0 && (
                  <section aria-labelledby="archive-title">
                    <div className={styles.panelHead}>
                      <div>
                        <h2 id="archive-title" className={styles.blockTitle}>
                          <Layers size={18} aria-hidden />
                          Class {archives.classRoman} archive
                        </h2>
                        <p className={styles.panelNote}>
                          Past papers, notes and syllabus outcomes for your class.
                        </p>
                      </div>
                      <Link href={`/${archives.boardId}/${archives.classRoman}`} className={styles.panelLink}>
                        All subjects
                        <ChevronRight size={15} aria-hidden />
                      </Link>
                    </div>
                    <div className={styles.archiveGrid}>
                      {archives.subjects.slice(0, 8).map((subject) => (
                        <Link
                          key={subject.slug}
                          href={`/${archives.boardId}/${archives.classRoman}/${subject.slug}`}
                          className={styles.archiveTile}
                        >
                          <span>
                            <span className={styles.archiveName}>{subject.name}</span>
                            <span className={styles.archiveDesc}>{subject.description}</span>
                            <span className={styles.archiveMeta}>
                              {subject.papersCount} paper{subject.papersCount === 1 ? '' : 's'} ·{' '}
                              {subject.sloCount ?? 0} outcomes
                            </span>
                          </span>
                          <ChevronRight size={16} className={styles.archiveChevron} aria-hidden />
                        </Link>
                      ))}
                    </div>
                  </section>
                )}
              </>
            )}
          </section>
        )}

        {!isGuest && (page > 1 || data?.hasMore) && (
          <nav className={styles.pager} aria-label="Dashboard pages">
            <button
              type="button"
              className={styles.pagerButton}
              disabled={page === 1}
              onClick={() => setPage((current) => current - 1)}
            >
              Previous
            </button>
            <span>Page {page}</span>
            <button
              type="button"
              className={styles.pagerButton}
              disabled={!data?.hasMore}
              onClick={() => setPage((current) => current + 1)}
            >
              Next
            </button>
          </nav>
        )}
      </div>

      {isJoinModalOpen && (
        <div className={styles.scrim}>
          <form className={styles.modal} onSubmit={handleJoinClassroom} aria-labelledby="join-title">
            <h2 id="join-title" className={styles.modalTitle}>
              <Users size={20} color="var(--r-emerald)" aria-hidden />
              Join a classroom
            </h2>
            <p className={styles.modalNote}>
              Ask your teacher for the 6–8 character class code to unlock assigned assessments.
            </p>
            <input
              type="text"
              required
              maxLength={8}
              value={joinCode}
              onChange={(event) => setJoinCode(event.target.value.toUpperCase())}
              placeholder="E.g. A3B9X1"
              aria-label="Classroom code"
              className={styles.codeInput}
            />
            {joinMessage && (
              <div
                className={`${styles.modalMessage} ${
                  joinMessage.startsWith('Success') ? styles.modalMessageOk : ''
                }`}
                role="status"
              >
                {joinMessage}
              </div>
            )}
            <div className={styles.modalActions}>
              <button type="button" className={styles.modalCancel} onClick={() => setIsJoinModalOpen(false)}>
                Cancel
              </button>
              <button type="submit" className={styles.modalSubmit} disabled={isJoining || !joinCode}>
                {isJoining ? 'Joining…' : 'Join classroom'}
              </button>
            </div>
          </form>
        </div>
      )}

      <AuthModal
        isOpen={authModalOpen}
        initialRole="STUDENT"
        onClose={() => setAuthModalOpen(false)}
        onSuccess={() => fetchDashboard()}
      />
    </div>
  );
}
