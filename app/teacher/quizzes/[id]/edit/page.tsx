'use client';

import { use } from 'react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function EditQuizRedirect({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const resolvedParams = use(params);

  useEffect(() => {
    if (resolvedParams.id) {
      router.replace(`/teacher/quizzes/builder?id=${resolvedParams.id}`);
    }
  }, [resolvedParams.id, router]);

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-400 text-xs">
      Loading assessment editor...
    </div>
  );
}
