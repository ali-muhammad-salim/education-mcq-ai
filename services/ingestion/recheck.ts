import { z } from 'zod';
const checkpoint=z.object({checksComplete:z.literal(true),conflicts:z.array(z.string()).min(1),automaticRepairAttempts:z.number().int().nonnegative().default(0)});
/** One source-image correction pass, never an unlimited publish-until-it-passes loop. */
export function sourceRecheck(data:unknown,status:string,publish:boolean){
  if(!publish||status!=='PENDING_REVIEW')return null;
  const result=checkpoint.safeParse(data);
  return result.success&&result.data.automaticRepairAttempts<1?result.data.conflicts:null;
}
