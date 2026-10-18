import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSessionUser } from '@/lib/auth';

// GET /api/classrooms - List teacher's classrooms
export async function GET(req: NextRequest) {
  try {
    const user = await getSessionUser(req, 'TEACHER');
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const classrooms = await prisma.classroom.findMany({
      where: user.role === 'TEACHER' ? { teacherId: user.id } : {},
      include: {
        _count: { select: { memberships: true, quizzes: true } }
      },
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json({ success: true, classrooms });
  } catch (err: any) {
    console.error('List classrooms error:', err);
    return NextResponse.json({ error: err.message || 'Failed to list classrooms' }, { status: 500 });
  }
}

// POST /api/classrooms - Create new teacher classroom
export async function POST(req: NextRequest) {
  try {
    const user = await getSessionUser(req, 'TEACHER');
    if (!user || (user.role !== 'TEACHER' && user.role !== 'ADMIN')) {
      return NextResponse.json({ error: 'Unauthorized: Teacher role required' }, { status: 403 });
    }

    const body = await req.json();
    const {
      name,
      description,
      boardId = 'AKU-EB',
      gradeLevel = 9,
      academicYear = '2025-2026'
    } = body;

    if (!name) {
      return NextResponse.json({ error: 'Classroom name is required' }, { status: 400 });
    }

    // Generate random 6-character classroom code
    const code = Math.random().toString(36).substring(2, 8).toUpperCase();

    const classroom = await prisma.classroom.create({
      data: {
        name,
        description,
        boardId,
        classLevel: Number(gradeLevel) || 9,
        session: academicYear,
        code,
        teacherId: user.id
      }
    });


    return NextResponse.json({ success: true, classroom });
  } catch (err: any) {
    console.error('Create classroom error:', err);
    return NextResponse.json({ error: err.message || 'Failed to create classroom' }, { status: 500 });
  }
}
