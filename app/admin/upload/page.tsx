'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function AdminUploadRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/upload');
  }, [router]);

  return (
    <div style={{ textAlign: 'center', padding: '4rem 0' }}>
      Redirecting to the Resource Ingestion & Upload Center...
    </div>
  );
}
