import type { ReactNode } from 'react';
import { FileText } from 'lucide-react';
import layout from './MaterialLayout.module.css';
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
      {digitalLabel && (
        <div className={styles.topics}>
          <button type="button" className={`${layout.button} ${styles.topic} ${styles.single}`} aria-pressed={!showOriginal} onClick={onShowDigital}>
            {digitalLabel}
          </button>
        </div>
      )}
      {(links || pdfAvailable) && (
        <nav className={styles.links} aria-label="Related resources and original PDF">
          {links}
          {pdfAvailable && (
            <button type="button" className={`${layout.button} ${styles.pdf}`} aria-pressed={showOriginal} onClick={onShowOriginal}>
              <FileText size={16} aria-hidden="true" />
              Original PDF
            </button>
          )}
        </nav>
      )}
    </>
  );
}
