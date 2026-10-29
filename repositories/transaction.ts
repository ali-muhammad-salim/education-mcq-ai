import { Prisma } from '@prisma/client';
import prisma from '@/lib/prisma';
import { ApiError } from '@/lib/api';

export async function serializable<T>(work: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T> {
  return transaction(work, 'Serializable');
}

// Only for workflows that lock their consistency boundary before reading it.
// Each statement sees the latest committed data after waiting for the row lock.
export async function lockedTransaction<T>(work: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T> {
  return transaction(work, 'ReadCommitted');
}

async function transaction<T>(work: (tx: Prisma.TransactionClient) => Promise<T>, isolationLevel: Prisma.TransactionIsolationLevel): Promise<T> {
  for (let attempt = 0; attempt < 4; attempt++) {
    try { return await prisma.$transaction(work, { isolationLevel, maxWait: 10000, timeout: 20000 }); }
    catch (error) {
      const retryable = error instanceof Prisma.PrismaClientKnownRequestError && (['P2034', 'P2002'].includes(error.code) || (error.code === 'P2010' && ['40001', '40P01'].includes(String(error.meta?.code))));
      if (!retryable) throw error;
      if (attempt === 3) throw new ApiError(409, 'CONCURRENT_UPDATE', 'Another update is in progress. Please retry.');
      await new Promise(resolve => setTimeout(resolve, 20 * (attempt + 1)));
    }
  }
  throw new Error('Transaction retry exhausted');
}
