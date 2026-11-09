import styles from './route-loading.module.css';

export default function RouteLoading({ label = 'Loading' }: { label?: string }) {
  return (
    <div className={`rise-ui ${styles.routeLoading}`} role="status" aria-live="polite">
      <span className={styles.spinner} aria-hidden="true" />
      <span className={styles.eyebrow}>{label}…</span>
      <div className={styles.skeleton} aria-hidden="true">
        <span className={`${styles.line} ${styles.lineWide}`} />
        <span className={`${styles.line} ${styles.lineMid}`} />
        <span className={`${styles.line} ${styles.lineShort}`} />
      </div>
    </div>
  );
}
