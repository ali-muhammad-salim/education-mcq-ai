import React from 'react';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import prisma from '@/lib/prisma';
import { getFallbackPaper } from '@/lib/paperDataService';
import { PlayCircle, Clock, BookOpen, CheckCircle, ArrowRight, ShieldCheck } from 'lucide-react';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function QuizDetailPage({ params }: PageProps) {
  const resolvedParams = await Promise.resolve(params);
  const rawId = resolvedParams.id;
  const cleanId = (rawId || '').replace(/\.html?$/i, '').trim();

  // Redirect directly to the interactive test runner if requested or default
  redirect(`/quizzes/${encodeURIComponent(cleanId)}/take`);
}
