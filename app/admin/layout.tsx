import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Platform overview | Rise Learner' };

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
