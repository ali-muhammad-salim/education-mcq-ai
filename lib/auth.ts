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

let tablesInitialized = false;

// Ensure database tables exist even if prisma db push hasn't run yet
export async function ensureAuthTables() {
  if (tablesInitialized) return;

  // 1. Enums
  try {
    await prisma.$executeRawUnsafe(`
      DO $$ BEGIN
        CREATE TYPE "UserRole" AS ENUM ('STUDENT', 'TEACHER', 'ADMIN');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);
  } catch (e) {
    // Enum might already exist
  }

  try {
    await prisma.$executeRawUnsafe(`
      DO $$ BEGIN
        CREATE TYPE "AccountStatus" AS ENUM ('ACTIVE', 'SUSPENDED', 'PENDING_VERIFICATION');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);
  } catch (e) {
    // Enum might already exist
  }

  // 2. User table
  try {
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "User" (
        "id" TEXT NOT NULL,
        "email" TEXT NOT NULL,
        "name" TEXT NOT NULL,
        "passwordHash" TEXT,
        "role" "UserRole" NOT NULL DEFAULT 'STUDENT',
        "status" "AccountStatus" NOT NULL DEFAULT 'ACTIVE',
        "emailVerified" BOOLEAN NOT NULL DEFAULT false,
        "googleId" TEXT,
        "avatarUrl" TEXT,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "User_pkey" PRIMARY KEY ("id")
      );
    `);
  } catch (e) {
    console.warn('User table creation notice:', e);
  }

  // 3. User indexes
  try {
    await prisma.$executeRawUnsafe(`CREATE UNIQUE INDEX IF NOT EXISTS "User_email_key" ON "User"("email");`);
  } catch {}

  try {
    await prisma.$executeRawUnsafe(`CREATE UNIQUE INDEX IF NOT EXISTS "User_googleId_key" ON "User"("googleId");`);
  } catch {}

  // 4. UserSession table
  try {
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "UserSession" (
        "id" TEXT NOT NULL,
        "userId" TEXT NOT NULL,
        "token" TEXT NOT NULL,
        "expiresAt" TIMESTAMP(3) NOT NULL,
        "ipAddress" TEXT,
        "userAgent" TEXT,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "UserSession_pkey" PRIMARY KEY ("id")
      );
    `);
  } catch (e) {
    console.warn('UserSession table creation notice:', e);
  }

  try {
    await prisma.$executeRawUnsafe(`CREATE UNIQUE INDEX IF NOT EXISTS "UserSession_token_key" ON "UserSession"("token");`);
  } catch {}

  tablesInitialized = true;
}

// Ensure default verified admin and system accounts exist
export async function ensureDemoUsers() {
  await ensureAuthTables();
  try {
    const adminPassword = 'AdminPass123!';
    const defaultHash = hashPassword(adminPassword);

    // 1. Primary Default Admin: admin@riselearner.com
    const adminEmail = 'admin@riselearner.com';
    const admin = await prisma.user.findUnique({ where: { email: adminEmail } });
    if (!admin) {
      await prisma.user.create({
        data: {
          email: adminEmail,
          name: 'Rise Learner Administrator',
          role: 'ADMIN',
          passwordHash: defaultHash,
          emailVerified: true,
          status: 'ACTIVE'
        }
      });
    } else {
      await prisma.user.update({
        where: { id: admin.id },
        data: {
          role: 'ADMIN',
          status: 'ACTIVE',
          ...(!admin.passwordHash ? { passwordHash: defaultHash } : {})
        }
      });
    }

    // 2. Secondary Official Support Admin: support@riselearner.com
    const supportEmail = 'support@riselearner.com';
    const support = await prisma.user.findUnique({ where: { email: supportEmail } });
    if (!support) {
      await prisma.user.create({
        data: {
          email: supportEmail,
          name: 'Support & Admin Desk',
          role: 'ADMIN',
          passwordHash: defaultHash,
          emailVerified: true,
          status: 'ACTIVE'
        }
      });
    } else {
      await prisma.user.update({
        where: { id: support.id },
        data: {
          role: 'ADMIN',
          status: 'ACTIVE',
          ...(!support.passwordHash ? { passwordHash: defaultHash } : {})
        }
      });
    }

    // 3. Fallback teacher / student for demonstration if needed
    const teacherEmail = 'teacher@akueb.edu.pk';
    const studentEmail = 'student@akueb.edu.pk';

    const teacher = await prisma.user.findUnique({ where: { email: teacherEmail } });
    if (!teacher) {
      await prisma.user.create({
        data: {
          email: teacherEmail,
          name: 'Prof. Tariq Siddiqui',
          role: 'TEACHER',
          passwordHash: hashPassword('TeacherPass123!'),
          emailVerified: true,
          status: 'ACTIVE'
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
          emailVerified: true,
          status: 'ACTIVE'
        }
      });
    }
  } catch (err) {
    console.error('Error ensuring default users:', err);
  }
}

// Helper to get authenticated user from NextRequest or fallback
export async function getSessionUser(req: any, fallbackRole?: 'STUDENT' | 'TEACHER') {
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

  // Only fallback if explicit role is requested (for backward compatibility in quiz taking)
  if (fallbackRole) {
    const fallbackEmail = fallbackRole === 'TEACHER' ? 'teacher@akueb.edu.pk' : 'student@akueb.edu.pk';
    return await prisma.user.findUnique({ where: { email: fallbackEmail } });
  }

  return null;
}

