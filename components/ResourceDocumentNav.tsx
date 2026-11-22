import type { ReactNode } from 'react';
import PaperViewSwitch from './PaperViewSwitch';
import styles from './ResourceNavigation.module.css';

export default function ResourceDocumentNav({
  links,
  digitalLabel,
  showOriginal,
  pdfAvailable,
  onShowDigital,
  onShowOriginal,
}: {
  links: ReactNode;
  digitalLabel?: string;
  showOriginal: boolean;
  pdfAvailable: boolean;
  onShowDigital: () => void;
  onShowOriginal: () => void;
}) {
  return (
    <>
      {links && <nav className={styles.links} aria-label="Related resources">{links}</nav>}
      <PaperViewSwitch digitalLabel={digitalLabel} showOriginal={showOriginal} pdfAvailable={pdfAvailable}
        onShowDigital={onShowDigital} onShowOriginal={onShowOriginal} />
    </>
  );
}
