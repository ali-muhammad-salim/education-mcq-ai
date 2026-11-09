'use client';

import { useEffect, useState } from 'react';
import { ArrowUp } from 'lucide-react';
import styles from './ScrollToTop.module.css';

const RADIUS = 22;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

export default function ScrollToTop() {
  const [progress, setProgress] = useState(0);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    let frame = 0;
    const update = () => {
      frame = 0;
      const el = document.scrollingElement || document.documentElement;
      const max = el.scrollHeight - el.clientHeight;
      const y = el.scrollTop;
      setProgress(max > 0 ? Math.min(1, Math.max(0, y / max)) : 0);
      setVisible(y > 120);
    };
    const schedule = () => {
      if (!frame) frame = window.requestAnimationFrame(update);
    };
    update();
    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', schedule);
    return () => {
      if (frame) window.cancelAnimationFrame(frame);
      window.removeEventListener('scroll', schedule);
      window.removeEventListener('resize', schedule);
    };
  }, []);

  const scrollToTop = () => {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    window.scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' });
  };

  return (
    <button
      type="button"
      className={`${styles.button} ${visible ? styles.visible : ''}`}
      onClick={scrollToTop}
      aria-label="Scroll back to top"
      title="Scroll back to top"
    >
      <svg className={styles.ring} viewBox="0 0 48 48" aria-hidden="true">
        <circle className={styles.track} cx="24" cy="24" r={RADIUS} />
        <circle
          className={styles.progress}
          cx="24"
          cy="24"
          r={RADIUS}
          strokeDasharray={CIRCUMFERENCE}
          strokeDashoffset={CIRCUMFERENCE * (1 - progress)}
        />
      </svg>
      <ArrowUp size={18} strokeWidth={2.4} />
    </button>
  );
}
