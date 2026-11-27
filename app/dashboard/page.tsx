import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { getSessionUserFromToken } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export default async function DashboardRootPage() {
  const cookieStore = await cookies();
  const user = await getSessionUserFromToken(cookieStore.get('mcqs_session')?.value).catch(() => null);
  if (user?.role === 'ADMIN') redirect('/admin/users');
  if (user?.role === 'TEACHER') redirect('/dashboard/teacher');
  redirect('/dashboard/student');
}
