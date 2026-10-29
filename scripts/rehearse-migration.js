// Rehearse against a restored copy; the source database is read only.
const { PrismaClient } = require('@prisma/client');
const { spawnSync } = require('node:child_process');
const { randomBytes } = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const source = new URL(process.env.DATABASE_URL);
if (!['localhost', '127.0.0.1', '[::1]'].includes(source.hostname)) throw new Error('This rehearsal is limited to the local development database.');
const db = new PrismaClient();
const cloneName = 'mcqs_migration_test_' + randomBytes(5).toString('hex');
const backup = path.join('checkpoints', 'hardening-before-' + Date.now() + '.dump');
const pgEnv = { ...process.env, PGHOST: source.hostname, PGPORT: source.port || '5432', PGUSER: decodeURIComponent(source.username), PGPASSWORD: decodeURIComponent(source.password), PGDATABASE: source.pathname.slice(1) };
function run(executable, args, env) {
  const result = spawnSync(executable, args, { env, encoding: 'utf8', windowsHide: true });
  if (result.status !== 0) throw new Error(path.basename(executable) + ' failed. Source data was not modified.');
}
async function main() {
  fs.mkdirSync('checkpoints', { recursive: true });
  run(process.env.PG_DUMP || 'pg_dump', ['--format=custom', '--file', backup], pgEnv);
  await db.$executeRawUnsafe('CREATE DATABASE ' + cloneName);
  run(process.env.PG_RESTORE || 'pg_restore', ['--exit-on-error', '--no-owner', '--dbname', cloneName, backup], { ...pgEnv, PGDATABASE: cloneName });
  const target = new URL(source); target.pathname = '/' + cloneName;
  const env = { ...process.env, DATABASE_URL: target.toString() };
  const cli = ['node_modules/prisma/build/index.js', 'migrate'];
  const before = await db.quizAttempt.count();
  run(process.execPath, [...cli, 'resolve', '--applied', '202610190001_baseline'], env);
  run(process.execPath, [...cli, 'deploy'], env);
  const copy = new PrismaClient({ datasources: { db: { url: target.toString() } } });
  try {
    const after = await copy.quizAttempt.count();
    if (before !== after) throw new Error('Attempt count changed during migration.');
    const missing = await copy.quizAttempt.count({ where: { questionSnapshot: { equals: require('@prisma/client').Prisma.DbNull } } });
    if (missing) throw new Error('Some historical attempts have no snapshot.');
    console.log('Migration rehearsal passed. Preserved attempts:', after);
    console.log('Backup saved:', backup);
    console.log('Disposable rehearsal database:', cloneName);
  } finally { await copy.$disconnect(); }
}
main().catch(error => { console.error(error.message); process.exitCode = 1; }).finally(() => db.$disconnect());
