import { FileText } from 'lucide-react';
import ContinuousDocument from './ContinuousDocument';
import OriginalDocument from './OriginalDocument';

export default function PaperPdfPanel({ url, title, continuous = true }: {
  url: string;
  title: string;
  continuous?: boolean;
}) {
  const Viewer = continuous ? ContinuousDocument : OriginalDocument;
  return (
    <section aria-label="Original board document" style={{ background: '#fff', border: '1.5px solid #cbd5e1',
      borderRadius: 14, overflow: 'hidden', boxShadow: '0 4px 20px rgba(0,0,0,0.06)', marginBottom: '3rem' }}>
      <div style={{ padding: '0.85rem 1.25rem', background: '#f1f5f9', borderBottom: '1px solid #cbd5e1',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.88rem',
        fontWeight: 600, color: 'var(--text-color)', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <FileText size={18} color="#0b5e4a" aria-hidden="true" />
          <span>Original Board Document: <strong>{title}</strong></span>
        </div>
        <a href={url} download style={{ color: 'var(--primary-color)', flexShrink: 0, fontWeight: 700,
          textDecoration: 'underline', fontSize: '0.82rem' }}>Direct Download ⬇</a>
      </div>
      <div style={{ padding: '1rem' }}><Viewer url={url} title={title} /></div>
    </section>
  );
}
