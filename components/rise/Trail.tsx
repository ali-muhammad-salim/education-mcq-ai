import Link from 'next/link';
import styles from './discovery.module.css';

export type TrailItem = { label: string; href?: string };

export default function Trail({ items }: { items: TrailItem[] }) {
  return (
    <nav aria-label="Breadcrumb" className={styles.trail}>
      <Link className={styles.trailLink} href="/">
        Rise
      </Link>
      {items.map((item, i) => {
        const last = i === items.length - 1;
        return (
          <span key={item.label + i} className={styles.trail}>
            <span aria-hidden="true" className={styles.trailSep}>
              /
            </span>
            {last || !item.href ? (
              <span aria-current={last ? 'page' : undefined} className={styles.trailCurrent}>
                {item.label}
              </span>
            ) : (
              <Link className={styles.trailLink} href={item.href}>
                {item.label}
              </Link>
            )}
          </span>
        );
      })}
    </nav>
  );
}
