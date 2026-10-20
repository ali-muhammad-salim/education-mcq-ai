import Link from 'next/link';
export default function ContentUnavailable({ title, back = '/akueb' }: { title: string; back?: string }) {
  return <main style={{ maxWidth: '1100px', margin: '2rem auto', padding: '2rem', borderRadius: '20px', background: 'var(--card-bg, white)', border: '1px solid var(--border-color, #dce5e1)', color: 'var(--text-color, #263e35)' }}><span style={{ color: 'var(--primary-color, #0b5e4a)', fontWeight: 700 }}>Content being prepared</span><h1>{title}</h1><p>Reviewed material for this selection is not available yet. Please choose an available subject or class.</p><Link className="btn" href={back}>Browse available resources</Link></main>;
}
