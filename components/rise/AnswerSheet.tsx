'use client';

import Link from 'next/link';
import { motion, useReducedMotion } from 'motion/react';
import type { BoardInfo } from '@/lib/boardCatalog';
import styles from './home.module.css';

const CLASSES = [
  { roman: 'IX', label: '09' },
  { roman: 'X', label: '10' },
  { roman: 'XI', label: '11' },
  { roman: 'XII', label: '12' },
] as const;

export default function AnswerSheet({ boards }: { boards: BoardInfo[] }) {
  const reduced = useReducedMotion();
  const live = boards.filter((b) => b.status === 'ACTIVE').length;

  return (
    <div className={styles.sheet}>
      <div className={styles.sheetHead}>
        <span className={styles.sheetTitle}>Coverage sheet</span>
        <span className={styles.sheetCount} data-r-num>
          {live}/{boards.length} archives live
        </span>
      </div>

      <table className={styles.grid}>
        <caption className={styles.srOnly}>
          Boards by class. Filled bubbles are boards whose paper archive is live; open bubbles are
          boards whose curriculum is mapped but whose archive is still being built.
        </caption>
        <thead>
          <tr>
            <th scope="col" className={styles.gridRowHead}>
              <span className={styles.srOnly}>Board</span>
            </th>
            {CLASSES.map((c) => (
              <th key={c.roman} scope="col" className={styles.gridColHead}>
                {c.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {boards.map((board, row) => {
            const filled = board.status === 'ACTIVE';
            return (
              <tr key={board.id}>
                <th scope="row" className={styles.gridRowHead}>
                  <span className={styles.boardCode}>{board.shortCode}</span>
                  <span className={styles.boardStatus}>
                    {filled ? 'Archive live' : 'Curriculum mapped'}
                  </span>
                </th>
                {CLASSES.map((c, col) => (
                  <td key={c.roman} className={styles.gridCell}>
                    <motion.span
                      initial={reduced ? false : { opacity: 0, scale: 0.6 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{
                        type: 'spring',
                        stiffness: 420,
                        damping: 28,
                        delay: reduced ? 0 : (row * CLASSES.length + col) * 0.035,
                      }}
                      style={{ display: 'inline-flex' }}
                    >
                      <Link
                        href={`/${board.id}/${c.roman}`}
                        className={filled ? `${styles.bubble} ${styles.bubbleFilled}` : styles.bubble}
                      >
                        <span aria-hidden>{c.roman}</span>
                        <span className={styles.srOnly}>
                          {board.shortCode} class {c.label}
                        </span>
                      </Link>
                    </motion.span>
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>

      <div className={styles.legend}>
        <span className={styles.legendItem}>
          <span className={`${styles.legendBubble} ${styles.legendBubbleFilled}`} />
          Papers, MCQs and syllabus published
        </span>
        <span className={styles.legendItem}>
          <span className={styles.legendBubble} />
          Curriculum mapped, archive in progress
        </span>
      </div>
    </div>
  );
}
