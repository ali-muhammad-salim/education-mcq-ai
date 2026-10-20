/* Configuration inspection only: never prints values or contacts providers. */
const fs = require('node:fs');
function inspect(env) {
  const present = key => Boolean(env[key]?.trim()) && !/^(your[-_]|placeholder|changeme|generate[-_])/i.test(env[key].trim());
  const groups = [];
  function group(name, keys, notes = []) { const missing=keys.filter(k=>!present(k)); groups.push({name,status:missing.length?'UNAVAILABLE':'CONFIGURED',missing,notes}); }
  group('Database',['DATABASE_URL'],['Connection, schema drift, backups and migrations must be checked separately.']);
  const originKey=present('APP_URL')?'APP_URL':'NEXT_PUBLIC_APP_URL';
  group('Canonical website address',[originKey]);
  if(present(originKey)) {
    const item=groups.at(-1);
    try {const url=new URL(env[originKey]); if(!['http:','https:'].includes(url.protocol)||url.username||url.password||url.search||url.hash||url.pathname!=='/') throw new Error(); if(env.NODE_ENV==='production'&&url.protocol!=='https:'&&!['localhost','127.0.0.1','[::1]'].includes(url.hostname)) throw new Error();}
    catch {item.status='INVALID';item.notes.push('Use a canonical HTTP(S) origin; public production origins require HTTPS.');}
  }
  group('Google sign-in',['GOOGLE_CLIENT_ID','GOOGLE_CLIENT_SECRET'],['Provider callback must match /api/auth/google/callback. Live browser authorization is a separate check.']);
  group('Email delivery',['RESEND_API_KEY','EMAIL_FROM'],['Verify the sender domain and actual delivery; credentials alone do not prove delivery.']);
  const r2=['R2_ACCOUNT_ID','R2_ACCESS_KEY_ID','R2_SECRET_ACCESS_KEY','R2_BUCKET_NAME'];
  const hasR2=r2.some(present);
  if(hasR2) group('Object storage',r2,['Configured credentials require an upload/read check. Partial R2 configuration must not silently select another adapter.']);
  else group('Persistent file storage',['ASSET_ROOT'],['Confirm the configured path is shared by web and workers and persists across releases. Development-only storage is not a production guarantee.']);
  const keys=present('GEMINI_API_KEYS')?'GEMINI_API_KEYS':'GEMINI_API_KEY', models=present('GEMINI_MODELS')?'GEMINI_MODELS':'GEMINI_MODEL';
  group('AI generation',[keys,models],['Model access, linked syllabus/textbook evidence, worker execution and educator review require separate checks.']);
  group('Internal Python API',['INTERNAL_API_TOKEN','INTERNAL_SERVICE_USER_ID'],['Verify the configured identity is an active administrator.']);
  if(present('INTERNAL_API_TOKEN')&&env.INTERNAL_API_TOKEN.length<32) {const item=groups.at(-1);item.status='INVALID';item.notes.push('Internal token must contain at least 32 characters.');}
  groups.push({name:'Deadline worker',status:'REQUIRES_RUNTIME_CHECK',missing:[],notes:['Run a separate worker with WORKER_KINDS=EXAM_FINALIZE; inspect overdue queue age and finalization.']});
  return {date:new Date().toISOString(),mode:'Configuration presence only; no secret values or external requests.',groups};
}
module.exports={inspect};
if(require.main===module) {
  const report=inspect(process.env);
  for(const group of report.groups) console.log(group.name+': '+group.status+(group.missing.length?' (missing '+group.missing.join(', ')+')':''));
  if(process.env.READINESS_REPORT) { fs.writeFileSync(process.env.READINESS_REPORT,JSON.stringify(report,null,2)+'\n'); console.log('Saved redacted configuration report.'); }
  if(process.env.READINESS_STRICT==='1'&&report.groups.some(g=>['UNAVAILABLE','INVALID'].includes(g.status))) process.exitCode=1;
}
