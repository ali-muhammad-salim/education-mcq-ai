import type { CSSProperties } from 'react';
import { FileText, Sparkles } from 'lucide-react';

const buttonStyle: CSSProperties = {
  padding: '11px 20px', borderRadius: '10px', fontSize: '0.95rem', minHeight: '46px',
  fontWeight: 800, color: '#fff', border: 'none', cursor: 'pointer', display: 'flex',
  alignItems: 'center', justifyContent: 'center', gap: '0.5rem', transition: 'all 0.15s ease',
};

export default function PaperViewSwitch({ digitalLabel, showOriginal, pdfAvailable, onShowDigital, onShowOriginal }: {
  digitalLabel?: string;
  showOriginal: boolean;
  pdfAvailable: boolean;
  onShowDigital: () => void;
  onShowOriginal: () => void;
}) {
  if (!digitalLabel && !pdfAvailable) return null;
  return (
    <div role="group" aria-label="Document view" data-paper-switch style={{
      background: '#151f32', border: '1px solid #26334d', borderRadius: '14px', padding: '6px',
      display: 'grid', gridTemplateColumns: digitalLabel && pdfAvailable ? '1fr 1fr' : '1fr',
      gap: '6px', marginBottom: '1.5rem', boxShadow: '0 4px 16px rgba(15, 23, 42, 0.18)',
    }}>
      {digitalLabel && <button type="button" data-paper-switch-btn aria-pressed={!showOriginal} onClick={onShowDigital}
        style={{ ...buttonStyle, background: !showOriginal ? '#066e4f' : 'transparent' }}>
        <Sparkles size={18} aria-hidden="true" /><span>{digitalLabel}</span>
      </button>}
      {pdfAvailable && <button type="button" data-paper-switch-btn aria-pressed={showOriginal} onClick={onShowOriginal}
        style={{ ...buttonStyle, background: showOriginal ? '#066e4f' : 'transparent' }}>
        <FileText size={18} aria-hidden="true" /><span>Original PDF</span>
      </button>}
    </div>
  );
}
