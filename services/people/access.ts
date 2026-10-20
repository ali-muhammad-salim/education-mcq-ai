import prisma from '@/lib/prisma';
import { Prisma } from '@prisma/client';
import { AuthUser } from '@/lib/auth';
import { ApiError } from '@/lib/api';

export function peopleScope(actor: AuthUser): Prisma.UserWhereInput {
  if (actor.role === 'ADMIN') return { NOT: { email: { endsWith: '@system.invalid' } } };
  if (actor.role !== 'TEACHER') throw new ApiError(403, 'FORBIDDEN', 'Educator access is required.');
  return { role: 'STUDENT', OR: [
    { classroomMemberships: { some: { status: 'ENROLLED', classroom: { teacherId: actor.id } } } },
    { quizAttempts: { some: { quiz: { teacherId: actor.id } } } },
  ] };
}
export async function requirePerson(actor: AuthUser, id: string) {
  const person = await prisma.user.findFirst({ where: { AND: [{ id }, peopleScope(actor)] } });
  if (!person) throw new ApiError(404, 'PERSON_NOT_FOUND', 'This account is unavailable in your teaching scope.');
  return person;
}
export function attemptScope(actor: AuthUser, studentId: string): Prisma.QuizAttemptWhereInput {
  return { studentId, ...(actor.role === 'ADMIN' ? {} : { quiz: { teacherId: actor.id } }) };
}
