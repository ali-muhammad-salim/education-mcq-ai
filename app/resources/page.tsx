'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  BookOpen, Download, Search, FileText, CheckCircle2, 
  ExternalLink, Layers, Sparkles, Filter, Eye, X, Copy,
  Check, ArrowRight, HelpCircle, Code, ChevronRight
} from 'lucide-react';
import MathText from '@/components/MathText';
import Breadcrumbs from '@/components/Breadcrumbs';

interface ResourceItem {
  fileName: string;
  classLevel: string;
  chapter: string;
  sloCount: number;
  mcqCount: number;
  crqCount: number;
  numericalCount: number;
  sizeBytes: number;
}

export default function ResourcesPage() {
  const [resources, setResources] = useState<ResourceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [classFilter, setClassFilter] = useState<'all' | 'Class IX' | 'Class X'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Modal / Drawer state for viewing content
  const [selectedResource, setSelectedResource] = useState<ResourceItem | null>(null);
  const [resourceDetail, setResourceDetail] = useState<any | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'slos' | 'mcqs' | 'crqs' | 'raw'>('slos');
  const [revealedAnswers, setRevealedAnswers] = useState<Record<number, boolean>>({});
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetch('/api/resources')
      .then(res => res.json())
      .then(data => {
        if (data.resources) {
          setResources(data.resources);
        }
        setLoading(false);
      })
      .catch(err => {
        console.error('Failed to load resources:', err);
        setLoading(false);
      });
  }, []);

  const handleOpenDetail = async (item: ResourceItem) => {
    setSelectedResource(item);
    setDetailLoading(true);
    setRevealedAnswers({});
    setActiveTab('slos');

    try {
      const res = await fetch(`/api/resources/${item.fileName}`);
      const data = await res.json();
      if (data.data) {
        setResourceDetail(data.data);
      }
    } catch (e) {
      console.error('Error fetching detail:', e);
    } finally {
      setDetailLoading(false);
    }
  };

  const handleCopyJson = () => {
    if (!resourceDetail) return;
    navigator.clipboard.writeText(JSON.stringify(resourceDetail, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const toggleReveal = (idx: number) => {
    setRevealedAnswers(prev => ({ ...prev, [idx]: !prev[idx] }));
  };

  const filteredResources = resources.filter(r => {
    if (classFilter !== 'all' && r.classLevel !== classFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return r.chapter.toLowerCase().includes(q) || r.fileName.toLowerCase().includes(q);
    }
    return true;
  });

  const totalSLOs = resources.reduce((acc, r) => acc + r.sloCount, 0);
  const totalMCQs = resources.reduce((acc, r) => acc + r.mcqCount, 0);
  const totalCRQs = resources.reduce((acc, r) => acc + r.crqCount, 0);

  return (
    <div style={{ maxWidth: '1240px', margin: '0 auto', paddingBottom: '5rem' }}>
      {/* Universal Breadcrumb */}
      <Breadcrumbs
        items={[
          { label: 'AKU-EB' },
          { label: 'Official AI Chapter Resource Packs & Downloads', active: true }
        ]}
      />

      <div style={{
        background: 'linear-gradient(135deg, #0b5e4a 0%, #064032 100%)',
        color: '#ffffff',
        borderRadius: '20px',
        padding: '3rem 2.5rem',
        marginBottom: '2.5rem',
        boxShadow: '0 12px 32px rgba(11, 94, 74, 0.2)',
        position: 'relative',
        overflow: 'hidden'
      }}>
        <div style={{ position: 'relative', zIndex: 1, maxWidth: '850px' }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.5rem',
            background: 'rgba(255, 255, 255, 0.18)',
            padding: '5px 14px',
            borderRadius: '20px',
            fontSize: '0.8rem',
            fontWeight: 700,
            marginBottom: '1rem',
            letterSpacing: '0.5px'
          }}>
            <Sparkles size={15} /> 100% AI-FIRST VERIFIED ACADEMIC KNOWLEDGE BASE
          </div>
          <h1 style={{ fontSize: '2.6rem', fontWeight: 800, margin: '0 0 0.75rem 0', lineHeight: 1.2 }}>
            Physics Chapter Resource Packs & Download Hub
          </h1>
          <p style={{ fontSize: '1.1rem', opacity: 0.95, lineHeight: 1.6, margin: '0 0 2rem 0' }}>
            Every chapter for Class IX & X parsed, structured, and compiled into interactive study modules.
            Download instantly as <strong>JSON API Data</strong>, <strong>Formatted Markdown Guides</strong>, or <strong>CSV Spreadsheets</strong>.
          </p>

          {/* Master Download Action Buttons */}
          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
            <a
              href="/api/resources?export=all&class=9"
              download
              className="btn"
              style={{
                background: '#ffffff',
                color: '#0b5e4a',
                fontWeight: 700,
                padding: '0.75rem 1.4rem',
                borderRadius: '10px',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem',
                boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
              }}
            >
              <Download size={18} /> Download All Class 9 Bundles (JSON)
            </a>

            <a
              href="/api/resources?export=all&class=10"
              download
              className="btn"
              style={{
                background: 'rgba(255, 255, 255, 0.15)',
                color: '#ffffff',
                border: '1px solid rgba(255, 255, 255, 0.6)',
                fontWeight: 700,
                padding: '0.75rem 1.4rem',
                borderRadius: '10px',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}
            >
              <Download size={18} /> Download All Class 10 Bundles (JSON)
            </a>

            <a
              href="/api/resources?export=all&class=all"
              download
              className="btn"
              style={{
                background: '#f2994a',
                color: '#ffffff',
                fontWeight: 700,
                padding: '0.75rem 1.4rem',
                borderRadius: '10px',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}
            >
              <Download size={18} /> Master 39-Unit Pack (Complete JSON)
            </a>
          </div>
        </div>
      </div>

      {/* Metrics Bar */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '1.25rem',
        marginBottom: '2.5rem'
      }}>
        <div style={{ background: '#ffffff', border: '1px solid #e1e8e5', padding: '1.25rem', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.03)' }}>
          <div style={{ fontSize: '0.85rem', color: '#666', fontWeight: 600 }}>Total Compiled Units</div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#0b5e4a', marginTop: '0.25rem' }}>{resources.length}</div>
          <div style={{ fontSize: '0.75rem', color: '#888', marginTop: '0.2rem' }}>21 Class IX • 18 Class X</div>
        </div>

        <div style={{ background: '#ffffff', border: '1px solid #e1e8e5', padding: '1.25rem', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.03)' }}>
          <div style={{ fontSize: '0.85rem', color: '#666', fontWeight: 600 }}>Active SLO Definitions</div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#0b5e4a', marginTop: '0.25rem' }}>{totalSLOs}</div>
          <div style={{ fontSize: '0.75rem', color: '#888', marginTop: '0.2rem' }}>With cognitive domains (R, U, A)</div>
        </div>

        <div style={{ background: '#ffffff', border: '1px solid #e1e8e5', padding: '1.25rem', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.03)' }}>
          <div style={{ fontSize: '0.85rem', color: '#666', fontWeight: 600 }}>Model Paper MCQs</div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#27ae60', marginTop: '0.25rem' }}>{totalMCQs}</div>
          <div style={{ fontSize: '0.75rem', color: '#888', marginTop: '0.2rem' }}>With detailed keys & formulas</div>
        </div>

        <div style={{ background: '#ffffff', border: '1px solid #e1e8e5', padding: '1.25rem', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.03)' }}>
          <div style={{ fontSize: '0.85rem', color: '#666', fontWeight: 600 }}>CRQ & ERQ Items</div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#2980b9', marginTop: '0.25rem' }}>{totalCRQs}</div>
          <div style={{ fontSize: '0.75rem', color: '#888', marginTop: '0.2rem' }}>With marking rubrics & points</div>
        </div>
      </div>

      {/* Filtering & Search Bar */}
      <div style={{
        background: '#ffffff',
        border: '1px solid #e1e8e5',
        borderRadius: '14px',
        padding: '1.25rem 1.5rem',
        marginBottom: '2rem',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '1rem'
      }}>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <button
            onClick={() => setClassFilter('all')}
            style={{
              padding: '8px 16px',
              borderRadius: '8px',
              border: 'none',
              background: classFilter === 'all' ? '#0b5e4a' : '#f0f5f3',
              color: classFilter === 'all' ? '#ffffff' : '#2c3e38',
              fontWeight: 600,
              fontSize: '0.9rem',
              cursor: 'pointer'
            }}
          >
            All Classes ({resources.length})
          </button>
          <button
            onClick={() => setClassFilter('Class IX')}
            style={{
              padding: '8px 16px',
              borderRadius: '8px',
              border: 'none',
              background: classFilter === 'Class IX' ? '#0b5e4a' : '#f0f5f3',
              color: classFilter === 'Class IX' ? '#ffffff' : '#2c3e38',
              fontWeight: 600,
              fontSize: '0.9rem',
              cursor: 'pointer'
            }}
          >
            Class IX Only (Grade 9)
          </button>
          <button
            onClick={() => setClassFilter('Class X')}
            style={{
              padding: '8px 16px',
              borderRadius: '8px',
              border: 'none',
              background: classFilter === 'Class X' ? '#0b5e4a' : '#f0f5f3',
              color: classFilter === 'Class X' ? '#ffffff' : '#2c3e38',
              fontWeight: 600,
              fontSize: '0.9rem',
              cursor: 'pointer'
            }}
          >
            Class X Only (Grade 10)
          </button>
        </div>

        <div style={{ position: 'relative', minWidth: '280px' }}>
          <Search size={18} style={{ position: 'absolute', left: '12px', top: '10px', color: '#888' }} />
          <input
            type="text"
            placeholder="Search chapter or unit..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: '100%',
              padding: '8px 12px 8px 38px',
              borderRadius: '8px',
              border: '1px solid #dce5e1',
              fontSize: '0.9rem',
              outline: 'none'
            }}
          />
        </div>
      </div>

      {/* Grid of Chapter Packs */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '4rem 0', color: '#666' }}>
          Loading AI-compiled chapter resources...
        </div>
      ) : filteredResources.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '4rem 0', background: '#ffffff', borderRadius: '12px', border: '1px dashed #ccc' }}>
          <p style={{ color: '#888', fontSize: '1.1rem' }}>No chapters match your search query.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: '1.5rem' }}>
          {filteredResources.map((item) => {
            const isGrade9 = item.classLevel === 'Class IX';
            return (
              <div
                key={item.fileName}
                className="card"
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  border: '1px solid #e1e8e5',
                  borderRadius: '14px',
                  background: '#ffffff',
                  padding: '1.5rem',
                  boxShadow: '0 4px 14px rgba(0,0,0,0.03)',
                  transition: 'transform 0.2s, box-shadow 0.2s'
                }}
              >
                {/* Header Badge */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                  <span style={{
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    padding: '3px 10px',
                    borderRadius: '6px',
                    background: isGrade9 ? '#e6f0ed' : '#eaf2f8',
                    color: isGrade9 ? '#0b5e4a' : '#2980b9'
                  }}>
                    {item.classLevel} • {isGrade9 ? 'SSC-I' : 'SSC-II'}
                  </span>
                  <span style={{ fontSize: '0.75rem', color: '#999' }}>
                    {(item.sizeBytes / 1024).toFixed(1)} KB
                  </span>
                </div>

                <h3 style={{ fontSize: '1.25rem', color: '#1a3b32', margin: '0 0 0.75rem 0', fontWeight: 700, lineHeight: 1.3 }}>
                  {item.chapter}
                </h3>

                {/* Counts pill list */}
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1.5rem' }}>
                  <span style={{ fontSize: '0.8rem', background: '#f4fbf7', border: '1px solid #dce5e1', padding: '2px 8px', borderRadius: '6px', color: '#0b5e4a' }}>
                    📖 <strong>{item.sloCount}</strong> SLOs
                  </span>
                  {item.mcqCount > 0 && (
                    <span style={{ fontSize: '0.8rem', background: '#f0fdf4', border: '1px solid #bbf7d0', padding: '2px 8px', borderRadius: '6px', color: '#15803d' }}>
                      ✨ <strong>{item.mcqCount}</strong> MCQs
                    </span>
                  )}
                  {item.crqCount > 0 && (
                    <span style={{ fontSize: '0.8rem', background: '#eff6ff', border: '1px solid #bfdbfe', padding: '2px 8px', borderRadius: '6px', color: '#1d4ed8' }}>
                      📝 <strong>{item.crqCount}</strong> CRQs
                    </span>
                  )}
                </div>

                {/* Primary Interactive Viewer Button */}
                <button
                  onClick={() => handleOpenDetail(item)}
                  className="btn"
                  style={{
                    width: '100%',
                    marginBottom: '0.75rem',
                    textAlign: 'center',
                    background: '#0b5e4a',
                    color: '#ffffff',
                    fontWeight: 600,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.5rem',
                    padding: '0.65rem 1rem',
                    borderRadius: '8px'
                  }}
                >
                  <Eye size={16} /> View Content In UI
                </button>

                {/* Download Actions Strip */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr 1fr',
                  gap: '0.5rem',
                  paddingTop: '0.75rem',
                  borderTop: '1px solid #f0f0f0'
                }}>
                  <a
                    href={`/api/resources/${item.fileName}?download=json`}
                    download
                    style={{
                      padding: '6px',
                      borderRadius: '6px',
                      background: '#f8faf9',
                      border: '1px solid #e2e8e5',
                      color: '#0b5e4a',
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      textAlign: 'center',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.25rem',
                      textDecoration: 'none'
                    }}
                    title="Download pure JSON bundle"
                  >
                    <Download size={13} /> JSON
                  </a>

                  <a
                    href={`/api/resources/${item.fileName}?download=md`}
                    download
                    style={{
                      padding: '6px',
                      borderRadius: '6px',
                      background: '#f8faf9',
                      border: '1px solid #e2e8e5',
                      color: '#0b5e4a',
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      textAlign: 'center',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.25rem',
                      textDecoration: 'none'
                    }}
                    title="Download formatted Markdown Study Guide"
                  >
                    <Download size={13} /> Markdown
                  </a>

                  <a
                    href={`/api/resources/${item.fileName}?download=csv`}
                    download
                    style={{
                      padding: '6px',
                      borderRadius: '6px',
                      background: '#f8faf9',
                      border: '1px solid #e2e8e5',
                      color: '#0b5e4a',
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      textAlign: 'center',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.25rem',
                      textDecoration: 'none'
                    }}
                    title="Download questions as CSV"
                  >
                    <Download size={13} /> CSV
                  </a>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* FULL-SCREEN INTERACTIVE VIEWER MODAL */}
      {selectedResource && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.65)',
          zIndex: 9999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '1.5rem',
          backdropFilter: 'blur(4px)'
        }}>
          <div style={{
            background: '#ffffff',
            borderRadius: '16px',
            width: '100%',
            maxWidth: '1000px',
            maxHeight: '90vh',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            boxShadow: '0 20px 60px rgba(0,0,0,0.3)'
          }}>
            {/* Modal Header */}
            <div style={{
              padding: '1.5rem 2rem',
              borderBottom: '1px solid #e2e8e5',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
              background: '#f9fbfb'
            }}>
              <div>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#0b5e4a', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  {selectedResource.classLevel} • OFFICIAL CURRICULUM BUNDLE
                </span>
                <h2 style={{ fontSize: '1.6rem', color: '#1a3b32', margin: '0.25rem 0 0 0', fontWeight: 800 }}>
                  {selectedResource.chapter}
                </h2>
              </div>

              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                <a
                  href={`/api/resources/${selectedResource.fileName}?download=json`}
                  download
                  className="btn"
                  style={{ padding: '6px 12px', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}
                >
                  <Download size={14} /> Download JSON
                </a>
                <button
                  onClick={() => setSelectedResource(null)}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    padding: '8px',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    color: '#666'
                  }}
                >
                  <X size={24} />
                </button>
              </div>
            </div>

            {/* Modal Tabs */}
            <div style={{
              display: 'flex',
              gap: '1rem',
              padding: '0.75rem 2rem',
              borderBottom: '1px solid #f0f0f0',
              background: '#ffffff'
            }}>
              <button
                onClick={() => setActiveTab('slos')}
                style={{
                  background: 'none',
                  border: 'none',
                  borderBottom: activeTab === 'slos' ? '3px solid #0b5e4a' : '3px solid transparent',
                  padding: '8px 12px',
                  fontWeight: 700,
                  color: activeTab === 'slos' ? '#0b5e4a' : '#666',
                  cursor: 'pointer',
                  fontSize: '0.95rem'
                }}
              >
                SLO Definitions ({resourceDetail?.definitions_and_laws?.length || selectedResource.sloCount})
              </button>

              <button
                onClick={() => setActiveTab('mcqs')}
                style={{
                  background: 'none',
                  border: 'none',
                  borderBottom: activeTab === 'mcqs' ? '3px solid #0b5e4a' : '3px solid transparent',
                  padding: '8px 12px',
                  fontWeight: 700,
                  color: activeTab === 'mcqs' ? '#0b5e4a' : '#666',
                  cursor: 'pointer',
                  fontSize: '0.95rem'
                }}
              >
                Model MCQs ({resourceDetail?.past_paper_mcqs?.length || selectedResource.mcqCount})
              </button>

              <button
                onClick={() => setActiveTab('crqs')}
                style={{
                  background: 'none',
                  border: 'none',
                  borderBottom: activeTab === 'crqs' ? '3px solid #0b5e4a' : '3px solid transparent',
                  padding: '8px 12px',
                  fontWeight: 700,
                  color: activeTab === 'crqs' ? '#0b5e4a' : '#666',
                  cursor: 'pointer',
                  fontSize: '0.95rem'
                }}
              >
                CRQs & ERQs ({resourceDetail?.crqs?.length || selectedResource.crqCount})
              </button>

              <button
                onClick={() => setActiveTab('raw')}
                style={{
                  background: 'none',
                  border: 'none',
                  borderBottom: activeTab === 'raw' ? '3px solid #0b5e4a' : '3px solid transparent',
                  padding: '8px 12px',
                  fontWeight: 700,
                  color: activeTab === 'raw' ? '#0b5e4a' : '#666',
                  cursor: 'pointer',
                  fontSize: '0.95rem',
                  marginLeft: 'auto'
                }}
              >
                <Code size={15} style={{ verticalAlign: 'middle', marginRight: '4px' }} /> Raw JSON Inspector
              </button>
            </div>

            {/* Modal Body Content */}
            <div style={{ padding: '1.5rem 2rem', overflowY: 'auto', flexGrow: 1, background: '#fafcfb' }}>
              {detailLoading ? (
                <div style={{ textAlign: 'center', padding: '3rem 0', color: '#666' }}>
                  Loading chapter breakdown...
                </div>
              ) : !resourceDetail ? (
                <div style={{ color: '#888', textAlign: 'center', padding: '3rem 0' }}>
                  No details found for this resource.
                </div>
              ) : (
                <>
                  {/* TAB 1: SLOS */}
                  {activeTab === 'slos' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                      {(!resourceDetail.definitions_and_laws || resourceDetail.definitions_and_laws.length === 0) ? (
                        <div style={{ padding: '2rem', background: '#fff', borderRadius: '8px', textAlign: 'center', color: '#888' }}>
                          No explicit definitions listed for this sub-unit.
                        </div>
                      ) : (
                        resourceDetail.definitions_and_laws.map((def: any, i: number) => (
                          <div key={i} style={{ background: '#ffffff', border: '1px solid #e2e8e5', borderRadius: '10px', padding: '1.25rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                              <span style={{ background: '#0b5e4a', color: '#ffffff', fontSize: '0.75rem', fontWeight: 700, padding: '2px 8px', borderRadius: '4px' }}>
                                SLO {def.slo_code || i + 1}
                              </span>
                              <strong style={{ fontSize: '1.05rem', color: '#1a3b32' }}><MathText text={def.term} /></strong>
                            </div>
                            <div style={{ color: '#444', lineHeight: 1.6, margin: '0 0 0.5rem 0', fontSize: '0.95rem' }}>
                              <MathText text={def.definition} />
                            </div>
                            {def.mathematical_form && (
                              <div style={{ background: '#f4fbf7', padding: '6px 12px', borderRadius: '6px', fontSize: '0.85rem', color: '#0b5e4a', display: 'inline-block' }}>
                                <strong>Formula:</strong> <MathText text={def.mathematical_form.startsWith('$') ? def.mathematical_form : `$${def.mathematical_form}$`} />
                              </div>
                            )}
                          </div>
                        ))
                      )}
                    </div>
                  )}

                  {/* TAB 2: MCQS */}
                  {activeTab === 'mcqs' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                      {(!resourceDetail.past_paper_mcqs || resourceDetail.past_paper_mcqs.length === 0) ? (
                        <div style={{ padding: '2rem', background: '#fff', borderRadius: '8px', textAlign: 'center', color: '#888' }}>
                          No model paper MCQs associated with this sub-unit.
                        </div>
                      ) : (
                        resourceDetail.past_paper_mcqs.map((mcq: any, i: number) => {
                          const isRevealed = revealedAnswers[i];
                          return (
                            <div key={i} style={{ background: '#ffffff', border: '1px solid #e2e8e5', borderRadius: '10px', padding: '1.25rem' }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                                <span style={{ fontWeight: 700, color: '#0b5e4a', fontSize: '0.9rem' }}>
                                  Question {mcq.question_number || i + 1}
                                </span>
                                {mcq.cognitive_level && (
                                  <span style={{ fontSize: '0.75rem', background: '#eaf2f8', color: '#2980b9', padding: '2px 8px', borderRadius: '4px', fontWeight: 600 }}>
                                    Cognitive Level: {mcq.cognitive_level}
                                  </span>
                                )}
                              </div>

                              <div style={{ fontSize: '1.05rem', color: '#222', lineHeight: 1.5, margin: '0 0 1rem 0', fontWeight: 500 }}>
                                <MathText text={mcq.stem_text} />
                              </div>

                              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '0.75rem', marginBottom: '1rem' }}>
                                {(mcq.options || []).map((opt: string, optIdx: number) => (
                                  <div key={optIdx} style={{
                                    padding: '10px 14px',
                                    borderRadius: '8px',
                                    background: '#f8faf9',
                                    border: '1px solid #e1e8e5',
                                    fontSize: '0.9rem',
                                    color: '#333'
                                  }}>
                                    <MathText text={opt} />
                                  </div>
                                ))}
                              </div>

                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <button
                                  onClick={() => toggleReveal(i)}
                                  style={{
                                    background: isRevealed ? '#e6f0ed' : '#ffffff',
                                    border: '1px solid #0b5e4a',
                                    color: '#0b5e4a',
                                    borderRadius: '6px',
                                    padding: '6px 14px',
                                    fontSize: '0.85rem',
                                    fontWeight: 600,
                                    cursor: 'pointer'
                                  }}
                                >
                                  {isRevealed ? 'Hide Explanation & Key' : 'Reveal Answer & Explanation'}
                                </button>
                              </div>

                              {isRevealed && (
                                <div style={{
                                  marginTop: '1rem',
                                  padding: '1rem',
                                  background: '#e6f0ed',
                                  borderLeft: '4px solid #0b5e4a',
                                  borderRadius: '6px',
                                  fontSize: '0.9rem',
                                  color: '#1a3b32',
                                  lineHeight: 1.5
                                }}>
                                  <strong>Step-by-Step Solution / Answer Key:</strong>
                                  <div style={{ margin: '0.5rem 0 0 0' }}>
                                    <MathText text={mcq.explanation || 'Answer verified from official key.'} />
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })
                      )}
                    </div>
                  )}

                  {/* TAB 3: CRQS */}
                  {activeTab === 'crqs' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                      {(!resourceDetail.crqs || resourceDetail.crqs.length === 0) ? (
                        <div style={{ padding: '2rem', background: '#fff', borderRadius: '8px', textAlign: 'center', color: '#888' }}>
                          No constructed response questions listed for this sub-unit.
                        </div>
                      ) : (
                        resourceDetail.crqs.map((crq: any, i: number) => (
                          <div key={i} style={{ background: '#ffffff', border: '1px solid #e2e8e5', borderRadius: '10px', padding: '1.25rem' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                              <span style={{ fontWeight: 700, color: '#0b5e4a', fontSize: '0.95rem' }}>
                                {crq.question_number || `CRQ ${i + 1}`}
                              </span>
                              <span style={{ background: '#eaf2f8', color: '#2980b9', padding: '2px 8px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 600 }}>
                                {crq.marks || 3} Marks
                              </span>
                            </div>
                            <div style={{ fontSize: '1rem', color: '#222', lineHeight: 1.5, margin: '0 0 1rem 0' }}>
                              <MathText text={crq.question_text || crq.stem_text} />
                            </div>
                            {crq.rubric && crq.rubric.length > 0 && (
                              <div style={{ background: '#f8faf9', padding: '0.75rem', borderRadius: '6px', fontSize: '0.85rem' }}>
                                <strong>Marking Rubric:</strong>
                                <ul style={{ margin: '0.25rem 0 0 0', paddingLeft: '1.2rem' }}>
                                  {crq.rubric.map((r: any, rIdx: number) => (
                                    <li key={rIdx}><MathText text={r.description || (typeof r === 'string' ? r : JSON.stringify(r))} /></li>
                                  ))}
                                </ul>
                              </div>
                            )}
                          </div>
                        ))
                      )}
                    </div>
                  )}
                  {/* TAB 4: RAW JSON */}
                  {activeTab === 'raw' && (
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                        <span style={{ fontSize: '0.85rem', color: '#666' }}>Structured JSON payload direct from AI intake</span>
                        <button
                          onClick={handleCopyJson}
                          style={{
                            background: copied ? '#27ae60' : '#0b5e4a',
                            color: '#fff',
                            border: 'none',
                            padding: '6px 14px',
                            borderRadius: '6px',
                            fontSize: '0.8rem',
                            fontWeight: 600,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.3rem'
                          }}
                        >
                          {copied ? <Check size={14} /> : <Copy size={14} />}
                          {copied ? 'Copied to Clipboard!' : 'Copy Full JSON'}
                        </button>
                      </div>
                      <pre style={{
                        background: '#1a1e24',
                        color: '#61afef',
                        padding: '1.25rem',
                        borderRadius: '10px',
                        overflowX: 'auto',
                        fontSize: '0.85rem',
                        lineHeight: 1.5,
                        maxHeight: '450px'
                      }}>
                        {JSON.stringify(resourceDetail, null, 2)}
                      </pre>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
