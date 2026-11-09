'use client';

import { CheckCircle2, Gauge, ListChecks } from 'lucide-react';
import styles from './Practice.module.css';

interface Props {
  total: number;
  answered: number;
  correct: number;
}

export default function PracticeHud({ total, answered, correct }: Props) {
  const remaining = Math.max(0, total - answered);
  const accuracy = answered > 0 ? Math.round((correct / answered) * 100) : 0;
  const answeredPct = total > 0 ? (answered / total) * 100 : 0;
  const correctPct = total > 0 ? (correct / total) * 100 : 0;

  return (
    <div className={styles.hud} role="status" aria-live="polite" aria-label="Practice progress">
      <div className={styles.stats}>
        <div className={styles.stat}>
          <ListChecks size={15} aria-hidden="true" />
          <span className={styles.value}>
            {answered}
            <span className={styles.total}>/{total}</span>
          </span>
          <span className={styles.label}>Answered</span>
        </div>
        <span className={styles.divider} aria-hidden="true" />
        <div className={styles.stat}>
          <span className={styles.value}>{remaining}</span>
          <span className={styles.label}>Remaining</span>
        </div>
        <span className={styles.divider} aria-hidden="true" />
        <div className={styles.stat}>
          <CheckCircle2 size={15} aria-hidden="true" />
          <span className={styles.value}>{correct}</span>
          <span className={styles.label}>Correct</span>
        </div>
        <span className={styles.divider} aria-hidden="true" />
        <div className={styles.stat}>
          <Gauge size={15} aria-hidden="true" />
          <span className={styles.value}>{accuracy}%</span>
          <span className={styles.label}>Accuracy</span>
        </div>
      </div>
      <div className={styles.bar} aria-hidden="true">
        <span className={styles.fill} style={{ width: answeredPct + '%' }} />
        <span className={styles.correctFill} style={{ width: correctPct + '%' }} />
      </div>
    </div>
  );
}
