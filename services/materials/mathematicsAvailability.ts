import { normalizeBoardId } from '@/lib/boardCatalog';

export function isBundledMathematics(board: string, grade: number, subject: string): grade is 9 | 10 {
  return normalizeBoardId(board) === 'akueb' && (grade === 9 || grade === 10) && subject.toLowerCase() === 'mathematics';
}

export function mathematicsStoreUnavailable(error: unknown) {
  if (!error || typeof error !== 'object') return false;
  const { name, code, errorCode, meta } = error as { name?: string; code?: string; errorCode?: string; meta?: { code?: string } };
  return name === 'PrismaClientInitializationError'
    || ['P2021', 'P2022', 'P1001'].includes(code ?? errorCode ?? '')
    || (code === 'P2010' && ['42P01', '42703'].includes(meta?.code ?? ''));
}
