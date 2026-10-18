import prisma from '@/lib/prisma';
import crypto from 'crypto';

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: 'STUDENT' | 'TEACHER' | 'ADMIN';
  avatarUrl?: string | null;
}

// Simple secure password hashing using Node crypto PBKDF2
export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, storedHash: string): boolean {
  try {
    const [salt, originalHash] = storedHash.split(':');
    if (!salt || !originalHash) return false;
    const hash = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
    return hash === originalHash;
  } catch {
    return false;
  }
}

// Generate random session token
export function generateToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

// Ensure default verified demo accounts exist for immediate verification
export async function ensureDemoUsers() {
  try {
    const teacherEmail = 'teacher@akueb.edu.pk';
    const studentEmail = 'student@akueb.edu.pk';
    const adminEmail = 'admin@akueb.edu.pk';

    const teacher = await prisma.user.findUnique({ where: { email: teacherEmail } });
    if (!teacher) {
      await prisma.user.create({
        data: {
          email: teacherEmail,
          name: 'Prof. Tariq Siddiqui',
          role: 'TEACHER',
          passwordHash: hashPassword('TeacherPass123!'),
          emailVerified: true
        }
      });
    }

    const student = await prisma.user.findUnique({ where: { email: studentEmail } });
    if (!student) {
      await prisma.user.create({
        data: {
          email: studentEmail,
          name: 'Ali Raza (Class IX)',
          role: 'STUDENT',
          passwordHash: hashPassword('StudentPass123!'),
          emailVerified: true
        }
      });
    }

    const admin = await prisma.user.findUnique({ where: { email: adminEmail } });
    if (!admin) {
      await prisma.user.create({
        data: {
          email: adminEmail,
          name: 'System Administrator',
          role: 'ADMIN',
          passwordHash: hashPassword('AdminPass123!'),
          emailVerified: true
        }
      });
    }
  } catch (err) {
    console.error('Error ensuring demo users:', err);
  }
}

// Helper to get authenticated user from NextRequest or fallback
export async function getSessionUser(req: any, fallbackRole: 'STUDENT' | 'TEACHER' = 'STUDENT') {
  await ensureDemoUsers();
  const token = req.cookies?.get?.('mcqs_session')?.value || req.headers?.get?.('authorization')?.replace('Bearer ', '');
  if (token) {
    const session = await prisma.userSession.findUnique({
      where: { token },
      include: { user: true }
    });
    if (session && session.expiresAt > new Date()) {
      return session.user;
    }
  }

  // Fallback to demo user if not logged in
  const demoEmail = fallbackRole === 'TEACHER' ? 'teacher@akueb.edu.pk' : 'student@akueb.edu.pk';
  return await prisma.user.findUnique({ where: { email: demoEmail } });
}

