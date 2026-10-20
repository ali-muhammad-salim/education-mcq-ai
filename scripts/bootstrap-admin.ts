import prisma from '../lib/prisma';
import { hashPassword } from '../lib/passwords';
import { z } from 'zod';
async function main() {
  const email = z.string().email().parse(process.env.BOOTSTRAP_ADMIN_EMAIL).toLowerCase();
  const password = z.string().min(16).max(256).parse(process.env.BOOTSTRAP_ADMIN_PASSWORD);
  const passwordHash = await hashPassword(password);
  const user = await prisma.user.upsert({ where: { email }, create: { email, name: 'Administrator', role: 'ADMIN', status: 'ACTIVE', emailVerified: true, passwordHash }, update: { role: 'ADMIN', status: 'ACTIVE', emailVerified: true, passwordHash } });
  await prisma.userSession.deleteMany({ where: { userId: user.id } });
  console.log('Administrator provisioned. Existing sessions revoked.');
}
main().catch(() => { console.error('Admin provisioning failed. Verify the database and bootstrap environment variables.'); process.exitCode = 1; }).finally(() => prisma.$disconnect());
