'use client';

import { useDialog } from '@/lib/use-dialog';
import React, { useState, useEffect } from 'react';
import { Download, CheckCircle2, Clock, X, FileText, AlertCircle } from 'lucide-react';

interface DownloadCountdownModalProps {
  isOpen: boolean;
  onClose: () => void;
  pdfUrl: string;
  paperTitle: string;
  paperCode?: string;
}

export default function DownloadCountdownModal({
  isOpen,
  onClose,
  pdfUrl,
  paperTitle,
  paperCode
}: DownloadCountdownModalProps) {
  const [downloadError, setDownloadError] = useState('');
  const [countdown, setCountdown] = useState<number>(5);
  const [downloadTriggered, setDownloadTriggered] = useState<boolean>(false);

  useEffect(() => {
    if (!isOpen) {
      setCountdown(5);
      setDownloadTriggered(false);
      return;
    }

    setCountdown(5);
    setDownloadTriggered(false);

    const interval = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          triggerDownload();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isOpen, pdfUrl]);

  const triggerDownload = async () => {
    setDownloadError('');
    try { const response = await fetch(pdfUrl, { method: 'HEAD' }); if (!response.ok || !response.headers.get('content-type')?.includes('pdf')) throw new Error('The PDF is unavailable. Please try another document or report the missing file.'); } catch (error) { setDownloadError(error instanceof Error ? error.message : 'Unable to check document.'); return; }
    setDownloadTriggered(true);
    // Programmatically trigger download
    const link = document.createElement('a');
    link.href = pdfUrl;
    link.download = pdfUrl.split('/').pop() || 'AKUEB-Examination-Paper.pdf';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const dialogProps = useDialog(isOpen, 'Download document', onClose);
  if (!isOpen) return null;

  const progressPercent = ((5 - countdown) / 5) * 100;

  return (
    <div {...dialogProps} style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(15, 23, 42, 0.65)',
      backdropFilter: 'blur(6px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 99999,
      padding: '1rem',
      fontFamily: "'Inter', sans-serif"
    }}>
      <div style={{
        background: '#ffffff',
        borderRadius: '20px',
        maxWidth: '460px',
        width: '100%',
        padding: '2rem',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
        position: 'relative',
        textAlign: 'center'
      }}>
        {/* Close Button */}
        <button
          aria-label="Close dialog" onClick={onClose}
          style={{
            position: 'absolute',
            top: '16px',
            right: '16px',
            background: '#f1f5f9',
            border: 'none',
            borderRadius: '50%',
            width: '32px',
            height: '32px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            color: '#64748b'
          }}
        >
          <X size={18} />
        </button>

        {/* Paper Icon & Header */}
        <div style={{
          width: '64px',
          height: '64px',
          borderRadius: '50%',
          background: downloadTriggered ? '#ecfdf5' : '#e8f5f1',
          color: downloadTriggered ? '#059669' : '#0b5e4a',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 1.25rem auto'
        }}>
          {downloadTriggered ? <CheckCircle2 size={36} /> : <FileText size={32} />}
        </div>

        {paperCode && (
          <span style={{
            fontSize: '0.78rem',
            fontWeight: 800,
            color: '#0b5e4a',
            background: '#e8f5f1',
            padding: '3px 10px',
            borderRadius: '6px',
            display: 'inline-block',
            marginBottom: '0.5rem'
          }}>
            {paperCode}
          </span>
        )}

        <h3 style={{
          fontSize: '1.25rem',
          fontWeight: 700,
          color: '#0f172a',
          margin: '0 0 0.5rem 0'
        }}>
          {downloadTriggered ? 'Download requested' : 'Preparing Official PDF'}
        </h3>

        <p style={{
          fontSize: '0.88rem',
          color: '#64748b',
          lineHeight: 1.5,
          margin: '0 0 1.5rem 0'
        }}>
          {paperTitle}
          {downloadError && <span role="alert">{downloadError} <button type="button" onClick={() => void triggerDownload()}>Retry document</button></span>}
        </p>

        {/* 5-Second Countdown Display */}
        {!downloadTriggered ? (
          <div style={{ margin: '1.5rem 0' }}>
            <div style={{
              width: '84px',
              height: '84px',
              borderRadius: '50%',
              border: '4px solid #e2e8f0',
              borderTopColor: '#0b5e4a',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 1rem auto',
              fontSize: '2rem',
              fontWeight: 800,
              color: '#0b5e4a',
              animation: 'spin 1.5s linear infinite'
            }}>
              <span style={{ animation: 'none' }}>{countdown}</span>
            </div>

            <p style={{ fontSize: '0.85rem', color: '#64748b', margin: '0.5rem 0 0 0' }}>
              Your verified examination document will begin downloading in <strong>{countdown} seconds</strong>...
            </p>

            {/* Progress Bar */}
            <div style={{
              width: '100%',
              height: '6px',
              background: '#f1f5f9',
              borderRadius: '3px',
              overflow: 'hidden',
              marginTop: '1.25rem'
            }}>
              <div style={{
                height: '100%',
                width: `${progressPercent}%`,
                background: '#0b5e4a',
                transition: 'width 1s linear'
              }} />
            </div>
          </div>
        ) : (
          <div style={{
            background: '#f0fdf4',
            border: '1px solid #bbf7d0',
            borderRadius: '12px',
            padding: '1rem',
            margin: '1.5rem 0',
            textAlign: 'left'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#166534', fontWeight: 600, fontSize: '0.9rem', marginBottom: '0.25rem' }}>
              <CheckCircle2 size={16} />
              <span>Official Board PDF Download Complete!</span>
            </div>
            <p style={{ fontSize: '0.82rem', color: '#15803d', margin: 0 }}>
              If your download didn't start automatically,{' '}
              <a
                href={pdfUrl}
                download
                style={{ fontWeight: 700, color: '#047857', textDecoration: 'underline' }}
              >
                click here to download directly
              </a>.
            </p>
          </div>
        )}

        <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', marginTop: '1.5rem' }}>
          {downloadTriggered ? (
            <button
              onClick={onClose}
              style={{
                background: '#0b5e4a',
                color: '#ffffff',
                border: 'none',
                padding: '0.65rem 1.75rem',
                borderRadius: '8px',
                fontWeight: 700,
                fontSize: '0.9rem',
                cursor: 'pointer'
              }}
            >
              Done
            </button>
          ) : (
            <>
              <button
                onClick={triggerDownload}
                style={{
                  background: '#0b5e4a',
                  color: '#ffffff',
                  border: 'none',
                  padding: '0.65rem 1.25rem',
                  borderRadius: '8px',
                  fontWeight: 700,
                  fontSize: '0.88rem',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.4rem'
                }}
              >
                <Download size={15} />
                <span>Download Immediately</span>
              </button>
              <button
                onClick={onClose}
                style={{
                  background: '#f1f5f9',
                  color: '#475569',
                  border: '1px solid #e2e8f0',
                  padding: '0.65rem 1.25rem',
                  borderRadius: '8px',
                  fontWeight: 600,
                  fontSize: '0.88rem',
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
