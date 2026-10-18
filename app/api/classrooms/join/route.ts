import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSessionUser } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    const user = await getSessionUser(req, 'STUDENT');
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { code } = body;

    if (!code) {
      return NextResponse.json({ error: 'Classroom code is required' }, { status: 400 });
    }

    const classroom = await prisma.classroom.findUnique({
      where: { code: code.trim().toUpperCase() }
    });

    if (!classroom) {
      return NextResponse.json({ error: 'Classroom with this code was not found.' }, { status: 404 });
    }

    // Check duplicate membership
    const existing = await prisma.classroomMembership.findUnique({
      where: {
        classroomId_studentId: {
          classroomId: classroom.id,
          studentId: user.id
        }
      }
    });

    if (existing) {
      return NextResponse.json({
        success: true,
        alreadyMember: true,
        message: `You are already enrolled in ${classroom.name}`,
        classroom
      });
    }

    const membership = await prisma.classroomMembership.create({
      data: {
        classroomId: classroom.id,
        studentId: user.id,
        status: 'ENROLLED'
      }
    });

    return NextResponse.json({
      success: true,
      message: `Enrolled successfully in ${classroom.name}`,
      classroom,
      membership
    });
  } catch (err: any) {
    console.error('Join classroom error:', err);
    return NextResponse.json({ error: err.message || 'Failed to join classroom' }, { status: 500 });
  }
}
