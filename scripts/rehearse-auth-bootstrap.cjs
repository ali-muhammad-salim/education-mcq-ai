const {PrismaClient}=require('@prisma/client');
const {randomBytes}=require('node:crypto');
const {spawnSync}=require('node:child_process');
const fs=require('node:fs');
const assert=require('node:assert/strict');
const {statements}=require('./bootstrap-auth-schema.cjs');
const source=process.env.TEST_DATABASE_URL;
if(!source||!new URL(source).pathname.includes('_test'))throw new Error('Use a dedicated TEST_DATABASE_URL.');
const name='mcqs_auth_test_'+randomBytes(6).toString('hex'), target=new URL(source);target.pathname='/'+name;
const admin=new PrismaClient({datasources:{db:{url:source}}});let copy;
async function main(){
  await admin.$executeRawUnsafe('CREATE DATABASE '+name);
  copy=new PrismaClient({datasources:{db:{url:target.toString()}}});
  const sql=statements(fs.readFileSync('prisma/migrations/202610190001_baseline/migration.sql','utf8'));
  for(const statement of sql) if(/^CREATE TYPE "(?:UserRole|AccountStatus)"/.test(statement)||/^CREATE TABLE "(?:User|UserSession)"\s/.test(statement)||/^CREATE (?:UNIQUE )?INDEX .* ON "(?:User|UserSession)"/.test(statement)||/^ALTER TABLE "UserSession"/.test(statement)) await copy.$executeRawUnsafe(statement);
  await copy.user.create({data:{id:'bootstrap-test-user',email:'bootstrap-rehearsal@example.test',name:'Preserved account',passwordHash:'legacy-test-hash',role:'TEACHER',sessions:{create:{token:'legacy-disposable-session',expiresAt:new Date(Date.now()+60000)}}}});
  const result=spawnSync(process.execPath,['scripts/release-start.cjs','--migrate-only'],{windowsHide:true,encoding:'utf8',env:{...process.env,DATABASE_URL:target.toString(),RUN_DATABASE_MIGRATIONS:'1',AUTH_ONLY_BOOTSTRAP:'confirm-reviewed-backup'}});
  if(result.status!==0){console.error(result.stdout);throw new Error(result.stderr||'Bootstrap rehearsal failed.');}
  const account=await copy.user.findUniqueOrThrow({where:{id:'bootstrap-test-user'}});
  assert.equal(account.passwordHash,'legacy-test-hash');assert.equal(account.role,'TEACHER');assert.equal(await copy.userSession.count(),0);
  const migrations=await copy.$queryRaw`SELECT COUNT(*)::int AS count FROM "_prisma_migrations" WHERE finished_at IS NOT NULL`;
  assert.equal(migrations[0].count,2);await copy.quizAttempt.count();await copy.durableJob.count();
  const report={date:new Date().toISOString(),scenario:'Account-only schema bootstrap matching the observed production table layout.',preservedAccounts:true,revokedLegacySessions:true,appliedMigrations:migrations[0].count,assessmentTablesAvailable:true,postgresMajor:'16 (local rehearsal; production PostgreSQL 18 still requires its own backup/restore check)'};
  fs.writeFileSync('docs/verification/auth-bootstrap.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));
}
main().catch(error=>{console.error(error.message);process.exitCode=1;}).finally(async()=>{if(copy)await copy.$disconnect();await admin.$disconnect();});
