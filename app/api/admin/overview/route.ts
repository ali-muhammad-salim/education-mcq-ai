import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireUser } from '@/lib/security';
import { apiError } from '@/lib/api';

const WEEK_MS = 7 * 86400000;

function byKey<T extends Record<string, unknown>>(rows: (T & { _count: { _all: number } })[], key: keyof T) {
  return Object.fromEntries(rows.map(row => [String(row[key]), row._count._all]));
}

export async function GET(req: NextRequest) {
  try {
    await requireUser(req, ['ADMIN']);
    const since = new Date(Date.now() - WEEK_MS);
    const [userRoles, activeUsers, newUsers, liveSessions, classroomStatus, quizStatus, attempts, inProgress, submittedWeek, recentRequests, pastPapers, learningOutcomes, sources, sourceReviews] = await Promise.all([
      prisma.user.groupBy({ by: ['role'], _count: { _all: true } }),
      prisma.user.count({ where: { status: 'ACTIVE' } }),
      prisma.user.count({ where: { createdAt: { gte: since } } }),
      prisma.userSession.count({ where: { expiresAt: { gt: new Date() } } }),
      prisma.classroom.groupBy({ by: ['status'], _count: { _all: true } }),
      prisma.quiz.groupBy({ by: ['status'], _count: { _all: true } }),
      prisma.quizAttempt.count(),
      prisma.quizAttempt.count({ where: { submittedAt: null } }),
      prisma.quizAttempt.count({ where: { submittedAt: { gte: since } } }),
      prisma.auditLog.findMany({ where: { action: { in: ['TEACHER_ACCESS_REQUESTED', 'TEACHER_ACCESS_REJECTED'] } }, orderBy: { createdAt: 'desc' }, take: 300, select: { userId: true, action: true } }),
      prisma.pastPaper.count(),
      prisma.sLO.count(),
      prisma.knowledgeDocument.count(),
      prisma.knowledgeArtifact.groupBy({ by: ['status'], _count: { _all: true } })
    ]);

    const latest = new Map<string, string>();
    for (const entry of recentRequests) if (entry.userId && !latest.has(entry.userId)) latest.set(entry.userId, entry.action);
    const pendingIds = [...latest].filter(([, action]) => action === 'TEACHER_ACCESS_REQUESTED').map(([userId]) => userId);
    const pendingTeacherRequests = pendingIds.length
      ? await prisma.user.count({ where: { id: { in: pendingIds }, role: 'STUDENT', status: 'ACTIVE' } })
      : 0;

    return NextResponse.json({
      success: true,
      generatedAt: new Date().toISOString(),
      accounts: {
        total: userRoles.reduce((sum, row) => sum + row._count._all, 0),
        active: activeUsers,
        newLast7Days: newUsers,
        liveSessions,
        byRole: byKey(userRoles, 'role')
      },
      classrooms: { total: classroomStatus.reduce((sum, row) => sum + row._count._all, 0), byStatus: byKey(classroomStatus, 'status') },
      assessments: { total: quizStatus.reduce((sum, row) => sum + row._count._all, 0), byStatus: byKey(quizStatus, 'status') },
      attempts: { total: attempts, inProgress, submittedLast7Days: submittedWeek },
      requests: { pendingTeacherRequests },
      content: {
        pastPapers,
        learningOutcomes,
        knowledgeSources: sources,
        sourceReviews: byKey(sourceReviews, 'status')
      }
    }, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error) { return apiError(error); }
}
