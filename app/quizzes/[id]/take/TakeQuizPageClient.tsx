'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import TakeQuizModal from '@/components/TakeQuizModal';

interface Props {
  paperTitle: string;
  paperCode: string;
  questions: any[];
}

export default function TakeQuizPageClient({ paperTitle, paperCode, questions }: Props) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(true);

  const handleClose = () => {
    setIsOpen(false);
    if (paperCode && !paperCode.startsWith('sample-quiz-')) {
      router.push(`/past-papers/${paperCode}`);
    } else {
      router.push('/past-papers');
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ textAlign: 'center', color: '#0b5e4a', padding: '2rem' }}>
        <div style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '0.4rem', color: '#0f172a' }}>{paperTitle}</div>
        <div style={{ fontSize: '0.9rem', color: '#64748b' }}>Opening Assessment Engine...</div>
      </div>
      <TakeQuizModal
        isOpen={isOpen}
        onClose={handleClose}
        paperTitle={paperTitle}
        paperCode={paperCode}
        questions={questions}
      />
    </div>
  );
}
