import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export default async function DashboardRootPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get('mcqs_session')?.value || cookieStore.get('auth_token')?.value;

  if (token) {
    try {
      const session = await prisma.userSession.findUnique({
        where: { token },
        include: { user: true }
      });

      if (session && session.expiresAt > new Date()) {
        if (session.user.role === 'TEACHER' || session.user.role === 'ADMIN') {
          redirect('/dashboard/teacher');
        }
        redirect('/dashboard/student');
      }
    } catch (e) {
      // In case session table query fails, fallback to student dashboard
    }
  }

  // Default to student assessment dashboard
  redirect('/dashboard/student');
}
