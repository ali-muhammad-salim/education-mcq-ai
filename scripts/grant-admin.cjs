/* Owner-operated access grant for an EXISTING account; never changes credentials. */
const {PrismaClient}=require('@prisma/client');
const {z}=require('zod');
async function grant(db,email){
  return db.$transaction(async tx=>{
    const rows=await tx.$queryRaw`SELECT "id" FROM "User" WHERE "email"=${email} FOR UPDATE`;
    if(!rows.length)throw new Error('Register the owner account first; no account was created.');
    const user=await tx.user.findUniqueOrThrow({where:{id:rows[0].id}});
    if(user.status!=='ACTIVE')throw new Error('This account is not active. Use the separate reviewed recovery/bootstrap procedure.');
    await tx.user.update({where:{id:user.id},data:{role:'ADMIN'}});
    await tx.userSession.deleteMany({where:{userId:user.id}});
    await tx.auditLog.create({data:{userId:user.id,action:'OWNER_ADMIN_GRANTED',resource:'User',resourceId:user.id,details:{previousRole:user.role,method:'explicit-server-owner-grant'}}});
  });
}
async function main(){
  if(process.env.CONFIRM_ADMIN_GRANT!=='existing-owner-account')throw new Error('An explicit owner-approved account is required.');
  const email=z.string().email().max(254).parse(process.env.ADMIN_ACCOUNT_EMAIL).trim().toLowerCase();
  const db=new PrismaClient();try{await grant(db,email);console.log('Existing owner account granted administrator access. Credentials unchanged; sign in again.');}finally{await db.$disconnect();}
}
module.exports={grant};
if(require.main===module)main().catch(error=>{console.error(error.message);process.exitCode=1;});
