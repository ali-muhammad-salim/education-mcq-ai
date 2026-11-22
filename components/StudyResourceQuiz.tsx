'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import type { HsscQuizQuestion } from '@/lib/hsscMcqsData';
import styles from './MaterialLayout.module.css';

const TakeQuizModal = dynamic(() => import('./TakeQuizModal'), { ssr: false });

export default function StudyResourceQuiz({ title, code, questions }: {
  title: string; code: string; questions: HsscQuizQuestion[];
}) {
  const [open, setOpen] = useState(false);
  if (!questions.length) return null;
  return (
    <>
      <button type="button" className={styles.button} onClick={() => setOpen(true)}>
        Take a quiz ({questions.length} {questions.length === 1 ? 'MCQ' : 'MCQs'})
      </button>
      {open && <TakeQuizModal isOpen onClose={() => setOpen(false)} paperTitle={title} paperCode={code} questions={questions} />}
    </>
  );
}
