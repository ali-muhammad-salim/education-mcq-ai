/* Explicit deployment-time migration hook. Web requests never run schema DDL. */
const {PrismaClient}=require('@prisma/client');
const {spawnSync,spawn}=require('node:child_process');
function command(args,extra={}) {
  const result=spawnSync(process.execPath,args,{stdio:'inherit',windowsHide:true,env:{...process.env,...extra}});
  if(result.status!==0)throw new Error('Release migration failed; application startup stopped.');
}
async function migrate() {
  if(process.env.RUN_DATABASE_MIGRATIONS!=='1')return;
  const db=new PrismaClient();let names;
  try {const tables=await db.$queryRaw`SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND table_type='BASE TABLE' ORDER BY table_name`;names=tables.map(t=>t.table_name);}
  finally {await db.$disconnect();}
  if(names.includes('_prisma_migrations')||names.length===0)command(['node_modules/prisma/build/index.js','migrate','deploy']);
  else if(JSON.stringify(names)===JSON.stringify(['User','UserSession'])&&process.env.AUTH_ONLY_BOOTSTRAP==='confirm-reviewed-backup')command(['scripts/bootstrap-auth-schema.cjs','--apply']);
  else throw new Error('Unbaselined database requires a reviewed release procedure; startup stopped without schema changes.');
  if(process.env.SYNC_BUNDLED_MATERIALS==='1')command(['node_modules/tsx/dist/cli.mjs','scripts/sync_all_analyzed_materials_to_db.ts']);
}
async function main(){
  await migrate();
  if(process.argv.includes('--migrate-only'))return;
  const port=process.env.PORT||'3000';
  if(!/^\d+$/.test(port)||Number(port)<1||Number(port)>65535)throw new Error('Invalid application port.');
  const child=spawn(process.execPath,['node_modules/next/dist/bin/next','start','-H','0.0.0.0','-p',port],{stdio:'inherit',windowsHide:true,env:process.env});
  for(const signal of ['SIGTERM','SIGINT'])process.on(signal,()=>child.kill(signal));
  child.once('error',()=>{console.error('Application startup failed.');process.exitCode=1;});
  child.once('exit',code=>{process.exitCode=code??1;});
}
module.exports={migrate};
if(require.main===module)main().catch(error=>{console.error(error.message);process.exitCode=1;});
