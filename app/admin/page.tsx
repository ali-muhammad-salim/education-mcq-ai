'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Activity,
  AlertCircle,
  ArrowRight,
  BookOpen,
  Database,
  FileSearch,
  GraduationCap,
  Layers,
  RefreshCw,
  ShieldAlert,
  Users,
  Workflow,
  Zap
} from 'lucide-react';
import styles from './admin.module.css';

type Overview = {
  generatedAt: string;
  accounts: { total: number; active: number; newLast7Days: number; liveSessions: number; byRole: Record<string, number> };
  classrooms: { total: number; byStatus: Record<string, number> };
  assessments: { total: number; byStatus: Record<string, number> };
  attempts: { total: number; inProgress: number; submittedLast7Days: number };
  requests: { pendingTeacherRequests: number };
  content: { pastPapers: number; learningOutcomes: number; knowledgeSources: number; sourceReviews: Record<string, number> };
};

type Health = {
  submissionMode: 'queued' | 'synchronous';
  capacity: { active: number; waiting: number; maximum: number; queueMaximum: number };
  queues: { kind: string; status: string; count: number }[];
  oldestDueAssessmentJobSeconds: number;
  activeWorkers: { id: string; kinds: string[]; seenAt: string }[];
  sourceReviews: { status: string; count: number }[];
  disabledAICredentials: number;
  workerHealth: string;
};

const REFRESH_MS = 45000;

function formatTime(value: Date) {
  return value.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

function formatDuration(seconds: number) {
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.round(seconds / 60)} min`;
  return `${Math.round(seconds / 3600)} h`;
}

export default function AdminHomePage() {
  const [overview, setOverview] = useState<Overview | null>(null);
  const [health, setHealth] = useState<Health | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [denied, setDenied] = useState(false);
  const [error, setError] = useState('');
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);

  const load = useCallback(async (manual = false) => {
    if (manual) setRefreshing(true);
    try {
      const [overviewResponse, healthResponse] = await Promise.all([
        fetch('/api/admin/overview', { cache: 'no-store' }),
        fetch('/api/admin/health', { cache: 'no-store' })
      ]);
      if (overviewResponse.status === 401 || overviewResponse.status === 403) {
        setDenied(true);
        setLoading(false);
        setRefreshing(false);
        return;
      }
      const overviewData = await overviewResponse.json();
      const healthData = await healthResponse.json();
      if (!overviewResponse.ok) throw new Error(overviewData.error?.message || 'Could not load platform totals.');
      if (!healthResponse.ok) throw new Error(healthData.error?.message || 'Could not load delivery health.');
      setOverview(overviewData);
      setHealth(healthData);
      setDenied(false);
      setError('');
      setUpdatedAt(new Date());
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not load the platform overview.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void load();
    const timer = setInterval(() => void load(), REFRESH_MS);
    return () => clearInterval(timer);
  }, [load]);

  if (denied) {
    return (
      <div className="rise-ui">
        <div className={styles.stateWrap}>
          <div className={styles.deniedIcon}>
            <ShieldAlert size={26} aria-hidden />
          </div>
          <h1>Admin access required</h1>
          <p className={styles.stateText}>
            This overview shows platform-wide accounts and delivery health. Sign in with an administrator
            account to continue.
          </p>
          <div className={styles.deniedActions}>
            <Link href="/account" className={styles.primaryAction}>Open account</Link>
            <Link href="/" className={styles.ghostAction}>Back to the library</Link>
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
          <p className={styles.stateText}>Reading platform state…</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rise-ui">
        <div className={styles.stateWrap}>
          <AlertCircle size={30} color="var(--r-wrong)" aria-hidden />
          <h1>Overview unavailable</h1>
          <p role="alert" className={styles.stateText}>{error}</p>
          <button type="button" className={styles.primaryAction} onClick={() => void load(true)}>
            Try again
          </button>
        </div>
      </div>
    );
  }

  const accounts = overview!.accounts;
  const queues = health!.queues;
  const queueKinds = [...new Set(queues.map(row => row.kind))];
  const queueStatuses = ['QUEUED', 'RUNNING', 'FAILED', 'COMPLETED'];
  const pendingReviews =
    overview!.content.sourceReviews.PENDING_REVIEW ?? overview!.content.sourceReviews.PENDING ?? 0;
  const examBacklog = queues
    .filter(row => (row.status === 'QUEUED' || row.status === 'RUNNING') && row.kind.startsWith('EXAM'))
    .reduce((sum, row) => sum + row.count, 0);

  const alerts: { tone: 'warn' | 'info'; icon: React.ReactNode; text: string; href: string; action: string }[] = [];
  if (overview!.requests.pendingTeacherRequests > 0) {
    alerts.push({
      tone: 'warn',
      icon: <GraduationCap size={16} aria-hidden />,
      text: `${overview!.requests.pendingTeacherRequests} teacher access ${overview!.requests.pendingTeacherRequests === 1 ? 'request is' : 'requests are'} waiting for review.`,
      href: '/admin/users',
      action: 'Review accounts'
    });
  }
  if (pendingReviews > 0) {
    alerts.push({
      tone: 'info',
      icon: <FileSearch size={16} aria-hidden />,
      text: `${pendingReviews} extracted ${pendingReviews === 1 ? 'page is' : 'pages are'} waiting in source review.`,
      href: '/admin/knowledge',
      action: 'Open queue'
    });
  }
  if (examBacklog > 0 && health!.oldestDueAssessmentJobSeconds > 60) {
    alerts.push({
      tone: 'warn',
      icon: <Workflow size={16} aria-hidden />,
      text: `${examBacklog} assessment ${examBacklog === 1 ? 'job has' : 'jobs have'} been waiting ${formatDuration(health!.oldestDueAssessmentJobSeconds)}.`,
      href: '/admin/study',
      action: 'Check workers'
    });
  }
  if (health!.activeWorkers.length === 0 && examBacklog > 0) {
    alerts.push({
      tone: 'warn',
      icon: <Zap size={16} aria-hidden />,
      text: 'No worker heartbeat in the last 90 seconds while assessment jobs are queued.',
      href: '/admin/study',
      action: 'Worker status'
    });
  }
  if (health!.disabledAICredentials > 0) {
    alerts.push({
      tone: 'warn',
      icon: <AlertCircle size={16} aria-hidden />,
      text: `${health!.disabledAICredentials} AI ${health!.disabledAICredentials === 1 ? 'credential is' : 'credentials are'} disabled after repeated failures.`,
      href: '/admin/study',
      action: 'Inspect providers'
    });
  }

  const metrics = [
    {
      label: 'Accounts',
      value: accounts.total,
      note: `${accounts.newLast7Days} joined this week · ${accounts.liveSessions} live sessions`
    },
    {
      label: 'Classrooms',
      value: overview!.classrooms.total,
      note: `${overview!.classrooms.byStatus.ACTIVE ?? 0} active · ${overview!.classrooms.byStatus.ARCHIVED ?? 0} archived`
    },
    {
      label: 'Assessments',
      value: overview!.assessments.total,
      note: `${overview!.assessments.byStatus.PUBLISHED ?? 0} published · ${overview!.assessments.byStatus.DRAFT ?? 0} draft${(overview!.assessments.byStatus.DRAFT ?? 0) === 1 ? '' : 's'}`
    },
    {
      label: 'Submitted attempts · 7 days',
      value: overview!.attempts.submittedLast7Days,
      note: `${overview!.attempts.total} all time · ${overview!.attempts.inProgress} in progress`
    }
  ];

  return (
    <div className="rise-ui">
      <div className={styles.shell}>
        <header className={styles.topbar}>
          <div>
            <span className={styles.eyebrow}>Rise Learner · Platform administration</span>
            <h1 className={styles.title}>Operations overview</h1>
            <p className={styles.subtitle}>
              Accounts, assessment delivery and source review across the whole workspace.
            </p>
          </div>
          <div className={styles.actions}>
            <span className={styles.stamp}>{updatedAt ? `Updated ${formatTime(updatedAt)}` : 'Not synced yet'}</span>
            <button type="button" className={styles.refresh} onClick={() => void load(true)} disabled={refreshing}>
              <RefreshCw size={15} className={refreshing ? styles.spinning : undefined} aria-hidden />
              {refreshing ? 'Refreshing' : 'Refresh'}
            </button>
          </div>
        </header>

        {alerts.length > 0 ? (
          <div className={styles.alerts} role="status" aria-live="polite">
            {alerts.map(alert => (
              <div key={alert.text} className={styles.alertStrip} data-tone={alert.tone}>
                <span className={styles.alertIcon}>{alert.icon}</span>
                <span className={styles.alertText}>{alert.text}</span>
                <Link href={alert.href} className={styles.alertAction}>
                  {alert.action}
                  <ArrowRight size={14} aria-hidden />
                </Link>
              </div>
            ))}
          </div>
        ) : (
          <div className={styles.allClear} role="status">
            <Activity size={16} aria-hidden />
            <span>No alerts. Queues, workers and the review backlog are within range.</span>
          </div>
        )}

        <section aria-label="Platform totals" className={styles.metrics}>
          {metrics.map(metric => (
            <div key={metric.label} className={styles.metric}>
              <span className={styles.metricLabel}>{metric.label}</span>
              <span className={styles.metricValue} data-r-num>{metric.value.toLocaleString()}</span>
              <span className={styles.metricNote}>{metric.note}</span>
            </div>
          ))}
        </section>

        <div className={styles.columns}>
          <section className={styles.panel} aria-labelledby="delivery-health">
            <div className={styles.panelHead}>
              <div>
                <h2 id="delivery-health" className={styles.panelTitle}>Assessment delivery</h2>
                <p className={styles.panelNote}>Queue depth and worker capacity for grading and finalisation jobs.</p>
              </div>
              <span className={styles.chip} data-tone={health!.submissionMode === 'queued' ? 'live' : 'neutral'}>
                {health!.submissionMode === 'queued' ? 'Queued submission' : 'Synchronous submission'}
              </span>
            </div>

            <div className={styles.healthFacts}>
              <div className={styles.fact}>
                <span className={styles.factLabel}>In flight</span>
                <span className={styles.factValue} data-r-num>
                  {health!.capacity.active} / {health!.capacity.maximum}
                </span>
                <span className={styles.factNote}>{health!.capacity.waiting} waiting · {health!.capacity.queueMaximum} queue limit</span>
              </div>
              <div className={styles.fact}>
                <span className={styles.factLabel}>Active workers</span>
                <span className={styles.factValue} data-r-num>{health!.activeWorkers.length}</span>
                <span className={styles.factNote}>
                  {health!.activeWorkers.length
                    ? health!.activeWorkers.map(worker => worker.kinds.join(', ')).filter(Boolean).slice(0, 2).join(' · ')
                    : 'No heartbeat in the last 90 seconds'}
                </span>
              </div>
              <div className={styles.fact}>
                <span className={styles.factLabel}>Oldest due job</span>
                <span className={styles.factValue} data-r-num>
                  {health!.oldestDueAssessmentJobSeconds ? formatDuration(health!.oldestDueAssessmentJobSeconds) : 'None'}
                </span>
                <span className={styles.factNote}>Grading and finalisation only</span>
              </div>
              <div className={styles.fact}>
                <span className={styles.factLabel}>Disabled AI keys</span>
                <span className={styles.factValue} data-r-num>{health!.disabledAICredentials}</span>
                <span className={styles.factNote}>Tripped by repeated failures</span>
              </div>
            </div>

            <div className={styles.tableWrap}>
              <table className={styles.queueTable}>
                <thead>
                  <tr>
                    <th scope="col">Job kind</th>
                    {queueStatuses.map(status => (
                      <th scope="col" key={status}>{status.charAt(0) + status.slice(1).toLowerCase()}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {queueKinds.length === 0 ? (
                    <tr>
                      <td colSpan={queueStatuses.length + 1} className={styles.emptyRow}>No jobs in the queue.</td>
                    </tr>
                  ) : queueKinds.map(kind => (
                    <tr key={kind}>
                      <th scope="row">{kind.replaceAll('_', ' ').toLowerCase()}</th>
                      {queueStatuses.map(status => {
                        const row = queues.find(entry => entry.kind === kind && entry.status === status);
                        return (
                          <td key={status} data-empty={!row ? '' : undefined}>
                            {row ? row.count : '—'}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className={styles.fineprint}>{health!.workerHealth}</p>
          </section>

          <section className={styles.panel} aria-labelledby="inventory">
            <div className={styles.panelHead}>
              <div>
                <h2 id="inventory" className={styles.panelTitle}>Inventory</h2>
                <p className={styles.panelNote}>What the workspace currently holds, by area.</p>
              </div>
              <span className={styles.chip} data-tone="neutral">
                <Database size={13} aria-hidden />
                Live counts
              </span>
            </div>

            <div className={styles.inventoryGroup}>
              <h3 className={styles.groupTitle}><Users size={14} aria-hidden /> Accounts by role</h3>
              {['STUDENT', 'TEACHER', 'ADMIN'].map(role => (
                <div key={role} className={styles.inventoryRow}>
                  <span>{role.charAt(0) + role.slice(1).toLowerCase()}</span>
                  <span data-r-num>{(accounts.byRole[role] ?? 0).toLocaleString()}</span>
                </div>
              ))}
            </div>

            <div className={styles.inventoryGroup}>
              <h3 className={styles.groupTitle}><BookOpen size={14} aria-hidden /> Content</h3>
              <div className={styles.inventoryRow}><span>Past papers</span><span data-r-num>{overview!.content.pastPapers.toLocaleString()}</span></div>
              <div className={styles.inventoryRow}><span>Learning outcomes</span><span data-r-num>{overview!.content.learningOutcomes.toLocaleString()}</span></div>
              <div className={styles.inventoryRow}><span>Knowledge sources</span><span data-r-num>{overview!.content.knowledgeSources.toLocaleString()}</span></div>
              <div className={styles.inventoryRow}><span>Pages pending review</span><span data-r-num>{pendingReviews.toLocaleString()}</span></div>
            </div>

            <div className={styles.inventoryGroup}>
              <h3 className={styles.groupTitle}><Layers size={14} aria-hidden /> Assessment pipeline</h3>
              {['PUBLISHED', 'DRAFT', 'ARCHIVED'].map(status => (
                <div key={status} className={styles.inventoryRow}>
                  <span>{status.charAt(0) + status.slice(1).toLowerCase()}</span>
                  <span data-r-num>{(overview!.assessments.byStatus[status] ?? 0).toLocaleString()}</span>
                </div>
              ))}
              <div className={styles.inventoryRow}><span>In-progress attempts</span><span data-r-num>{overview!.attempts.inProgress.toLocaleString()}</span></div>
            </div>
          </section>
        </div>

        <section className={styles.links} aria-labelledby="admin-links">
          <h2 id="admin-links" className={styles.linksTitle}>Jump to</h2>
          <div className={styles.linkGrid}>
            {[
              { href: '/admin/users', icon: <Users size={16} aria-hidden />, label: 'Accounts', note: 'Roles, access requests, sessions' },
              { href: '/admin/knowledge', icon: <FileSearch size={16} aria-hidden />, label: 'Source reviews', note: 'Approve extracted pages' },
              { href: '/admin/knowledge?view=questions', icon: <BookOpen size={16} aria-hidden />, label: 'Answer & syllabus reviews', note: 'Question mappings' },
              { href: '/admin/knowledge?view=diagrams', icon: <Layers size={16} aria-hidden />, label: 'Diagram approvals', note: 'Figure extraction queue' },
              { href: '/admin/material-import', icon: <Database size={16} aria-hidden />, label: 'Material import', note: 'Queue reviewed source folders' },
              { href: '/upload', icon: <ArrowRight size={16} aria-hidden />, label: 'Upload centre', note: 'Add new material' },
              { href: '/admin/study', icon: <GraduationCap size={16} aria-hidden />, label: 'Study administration', note: 'Notes and study resources' },
              { href: '/dashboard/teacher', icon: <Activity size={16} aria-hidden />, label: 'Teacher desk', note: 'Assessments and classrooms' }
            ].map(link => (
              <Link key={link.href + link.label} href={link.href} className={styles.link}>
                <span className={styles.linkIcon}>{link.icon}</span>
                <span className={styles.linkText}>
                  <strong>{link.label}</strong>
                  <small>{link.note}</small>
                </span>
                <ArrowRight size={15} className={styles.linkArrow} aria-hidden />
              </Link>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
