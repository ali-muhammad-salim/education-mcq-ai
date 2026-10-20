/* Explicit one-time upgrade for the old account-only production schema.
 * Default is read-only. Back up and rehearse before --apply. Never use db push.
 */
const {PrismaClient}=require('@prisma/client');
const fs=require('node:fs');
const path=require('node:path');
const {spawnSync}=require('node:child_process');
const baseline='202610190001_baseline';
function statements(sql) {return sql.replace(/^--.*$/gm,'').split(';').map(s=>s.trim()).filter(Boolean);}
const expected={User:{id:'text',email:'text',name:'text',passwordHash:'text',role:'UserRole',status:'AccountStatus',emailVerified:'bool',googleId:'text',avatarUrl:'text',createdAt:'timestamp',updatedAt:'timestamp'},UserSession:{id:'text',userId:'text',token:'text',ipAddress:'text',userAgent:'text',expiresAt:'timestamp',createdAt:'timestamp'}};
async function check(db) {
  const tables=await db.$queryRaw`SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND table_type='BASE TABLE' ORDER BY table_name`;
  if(JSON.stringify(tables.map(t=>t.table_name))!==JSON.stringify(['User','UserSession'])) throw new Error('This upgrade accepts only an account-only database without migration history. Use the normal migration procedure for any other schema.');
  const columns=await db.$queryRaw`SELECT table_name,column_name,udt_name FROM information_schema.columns WHERE table_schema='public' ORDER BY table_name,column_name`;
  for(const [table,definition] of Object.entries(expected)) {
    const actual=columns.filter(c=>c.table_name===table);
    if(actual.length!==Object.keys(definition).length||actual.some(c=>definition[c.column_name]!==c.udt_name)) throw new Error('Account column layout differs from the reviewed legacy layout. No changes made.');
  }
  const enums=await db.$queryRaw`SELECT t.typname, array_agg(e.enumlabel ORDER BY e.enumsortorder) AS labels FROM pg_type t JOIN pg_enum e ON t.oid=e.enumtypid JOIN pg_namespace n ON n.oid=t.typnamespace WHERE n.nspname='public' GROUP BY t.typname ORDER BY t.typname`;
  const labels={AccountStatus:['ACTIVE','SUSPENDED','PENDING_VERIFICATION'],UserRole:['STUDENT','TEACHER','ADMIN']};
  if(enums.length!==2||enums.some(e=>JSON.stringify(e.labels)!==JSON.stringify(labels[e.typname]))) throw new Error('Account enums differ from the reviewed legacy layout. No changes made.');
  const vector=await db.$queryRaw`SELECT name FROM pg_available_extensions WHERE name='vector'`;
  if(!vector.length) throw new Error('Install a PostgreSQL image with pgvector for the SAME PostgreSQL major version before applying this upgrade.');
  const users=await db.$queryRaw`SELECT COUNT(*)::int AS count FROM "User"`;
  return {users:users[0].count,tables:tables.map(t=>t.table_name),vectorAvailable:true};
}
async function applyBaseline(db) {
  return db.$transaction(async tx=>{
    const before=await check(tx);
    // Block account writes while bootstrapping, without deleting or renaming them.
    await tx.$executeRawUnsafe('LOCK TABLE "User", "UserSession" IN ACCESS EXCLUSIVE MODE');
    const constraints=await tx.$queryRaw`SELECT conname FROM pg_constraint WHERE conrelid='"UserSession"'::regclass`;
    const sql=fs.readFileSync(path.join('prisma','migrations',baseline,'migration.sql'),'utf8');
    for(let statement of statements(sql)) {
      if(/^CREATE TYPE "(?:UserRole|AccountStatus)"/.test(statement)||/^CREATE TABLE "(?:User|UserSession)"\s/.test(statement)) continue;
      if(/^CREATE (?:UNIQUE )?INDEX .* ON "(?:User|UserSession)"/.test(statement)) statement=statement.replace(/^(CREATE (?:UNIQUE )?INDEX )/,'$1IF NOT EXISTS ');
      if(/^ALTER TABLE "UserSession" ADD CONSTRAINT "UserSession_userId_fkey"/.test(statement)&&constraints.some(c=>c.conname==='UserSession_userId_fkey')) continue;
      await tx.$executeRawUnsafe(statement);
    }
    const after=await tx.$queryRaw`SELECT COUNT(*)::int AS count FROM "User"`;
    if(after[0].count!==before.users) throw new Error('Account preservation check failed.');
    return before;
  },{timeout:120000,maxWait:10000});
}
async function main() {
  const db=new PrismaClient();
  try {
    console.log(JSON.stringify(await check(db)));
    if(!process.argv.includes('--apply')) {console.log('Read-only check passed. No schema changes made.');return;}
    if(process.env.AUTH_ONLY_BOOTSTRAP!=='confirm-reviewed-backup') throw new Error('A reviewed backup and rehearsal are required. Set AUTH_ONLY_BOOTSTRAP=confirm-reviewed-backup only for the explicit release.');
    await applyBaseline(db);
    const cli=process.env.PRISMA_CLI||path.resolve('node_modules/prisma/build/index.js');
    for(const args of [['migrate','resolve','--applied',baseline],['migrate','deploy']]) {
      const result=spawnSync(process.execPath,[cli,...args],{env:process.env,stdio:'inherit',windowsHide:true});
      if(result.status!==0) throw new Error('Migration command failed. Preserve the backup and inspect migration state before retrying.');
    }
    console.log('Account-only upgrade completed. Existing account rows preserved; legacy sessions are revoked by hardening.');
  }finally{await db.$disconnect();}
}
module.exports={statements,check,applyBaseline};
if(require.main===module)main().catch(error=>{console.error(error.message);process.exitCode=1;});
