'use client';

import React, { useState, useRef, useEffect } from 'react';
import { 
  X, Check, Calculator, FlaskConical, PenTool, GitBranch, 
  Search, Undo2, Redo2, Trash2, Sparkles, Plus, Eye, HelpCircle
} from 'lucide-react';
import LatexRenderer from '@/components/LatexRenderer';

interface RichEditorProps {
  isOpen: boolean;
  onClose: () => void;
  onInsert: (content: string, type: 'latex' | 'chem' | 'drawing' | 'diagram') => void;
  initialContent?: string;
  targetFieldLabel?: string;
}

const COMMON_SYMBOLS = [
  // Greek Letters
  { label: 'α (alpha)', code: '\\alpha', cat: 'Greek' },
  { label: 'β (beta)', code: '\\beta', cat: 'Greek' },
  { label: 'γ (gamma)', code: '\\gamma', cat: 'Greek' },
  { label: 'δ (delta)', code: '\\delta', cat: 'Greek' },
  { label: 'Δ (Delta)', code: '\\Delta', cat: 'Greek' },
  { label: 'θ (theta)', code: '\\theta', cat: 'Greek' },
  { label: 'λ (lambda)', code: '\\lambda', cat: 'Greek' },
  { label: 'μ (micro/mu)', code: '\\mu', cat: 'Greek' },
  { label: 'π (pi)', code: '\\pi', cat: 'Greek' },
  { label: 'ρ (rho/density)', code: '\\rho', cat: 'Greek' },
  { label: 'σ (sigma)', code: '\\sigma', cat: 'Greek' },
  { label: 'Σ (summation)', code: '\\sum', cat: 'Greek' },
  { label: 'ω (omega)', code: '\\omega', cat: 'Greek' },
  { label: 'Ω (ohm)', code: '\\Omega', cat: 'Greek' },

  // Physics & Chemistry
  { label: '→ (yields/arrow)', code: '\\rightarrow', cat: 'Chemistry' },
  { label: '⇌ (reversible)', code: '\\rightleftharpoons', cat: 'Chemistry' },
  { label: '°C (Celsius)', code: '^{\\circ}\\text{C}', cat: 'Physics' },
  { label: 'm/s (velocity)', code: '\\text{ m/s}', cat: 'Physics' },
  { label: 'm/s² (accel)', code: '\\text{ m/s}^2', cat: 'Physics' },
  { label: 'kg/m³ (density)', code: '\\text{ kg/m}^3', cat: 'Physics' },
  { label: 'J (Joule)', code: '\\text{ J}', cat: 'Physics' },
  { label: 'N (Newton)', code: '\\text{ N}', cat: 'Physics' },
  { label: 'Pa (Pascal)', code: '\\text{ Pa}', cat: 'Physics' },
  { label: '(s) solid', code: '_{(s)}', cat: 'Chemistry' },
  { label: '(l) liquid', code: '_{(l)}', cat: 'Chemistry' },
  { label: '(g) gas', code: '_{(g)}', cat: 'Chemistry' },
  { label: '(aq) aqueous', code: '_{(aq)}', cat: 'Chemistry' },
  { label: 'ΔH (enthalpy)', code: '\\Delta H', cat: 'Chemistry' },

  // Mathematics
  { label: '± (plus/minus)', code: '\\pm', cat: 'Math' },
  { label: '× (multiply)', code: '\\times', cat: 'Math' },
  { label: '÷ (divide)', code: '\\div', cat: 'Math' },
  { label: '≠ (not equal)', code: '\\neq', cat: 'Math' },
  { label: '≤ (less/equal)', code: '\\leq', cat: 'Math' },
  { label: '≥ (greater/equal)', code: '\\geq', cat: 'Math' },
  { label: '≈ (approx)', code: '\\approx', cat: 'Math' },
  { label: '∞ (infinity)', code: '\\infty', cat: 'Math' },
  { label: '√ (sqrt)', code: '\\sqrt{x}', cat: 'Math' },
  { label: 'fraction', code: '\\frac{a}{b}', cat: 'Math' },
  { label: 'x² (square)', code: 'x^2', cat: 'Math' },
  { label: 'x₁ (subscript)', code: 'x_1', cat: 'Math' },
  { label: 'integral', code: '\\int_{a}^{b} f(x)dx', cat: 'Math' },
  { label: 'matrix (2x2)', code: '\\begin{pmatrix} a & b \\\\ c & d \\end{pmatrix}', cat: 'Math' }
];

export default function RichMathChemDiagramEditor({
  isOpen,
  onClose,
  onInsert,
  initialContent = '',
  targetFieldLabel = 'Field'
}: RichEditorProps) {
  const [activeTab, setActiveTab] = useState<'math' | 'chem' | 'symbols' | 'draw' | 'flowchart'>('math');
  const [latexInput, setLatexInput] = useState(initialContent || 'F = G \\frac{m_1 m_2}{r^2}');
  const [chemInput, setChemInput] = useState('2H_2 + O_2 \\rightarrow 2H_2O');
  const [symbolFilter, setSymbolFilter] = useState('');
  
  // Drawing Canvas State
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawColor, setDrawColor] = useState('#0b5e4a');
  const [drawWidth, setDrawWidth] = useState(3);
  const [drawTool, setDrawTool] = useState<'pen' | 'line' | 'rect' | 'circle' | 'eraser'>('pen');
  const [drawHistory, setDrawHistory] = useState<ImageData[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const startPos = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  useEffect(() => {
    if (isOpen && activeTab === 'draw' && canvasRef.current) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (ctx && drawHistory.length === 0) {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        const initialImg = ctx.getImageData(0, 0, canvas.width, canvas.height);
        setDrawHistory([initialImg]);
        setHistoryIndex(0);
      }
    }
  }, [isOpen, activeTab]);

  if (!isOpen) return null;

  // Insert code at current cursor
  const insertToken = (token: string, mode: 'latex' | 'chem') => {
    if (mode === 'latex') {
      setLatexInput(prev => prev + ' ' + token);
    } else {
      setChemInput(prev => prev + ' ' + token);
    }
  };

  // Drawing helpers
  const startDraw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    startPos.current = { x, y };
    setIsDrawing(true);

    const ctx = canvas.getContext('2d');
    if (ctx && drawTool === 'pen') {
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.strokeStyle = drawColor;
      ctx.lineWidth = drawWidth;
      ctx.lineCap = 'round';
    }
  };

  const drawMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if (drawTool === 'pen') {
      ctx.lineTo(x, y);
      ctx.stroke();
    } else if (drawTool === 'eraser') {
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = drawWidth * 4;
      ctx.lineTo(x, y);
      ctx.stroke();
    }
  };

  const endDraw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    setIsDrawing(false);
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if (drawTool === 'line') {
      ctx.beginPath();
      ctx.moveTo(startPos.current.x, startPos.current.y);
      ctx.lineTo(x, y);
      ctx.strokeStyle = drawColor;
      ctx.lineWidth = drawWidth;
      ctx.stroke();
    } else if (drawTool === 'rect') {
      ctx.beginPath();
      ctx.rect(startPos.current.x, startPos.current.y, x - startPos.current.x, y - startPos.current.y);
      ctx.strokeStyle = drawColor;
      ctx.lineWidth = drawWidth;
      ctx.stroke();
    } else if (drawTool === 'circle') {
      const radius = Math.sqrt(Math.pow(x - startPos.current.x, 2) + Math.pow(y - startPos.current.y, 2));
      ctx.beginPath();
      ctx.arc(startPos.current.x, startPos.current.y, radius, 0, 2 * Math.PI);
      ctx.strokeStyle = drawColor;
      ctx.lineWidth = drawWidth;
      ctx.stroke();
    }

    // Save to history
    const newImg = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const updated = drawHistory.slice(0, historyIndex + 1);
    updated.push(newImg);
    setDrawHistory(updated);
    setHistoryIndex(updated.length - 1);
  };

  const handleClearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    const newImg = ctx.getImageData(0, 0, canvas.width, canvas.height);
    setDrawHistory([...drawHistory, newImg]);
    setHistoryIndex(drawHistory.length);
  };

  const handleUndo = () => {
    if (historyIndex > 0 && canvasRef.current) {
      const ctx = canvasRef.current.getContext('2d');
      if (ctx) {
        ctx.putImageData(drawHistory[historyIndex - 1], 0, 0);
        setHistoryIndex(historyIndex - 1);
      }
    }
  };

  const handleRedo = () => {
    if (historyIndex < drawHistory.length - 1 && canvasRef.current) {
      const ctx = canvasRef.current.getContext('2d');
      if (ctx) {
        ctx.putImageData(drawHistory[historyIndex + 1], 0, 0);
        setHistoryIndex(historyIndex + 1);
      }
    }
  };

  // Insertion dispatcher
  const handleConfirmInsert = () => {
    if (activeTab === 'math' || activeTab === 'symbols') {
      onInsert(`$${latexInput.trim()}$`, 'latex');
    } else if (activeTab === 'chem') {
      onInsert(`$\\ce{${chemInput.trim()}}$`, 'chem');
    } else if (activeTab === 'draw') {
      if (canvasRef.current) {
        const dataUrl = canvasRef.current.toDataURL('image/png');
        onInsert(dataUrl, 'drawing');
      }
    } else if (activeTab === 'flowchart') {
      // Flowchart placeholder diagram
      const flowchartCode = `[Flowchart: Process Flow]`;
      onInsert(flowchartCode, 'diagram');
    }
    onClose();
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0, 0, 0, 0.7)',
      backdropFilter: 'blur(5px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 9999,
      padding: '1.5rem'
    }}>
      <div style={{
        background: '#ffffff',
        borderRadius: '16px',
        width: '100%',
        maxWidth: '780px',
        maxHeight: '90vh',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
        overflow: 'hidden'
      }}>
        
        {/* Modal Header */}
        <div style={{
          padding: '1.25rem 1.75rem',
          borderBottom: '1px solid #e5e7eb',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: '#f9fafb'
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ background: '#e6f0ed', color: '#0b5e4a', fontSize: '0.72rem', fontWeight: 800, padding: '2px 8px', borderRadius: '4px' }}>
                VISUAL CONTENT WORKSPACE
              </span>
              <span style={{ color: '#6b7280', fontSize: '0.8rem' }}>
                Inserting into: <strong>{targetFieldLabel}</strong>
              </span>
            </div>
            <h3 style={{ fontSize: '1.35rem', fontWeight: 800, color: '#111827', margin: '0.25rem 0 0 0' }}>
              Insert Equation, Chemistry Formula & Diagram
            </h3>
          </div>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280' }}
          >
            <X size={22} />
          </button>
        </div>

        {/* Tab Selector */}
        <div style={{
          display: 'flex',
          borderBottom: '1px solid #e5e7eb',
          background: '#ffffff',
          overflowX: 'auto'
        }}>
          {[
            { id: 'math', label: '📐 Math & Equations', icon: <Calculator size={15} /> },
            { id: 'chem', label: '🧪 Chemistry Reactions', icon: <FlaskConical size={15} /> },
            { id: 'symbols', label: '🔣 Symbol Library', icon: <Search size={15} /> },
            { id: 'draw', label: '🎨 Freehand Canvas', icon: <PenTool size={15} /> },
            { id: 'flowchart', label: '📊 Diagram / Flowchart', icon: <GitBranch size={15} /> }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              style={{
                padding: '0.85rem 1.25rem',
                border: 'none',
                background: 'none',
                borderBottom: activeTab === tab.id ? '3px solid #0b5e4a' : '3px solid transparent',
                color: activeTab === tab.id ? '#0b5e4a' : '#4b5563',
                fontWeight: activeTab === tab.id ? 800 : 600,
                fontSize: '0.88rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                whiteSpace: 'nowrap'
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Workspace Body */}
        <div style={{ padding: '1.5rem', overflowY: 'auto', flexGrow: 1 }}>
          
          {/* TAB 1: MATHEMATICAL EQUATIONS */}
          {activeTab === 'math' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              {/* Live KaTeX Preview Box */}
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#374151', marginBottom: '0.35rem' }}>
                  Live Mathematical Typesetting Preview:
                </label>
                <div style={{
                  background: '#f9fafb',
                  border: '1.5px solid #d1d5db',
                  borderRadius: '10px',
                  padding: '1.5rem',
                  minHeight: '80px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '1.3rem'
                }}>
                  <LatexRenderer text={`$${latexInput || '\\text{Enter equation below}'}$`} />
                </div>
              </div>

              {/* LaTeX Code Input Area */}
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#374151', marginBottom: '0.35rem' }}>
                  LaTeX Expression (Editable):
                </label>
                <textarea
                  rows={3}
                  value={latexInput}
                  onChange={(e) => setLatexInput(e.target.value)}
                  placeholder="e.g. F = G \frac{m_1 m_2}{r^2}"
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    borderRadius: '8px',
                    border: '1px solid #d1d5db',
                    fontFamily: 'monospace',
                    fontSize: '0.95rem'
                  }}
                />
              </div>

              {/* Quick Math Template Chips */}
              <div>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#6b7280', display: 'block', marginBottom: '0.4rem' }}>
                  Quick Physics & Mathematics Presets:
                </span>
                <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                  {[
                    { label: 'Fraction (a/b)', code: '\\frac{a}{b}' },
                    { label: 'Square Root √', code: '\\sqrt{x}' },
                    { label: 'Power x²', code: 'x^2' },
                    { label: 'Newton Gravity', code: 'F = G\\frac{m_1 m_2}{r^2}' },
                    { label: 'Kinematics', code: 'v_f^2 = v_i^2 + 2as' },
                    { label: 'Ohm’s Law', code: 'V = IR' },
                    { label: 'Trig sin(θ)', code: '\\sin\\theta' },
                    { label: 'Quadratic Formula', code: 'x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}' },
                    { label: 'Integral', code: '\\int_{a}^{b} f(x)dx' }
                  ].map((t, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => insertToken(t.code, 'latex')}
                      style={{
                        background: '#e6f0ed',
                        border: '1px solid #cce3dc',
                        color: '#0b5e4a',
                        padding: '4px 10px',
                        borderRadius: '6px',
                        fontSize: '0.78rem',
                        fontWeight: 600,
                        cursor: 'pointer'
                      }}
                    >
                      + {t.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: CHEMISTRY NOTATION */}
          {activeTab === 'chem' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              {/* Chemistry Preview */}
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#374151', marginBottom: '0.35rem' }}>
                  Live Chemical Reaction Preview:
                </label>
                <div style={{
                  background: '#f9fafb',
                  border: '1.5px solid #d1d5db',
                  borderRadius: '10px',
                  padding: '1.5rem',
                  minHeight: '80px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '1.3rem'
                }}>
                  <LatexRenderer text={`$${chemInput || '\\text{Enter chemical equation}'}$`} />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#374151', marginBottom: '0.35rem' }}>
                  Chemical Reaction Equation:
                </label>
                <textarea
                  rows={3}
                  value={chemInput}
                  onChange={(e) => setChemInput(e.target.value)}
                  placeholder="e.g. 2H_2 + O_2 \rightarrow 2H_2O"
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    borderRadius: '8px',
                    border: '1px solid #d1d5db',
                    fontFamily: 'monospace',
                    fontSize: '0.95rem'
                  }}
                />
              </div>

              {/* Quick Chemistry Symbols */}
              <div>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#6b7280', display: 'block', marginBottom: '0.4rem' }}>
                  Reaction Arrows & State Symbols:
                </span>
                <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                  {[
                    { label: '→ (yields)', code: '\\rightarrow' },
                    { label: '⇌ (reversible)', code: '\\rightleftharpoons' },
                    { label: '(s) solid', code: '_{(s)}' },
                    { label: '(l) liquid', code: '_{(l)}' },
                    { label: '(g) gas', code: '_{(g)}' },
                    { label: '(aq) aqueous', code: '_{(aq)}' },
                    { label: 'Δ (heat)', code: '\\xrightarrow{\\Delta}' },
                    { label: 'Fe³⁺ ion', code: '\\text{Fe}^{3+}' },
                    { label: 'SO₄²⁻ ion', code: '\\text{SO}_4^{2-}' },
                    { label: 'Water Synthesis', code: '2\\text{H}_2 + \\text{O}_2 \\rightarrow 2\\text{H}_2\\text{O}' },
                    { label: 'Photosynthesis', code: '6\\text{CO}_2 + 6\\text{H}_2\\text{O} \\rightarrow \\text{C}_6\\text{H}_{12}\\text{O}_6 + 6\\text{O}_2' }
                  ].map((t, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => insertToken(t.code, 'chem')}
                      style={{
                        background: '#fef3c7',
                        border: '1px solid #fde68a',
                        color: '#92400e',
                        padding: '4px 10px',
                        borderRadius: '6px',
                        fontSize: '0.78rem',
                        fontWeight: 600,
                        cursor: 'pointer'
                      }}
                    >
                      + {t.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: SEARCHABLE SYMBOL LIBRARY */}
          {activeTab === 'symbols' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ position: 'relative' }}>
                <Search size={16} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} />
                <input
                  type="text"
                  placeholder="Search symbols (e.g. alpha, theta, ohm, delta, micro, infinity)..."
                  value={symbolFilter}
                  onChange={(e) => setSymbolFilter(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.65rem 1rem 0.65rem 2.2rem',
                    borderRadius: '8px',
                    border: '1px solid #d1d5db',
                    fontSize: '0.88rem'
                  }}
                />
              </div>

              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))',
                gap: '0.6rem',
                maxHeight: '340px',
                overflowY: 'auto',
                padding: '0.5rem 0'
              }}>
                {COMMON_SYMBOLS
                  .filter(s => s.label.toLowerCase().includes(symbolFilter.toLowerCase()) || s.cat.toLowerCase().includes(symbolFilter.toLowerCase()))
                  .map((sym, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => {
                        insertToken(sym.code, 'latex');
                        setActiveTab('math');
                      }}
                      style={{
                        background: '#ffffff',
                        border: '1px solid #e5e7eb',
                        borderRadius: '8px',
                        padding: '8px 10px',
                        textAlign: 'left',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '2px'
                      }}
                      onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#0b5e4a'; e.currentTarget.style.background = '#e6f0ed'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#e5e7eb'; e.currentTarget.style.background = '#ffffff'; }}
                    >
                      <span style={{ fontWeight: 800, fontSize: '0.95rem', color: '#111827' }}>
                        {sym.label.split(' ')[0]}
                      </span>
                      <span style={{ fontSize: '0.7rem', color: '#6b7280' }}>
                        {sym.label}
                      </span>
                    </button>
                  ))}
              </div>
            </div>
          )}

          {/* TAB 4: FREEHAND DRAWING CANVAS */}
          {activeTab === 'draw' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {/* Canvas Controls Toolbar */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '0.75rem',
                background: '#f3f4f6',
                padding: '0.65rem 1rem',
                borderRadius: '8px'
              }}>
                {/* Tools */}
                <div style={{ display: 'flex', gap: '0.4rem' }}>
                  {[
                    { id: 'pen', label: '✏️ Pen' },
                    { id: 'line', label: '📏 Line' },
                    { id: 'rect', label: '⬛ Box' },
                    { id: 'circle', label: '⭕ Circle' },
                    { id: 'eraser', label: '🧹 Eraser' }
                  ].map(t => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setDrawTool(t.id as any)}
                      style={{
                        background: drawTool === t.id ? '#0b5e4a' : '#ffffff',
                        color: drawTool === t.id ? '#ffffff' : '#374151',
                        border: '1px solid #d1d5db',
                        borderRadius: '6px',
                        padding: '4px 8px',
                        fontSize: '0.78rem',
                        fontWeight: 700,
                        cursor: 'pointer'
                      }}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>

                {/* Colors */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  {['#0b5e4a', '#111827', '#2563eb', '#dc2626', '#d97706'].map(c => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setDrawColor(c)}
                      style={{
                        width: '22px',
                        height: '22px',
                        borderRadius: '50%',
                        background: c,
                        border: drawColor === c ? '2px solid #000' : '2px solid transparent',
                        cursor: 'pointer'
                      }}
                    />
                  ))}
                </div>

                {/* Undo / Redo / Clear */}
                <div style={{ display: 'flex', gap: '0.35rem' }}>
                  <button
                    type="button"
                    onClick={handleUndo}
                    title="Undo"
                    style={{ background: '#fff', border: '1px solid #d1d5db', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer' }}
                  >
                    <Undo2 size={14} />
                  </button>
                  <button
                    type="button"
                    onClick={handleRedo}
                    title="Redo"
                    style={{ background: '#fff', border: '1px solid #d1d5db', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer' }}
                  >
                    <Redo2 size={14} />
                  </button>
                  <button
                    type="button"
                    onClick={handleClearCanvas}
                    title="Clear Canvas"
                    style={{ background: '#fee2e2', border: '1px solid #f87171', color: '#b91c1c', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer' }}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>

              {/* Canvas Board */}
              <div style={{ border: '2px solid #d1d5db', borderRadius: '10px', overflow: 'hidden', background: '#ffffff', textAlign: 'center' }}>
                <canvas
                  ref={canvasRef}
                  width={700}
                  height={320}
                  onMouseDown={startDraw}
                  onMouseMove={drawMove}
                  onMouseUp={endDraw}
                  onMouseLeave={endDraw}
                  style={{ cursor: drawTool === 'eraser' ? 'cell' : 'crosshair', display: 'block', margin: '0 auto' }}
                />
              </div>
            </div>
          )}

          {/* TAB 5: FLOWCHART & PROCESS DIAGRAM */}
          {activeTab === 'flowchart' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', textAlign: 'center', padding: '2rem 1rem' }}>
              <div style={{
                background: '#f9fafb',
                border: '1.5px dashed #0b5e4a',
                borderRadius: '12px',
                padding: '2.5rem 1.5rem',
                color: '#374151'
              }}>
                <GitBranch size={36} color="#0b5e4a" style={{ margin: '0 auto 0.75rem auto' }} />
                <h4 style={{ fontSize: '1.2rem', fontWeight: 800, margin: '0 0 0.5rem 0' }}>
                  Educational Flowchart & Diagram Framework
                </h4>
                <p style={{ maxWidth: '480px', margin: '0 auto 1.25rem auto', fontSize: '0.88rem', color: '#6b7280', lineHeight: 1.5 }}>
                  Inserts structured SVG diagram notation for computer science algorithms, biological life cycles, and physics force vectors.
                </p>
                <div style={{ display: 'flex', justifyContent: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                  <span style={{ background: '#e6f0ed', color: '#0b5e4a', padding: '6px 12px', borderRadius: '6px', fontSize: '0.8rem', fontWeight: 700 }}>
                    Start/End Terminator
                  </span>
                  <span style={{ background: '#e0f2fe', color: '#0369a1', padding: '6px 12px', borderRadius: '6px', fontSize: '0.8rem', fontWeight: 700 }}>
                    Process Block
                  </span>
                  <span style={{ background: '#fef3c7', color: '#92400e', padding: '6px 12px', borderRadius: '6px', fontSize: '0.8rem', fontWeight: 700 }}>
                    Decision Diamond
                  </span>
                </div>
              </div>
            </div>
          )}

        </div>

        {/* Modal Footer / Insert Action */}
        <div style={{
          padding: '1rem 1.75rem',
          borderTop: '1px solid #e5e7eb',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: '#f9fafb'
        }}>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: '#ffffff',
              border: '1px solid #d1d5db',
              color: '#374151',
              padding: '0.65rem 1.25rem',
              borderRadius: '8px',
              fontSize: '0.88rem',
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            Cancel
          </button>
          
          <button
            type="button"
            onClick={handleConfirmInsert}
            style={{
              background: '#0b5e4a',
              color: '#ffffff',
              border: 'none',
              padding: '0.65rem 1.5rem',
              borderRadius: '8px',
              fontSize: '0.9rem',
              fontWeight: 800,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem',
              boxShadow: '0 4px 12px rgba(11, 94, 74, 0.2)'
            }}
          >
            <Check size={16} />
            <span>Insert Into {targetFieldLabel}</span>
          </button>
        </div>

      </div>
    </div>
  );
}
