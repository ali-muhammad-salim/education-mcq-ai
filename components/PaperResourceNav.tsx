import Link from 'next/link';
import styles from './MaterialLayout.module.css';

export interface PaperResourceTab {
  label: string;
  href: string;
}

export default function PaperResourceNav({
  tabs,
  current,
  inline = false,
}: {
  tabs: PaperResourceTab[];
  current?: string;
  inline?: boolean;
}) {
  if (inline) {
    return tabs.filter(tab => tab.href !== current).map(tab => (
      <Link key={tab.href} href={tab.href}>{tab.label}</Link>
    ));
  }
  return (
    <nav className={styles.actions} aria-label="Paper resources">
      {tabs.map((tab) => (
        <Link
          key={tab.href}
          className={styles.button}
          href={tab.href}
          aria-current={current === tab.href ? 'page' : undefined}
        >
          {tab.label}
        </Link>
      ))}
    </nav>
  );
}
