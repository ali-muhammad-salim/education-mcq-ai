import { Prisma } from '@prisma/client';
import prisma from '@/lib/prisma';
import { createHash } from 'node:crypto';
import {ApiError} from '@/lib/api';

const stableId = (value: string) => 'catalog-' + createHash('sha256').update(value).digest('hex').slice(0, 24);
export async function resolveAcademicMetadata(tx: Prisma.TransactionClient, boardCode: string, level: number, subjectName: string) {
  const code = boardCode.trim().toUpperCase(), name = subjectName.trim();
  const boards=await tx.board.findMany({where:{shortCode:{equals:code,mode:'insensitive'}},take:2});
  if(boards.length>1)throw new ApiError(422,'AMBIGUOUS_BOARD','Resolve duplicate board codes before publishing curriculum.');
  const board = boards[0] || await tx.board.upsert({ where: { shortCode: code }, update: {}, create: { shortCode: code, name: code, country: 'Pakistan' } });
  const programmeName = level <= 10 ? 'SSC' : 'HSSC';
  const programme = await tx.programme.findFirst({ where: { boardId: board.id, name: programmeName } }) ?? await tx.programme.upsert({ where: { id: stableId(board.id + ':' + programmeName) }, update: {}, create: { id: stableId(board.id + ':' + programmeName), boardId: board.id, name: programmeName } });
  const academicClass = await tx.academicClass.findFirst({ where: { programmeId: programme.id, level } }) ?? await tx.academicClass.upsert({ where: { id: stableId(programme.id + ':' + level) }, update: {}, create: { id: stableId(programme.id + ':' + level), programmeId: programme.id, level, name: 'Class ' + ({9: 'IX', 10: 'X', 11: 'XI', 12: 'XII'}[level] || level) } });
  const subject = await tx.subject.findFirst({ where: { classId: academicClass.id, name: { equals: name, mode: 'insensitive' } } }) ?? await tx.subject.upsert({ where: { id: stableId(academicClass.id + ':' + name.toLowerCase()) }, update: {}, create: { id: stableId(academicClass.id + ':' + name.toLowerCase()), classId: academicClass.id, name } });
  return { boardId: code, classId: academicClass.id, subjectId: subject.id };
}
export async function enrichQuizMetadata<T extends { id: string; classId: string | null; subjectId: string | null }>(quizzes: T[]) {
  const [classes, subjects] = await Promise.all([
    prisma.academicClass.findMany({ where: { id: { in: quizzes.flatMap(q => q.classId ? [q.classId] : []) } } }),
    prisma.subject.findMany({ where: { id: { in: quizzes.flatMap(q => q.subjectId ? [q.subjectId] : []) } } }),
  ]);
  return quizzes.map(q => ({ ...q, classLevel: classes.find(c => c.id === q.classId)?.level ?? (/PHY-IX/.test(q.id) ? 9 : /PHY-X/.test(q.id) ? 10 : null), subject: subjects.find(s => s.id === q.subjectId)?.name ?? (/PHY-/.test(q.id) ? 'Physics' : null) }));
}
