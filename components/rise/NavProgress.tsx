'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import styles from './nav-progress.module.css';

/** Indeterminate rule pinned to the top of the viewport while a link navigation is in flight.
 * Clicks are watched at the document level so every link in the app is covered without each one
 * having to opt in. The bar fades in after a delay, so a prefetched route that commits instantly
 * never shows it. */
export default function NavProgress() {
  const [pendingNav, setPendingNav] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    setPendingNav(false);
  }, [pathname]);

  useEffect(() => {
    if (!pendingNav) return;
    const giveUp = setTimeout(() => setPendingNav(false), 15000);
    return () => clearTimeout(giveUp);
  }, [pendingNav]);

  useEffect(() => {
    const navigatesInThisTab = (anchor: HTMLAnchorElement) => {
      const href = anchor.getAttribute('href');
      if (!href || href.startsWith('#') || anchor.hasAttribute('download')) return false;
      if (anchor.target && anchor.target !== '_self') return false;
      if (/^(mailto:|tel:|javascript:)/i.test(href)) return false;
      try {
        return new URL(href, window.location.origin).origin === window.location.origin;
      } catch {
        return false;
      }
    };

    const onClick = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0) return;
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const anchor = (event.target as Element | null)?.closest?.('a');
      if (!(anchor instanceof HTMLAnchorElement) || !navigatesInThisTab(anchor)) return;
      setPendingNav(true);
    };

    const onUnload = () => setPendingNav(false);

    document.addEventListener('click', onClick, true);
    window.addEventListener('pagehide', onUnload);
    return () => {
      document.removeEventListener('click', onClick, true);
      window.removeEventListener('pagehide', onUnload);
    };
  }, []);

  if (!pendingNav) return null;

  return (
    <div className={`rise-ui ${styles.progress}`} role="progressbar" aria-label="Loading page">
      <span className={styles.track} />
      <span className={styles.sweep} />
    </div>
  );
}
