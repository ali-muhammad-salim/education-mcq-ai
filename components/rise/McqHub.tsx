'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Brain,
  Calendar,
  ClipboardList,
  FileText,
  Layers,
  Play,
  Search,
  Sparkles,
  X,
} from 'lucide-react';
import { mcqCategories, type McqCategory } from '@/lib/mcqCategories';
import styles from './mcq-hub.module.css';

export type HubAction = {
  label: string;
  href?: string;
  onClick?: () => void;
  icon?: 'play' | 'paper' | 'timer' | 'book' | 'arrow';
};

const ICONS = {
  play: Play,
  paper: FileText,
  timer: Calendar,
  book: BookOpen,
  arrow: ArrowRight,
};

function ActionControl({ action, tone }: { action: HubAction; tone: 'primary' | 'quiet' }) {
  const Icon = action.icon ? ICONS[action.icon] : null;
  const className = `${styles.action} ${tone === 'primary' ? styles.actionPrimary : styles.actionQuiet}`;
  const body = (
    <>
      {Icon && action.icon !== 'arrow' ? <Icon size={14} aria-hidden="true" /> : null}
      <span>{action.label}</span>
      {action.icon === 'arrow' || (tone === 'primary' && !Icon) ? (
        <ArrowRight size={14} aria-hidden="true" className={styles.actionArrow} />
      ) : null}
    </>
  );
  if (action.href) {
    return (
      <Link className={className} href={action.href} onClick={action.onClick}>
        {body}
      </Link>
    );
  }
  return (
    <button type="button" className={className} onClick={action.onClick}>
      {body}
    </button>
  );
}

export function HubShell({ children }: { children: React.ReactNode }) {
  return <div className={`rise-ui ${styles.shell}`}>{children}</div>;
}

export function HubMasthead({
  board,
  classLabel,
  eyebrow = 'MCQ examination directory',
  title,
  lede,
  stats = [],
  back,
  primary,
}: {
  board: string;
  classLabel: string;
  eyebrow?: string;
  title: string;
  lede: string;
  stats?: Array<{ label: string; value: string | number }>;
  back?: { href: string; label: string };
  primary?: { label: string; onClick: () => void };
}) {
  return (
    <header className={styles.masthead}>
      <div className={styles.mastGlow} aria-hidden="true" />
      <div className={styles.mastInner}>
        <div className={styles.badges}>
          <span className={`${styles.badge} ${styles.badgeGold}`}>{board}</span>
          <span className={`${styles.badge} ${styles.badgeGlass}`}>{classLabel}</span>
          <span className={`${styles.badge} ${styles.badgeAmber}`}>{eyebrow}</span>
        </div>
        <h1 className={styles.mastTitle}>{title}</h1>
        <p className={styles.mastLede}>{lede}</p>
        {stats.length > 0 && (
          <dl className={styles.stats}>
            {stats.map(stat => (
              <div key={stat.label} className={styles.stat}>
                <dt className={styles.statLabel}>{stat.label}</dt>
                <dd className={styles.statValue}>{stat.value}</dd>
              </div>
            ))}
          </dl>
        )}
        {(back || primary) && (
          <div className={styles.mastActions}>
            {back && (
              <Link className={styles.mastBack} href={back.href}>
                <ArrowLeft size={14} aria-hidden="true" />
                <span>{back.label}</span>
              </Link>
            )}
            {primary && (
              <button type="button" className={styles.mastPrimary} onClick={primary.onClick}>
                <Sparkles size={14} aria-hidden="true" />
                <span>{primary.label}</span>
              </button>
            )}
          </div>
        )}
      </div>
    </header>
  );
}

const THEORY_LINKS = [
  { path: 'crqs', label: 'Chapter-wise CRQs' },
  { path: 'erqs', label: 'Chapter-wise ERQs' },
  { path: 'numericals', label: 'Chapter-wise Numericals' },
  { path: 'chapter-notes', label: 'Chapter SLO Notes' },
];

export function HubRail({
  baseUrl,
  active,
  theory = [],
}: {
  baseUrl: string;
  active?: McqCategory;
  theory?: string[];
}) {
  const railRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const rail = railRef.current;
    const current = rail?.querySelector<HTMLElement>('[aria-current="page"]');
    if (!rail || !current || rail.scrollWidth <= rail.clientWidth) return;
    rail.scrollLeft = current.offsetLeft - (rail.clientWidth - current.offsetWidth) / 2;
  }, [active]);

  const theoryLinks = THEORY_LINKS.filter(item => theory.includes(item.path));

  return (
    <nav ref={railRef} className={styles.rail} aria-label="MCQ categories">
      <Link
        className={`${styles.railLink} ${!active ? styles.railOn : ''}`}
        href={baseUrl + '/mcqs'}
        aria-current={!active ? 'page' : undefined}
      >
        All categories
      </Link>
      {mcqCategories.map(item => (
        <Link
          key={item.id}
          className={`${styles.railLink} ${item.key === active ? styles.railOn : ''}`}
          href={baseUrl + '/mcqs/' + item.id}
          aria-current={item.key === active ? 'page' : undefined}
        >
          {item.label}
        </Link>
      ))}
      {theoryLinks.length > 0 && (
        <span className={styles.railGroup}>
          <span className={styles.railRule} aria-hidden="true" />
          <span className={styles.railLabel}>Written practice</span>
          {theoryLinks.map(item => (
            <Link key={item.path} className={`${styles.railLink} ${styles.railTheory}`} href={`${baseUrl}/${item.path}`}>
              {item.label}
            </Link>
          ))}
        </span>
      )}
    </nav>
  );
}

export function HubSection({
  title,
  note,
  children,
}: {
  title: string;
  note?: string;
  children: React.ReactNode;
}) {
  return (
    <section className={styles.section}>
      <div className={styles.sectionHead}>
        <h2 className={styles.sectionTitle}>{title}</h2>
        {note ? <p className={styles.sectionNote}>{note}</p> : null}
      </div>
      {children}
    </section>
  );
}

export type UnitEntry = {
  id: string;
  number: number;
  title: string;
  topics: string;
  total: number;
  badge?: string;
  countLabel?: string;
  breakdown?: Array<{ label: string; value: number; tone: 'model' | 'past' }>;
  action: HubAction;
  secondary?: HubAction;
  emptyNote?: string;
  emptyAction?: HubAction;
};

type SortMode = 'syllabus' | 'most';

export function UnitBrowser({ units, noun = 'MCQs' }: { units: UnitEntry[]; noun?: string }) {
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState<SortMode>('syllabus');
  const [hideEmpty, setHideEmpty] = useState(false);
  const emptyCount = units.filter(unit => unit.total === 0).length;
  const max = Math.max(1, ...units.map(unit => unit.total));

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const filtered = units.filter(unit => {
      if (hideEmpty && unit.total === 0) return false;
      if (!needle) return true;
      return (
        unit.title.toLowerCase().includes(needle) ||
        unit.topics.toLowerCase().includes(needle) ||
        String(unit.number) === needle
      );
    });
    return sort === 'most' ? [...filtered].sort((a, b) => b.total - a.total || a.number - b.number) : filtered;
  }, [units, query, sort, hideEmpty]);

  return (
    <div>
      {units.length > 3 && (
        <div className={styles.toolbar}>
          <label className={styles.search}>
            <Search size={15} aria-hidden="true" className={styles.searchIcon} />
            <span className={styles.srOnly}>Find a unit</span>
            <input
              className={styles.searchInput}
              type="search"
              value={query}
              placeholder="Find a unit or topic"
              onChange={event => setQuery(event.target.value)}
            />
          </label>
          <div className={styles.segment} role="group" aria-label="Sort units">
            {(
              [
                ['syllabus', 'Syllabus order'],
                ['most', 'Most ' + noun],
              ] as const
            ).map(([key, label]) => (
              <button
                key={key}
                type="button"
                className={`${styles.segmentBtn} ${sort === key ? styles.segmentOn : ''}`}
                aria-pressed={sort === key}
                onClick={() => setSort(key)}
              >
                {label}
              </button>
            ))}
          </div>
          {emptyCount > 0 && (
            <label className={styles.toggle}>
              <input
                type="checkbox"
                className={styles.toggleInput}
                checked={hideEmpty}
                onChange={event => setHideEmpty(event.target.checked)}
              />
              <span className={styles.toggleTrack} aria-hidden="true" />
              <span>Hide empty units</span>
            </label>
          )}
          <span className={styles.toolbarCount} aria-live="polite">
            {visible.length} of {units.length} units
          </span>
        </div>
      )}

      {visible.length === 0 ? (
        <div className={styles.empty}>
          <h3 className={styles.emptyTitle}>No unit matches “{query}”</h3>
          <p className={styles.emptyBody}>Try a chapter name, a topic such as “vectors”, or a unit number.</p>
          <button
            type="button"
            className={`${styles.action} ${styles.actionQuiet}`}
            onClick={() => {
              setQuery('');
              setHideEmpty(false);
            }}
          >
            <X size={14} aria-hidden="true" />
            <span>Clear filters</span>
          </button>
        </div>
      ) : (
        <ul className={styles.grid}>
          {visible.map(unit => (
            <UnitTile key={unit.id} unit={unit} max={max} noun={noun} />
          ))}
        </ul>
      )}
    </div>
  );
}

function UnitTile({ unit, max, noun }: { unit: UnitEntry; max: number; noun: string }) {
  const empty = unit.total === 0;
  const parts = (unit.breakdown || []).filter(part => part.value > 0);
  return (
    <li className={`${styles.tile} ${empty ? styles.tileEmpty : ''}`}>
      <div className={styles.tileHead}>
        <span className={styles.unitBadge}>{unit.badge || `Unit ${unit.number}`}</span>
        <span className={styles.tileCount}>
          <b>{unit.total}</b> {unit.countLabel || noun}
        </span>
      </div>
      <h3 className={styles.tileTitle}>{unit.title}</h3>
      {unit.topics ? <p className={styles.tileTopics}>{unit.topics}</p> : null}

      {!empty && (
        <div className={styles.meter} aria-hidden="true">
          <span className={styles.meterTrack}>
            {parts.length ? (
              parts.map(part => (
                <span
                  key={part.label}
                  className={part.tone === 'past' ? styles.meterPast : styles.meterModel}
                  style={{ width: `${(part.value / max) * 100}%` }}
                />
              ))
            ) : (
              <span className={styles.meterModel} style={{ width: `${(unit.total / max) * 100}%` }} />
            )}
          </span>
          {parts.length > 0 && (
            <span className={styles.legend}>
              {parts.map(part => (
                <span key={part.label} className={styles.legendItem}>
                  <i className={part.tone === 'past' ? styles.dotPast : styles.dotModel} />
                  {part.value} {part.label}
                </span>
              ))}
            </span>
          )}
        </div>
      )}

      <div className={styles.tileFoot}>
        {empty ? (
          <>
            <span className={styles.emptyNote}>{unit.emptyNote || `No ${noun} mapped to this unit yet`}</span>
            {unit.emptyAction ? <ActionControl action={unit.emptyAction} tone="quiet" /> : null}
          </>
        ) : (
          <>
            <ActionControl action={unit.action} tone="primary" />
            {unit.secondary ? <ActionControl action={unit.secondary} tone="quiet" /> : null}
          </>
        )}
      </div>
    </li>
  );
}

export type PaperEntry = {
  id: string;
  badge: string;
  meta?: string;
  title: string;
  description: string;
  tone?: 'model' | 'past' | 'mock';
  actions: HubAction[];
};

export function PaperGrid({ papers }: { papers: PaperEntry[] }) {
  return (
    <ul className={styles.grid}>
      {papers.map(paper => (
        <li key={paper.id} className={styles.tile}>
          <div className={styles.tileHead}>
            <span
              className={`${styles.unitBadge} ${
                paper.tone === 'past' ? styles.badgePast : paper.tone === 'mock' ? styles.badgeMock : ''
              }`}
            >
              {paper.badge}
            </span>
            {paper.meta ? <span className={styles.tileCount}>{paper.meta}</span> : null}
          </div>
          <h3 className={styles.tileTitle}>{paper.title}</h3>
          <p className={styles.tileTopics}>{paper.description}</p>
          <div className={styles.tileFoot}>
            {paper.actions.map((action, index) => (
              <ActionControl key={action.label} action={action} tone={index === 0 ? 'primary' : 'quiet'} />
            ))}
          </div>
        </li>
      ))}
    </ul>
  );
}

export type TierEntry = {
  id: string;
  code: string;
  label: string;
  title: string;
  note: string;
  count?: number;
  tone: 'recall' | 'understanding' | 'application' | 'higher';
  action?: HubAction;
};

const TIER_TONE = {
  recall: styles.toneRecall,
  understanding: styles.toneUnderstanding,
  application: styles.toneApplication,
  higher: styles.toneHigher,
};

export function TierGrid({ tiers }: { tiers: TierEntry[] }) {
  return (
    <ul className={styles.grid}>
      {tiers.map(tier => (
        <li key={tier.id} className={`${styles.tile} ${styles.tier} ${TIER_TONE[tier.tone]}`}>
          <div className={styles.tileHead}>
            <span className={styles.tierBadge}>
              <b>{tier.code}</b> {tier.label}
            </span>
            {tier.count !== undefined ? (
              <span className={styles.tileCount}>
                <b>{tier.count}</b> MCQs
              </span>
            ) : null}
          </div>
          <h3 className={styles.tileTitle}>{tier.title}</h3>
          <p className={styles.tileTopics}>{tier.note}</p>
          <div className={styles.tileFoot}>
            {tier.action && tier.count !== 0 ? (
              <ActionControl action={tier.action} tone="primary" />
            ) : (
              <span className={styles.emptyNote}>No MCQs at this level yet</span>
            )}
          </div>
        </li>
      ))}
    </ul>
  );
}

const DIRECTORY_ICONS = {
  chapter_wise: Layers,
  past_papers: Calendar,
  full_book: ClipboardList,
  cognitive: Brain,
};

const DIRECTORY_COPY: Record<McqCategory, string> = {
  chapter_wise: 'Every MCQ filed under the syllabus unit it examines, with instant feedback.',
  past_papers: 'Annual board MCQs year by year, with the key and option-by-option feedback.',
  full_book: 'Complete model and annual papers to sit as timed tests.',
  cognitive: 'Drill recall, understanding or application across the whole syllabus.',
};

export function HubDirectory({
  baseUrl,
  notes = {},
}: {
  baseUrl: string;
  notes?: Partial<Record<McqCategory, string>>;
}) {
  return (
    <ul className={styles.directory}>
      {mcqCategories.map(item => {
        const Icon = DIRECTORY_ICONS[item.key];
        return (
          <li key={item.id}>
            <Link className={styles.dirTile} href={baseUrl + '/mcqs/' + item.id}>
              <span className={styles.dirIcon}>
                <Icon size={20} aria-hidden="true" />
              </span>
              <span className={styles.dirBody}>
                <span className={styles.dirTitle}>{item.label}</span>
                <span className={styles.dirNote}>{DIRECTORY_COPY[item.key]}</span>
                {notes[item.key] ? <span className={styles.dirMeta}>{notes[item.key]}</span> : null}
              </span>
              <ArrowRight size={18} aria-hidden="true" className={styles.dirArrow} />
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

export function HubEmpty({ title, body, action }: { title: string; body: string; action?: HubAction }) {
  return (
    <div className={styles.empty}>
      <h3 className={styles.emptyTitle}>{title}</h3>
      <p className={styles.emptyBody}>{body}</p>
      {action ? <ActionControl action={action} tone="quiet" /> : null}
    </div>
  );
}
