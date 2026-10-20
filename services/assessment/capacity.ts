import { ApiError, apiError } from '@/lib/api';
import { NextResponse } from 'next/server';
type Waiting = { priority:number; start:()=>void; reject:(error:Error)=>void; timer:ReturnType<typeof setTimeout> };
// A process-local bound protects the application pool; proxy limits are still
// needed across replicas. Waiting work has no open database transaction.
export class AssessmentCapacity {
  private active=0;
  private waiting:Waiting[]=[];
  constructor(private maximum=16, private queueMaximum=256, private waitMs=8000) {}
  snapshot() {return {active:this.active,waiting:this.waiting.length,maximum:this.maximum,queueMaximum:this.queueMaximum};}
  async run<T>(priority:number,work:()=>Promise<T>):Promise<T> {
    if(this.active<this.maximum && !this.waiting.length) return this.execute(work);
    if(this.waiting.length>=this.queueMaximum) throw new ApiError(503,'ASSESSMENT_BUSY','The assessment service is busy. Your saved work is safe; retry shortly.');
    return new Promise<T>((resolve,reject)=>{
      const item:Waiting={priority,reject,start:()=>{clearTimeout(item.timer);void this.execute(work).then(resolve,reject);},timer:setTimeout(()=>{
        this.waiting=this.waiting.filter(w=>w!==item);
        reject(new ApiError(503,'ASSESSMENT_BUSY','The assessment service is busy. Retry shortly.'));
      },this.waitMs)};
      this.waiting.push(item);
      this.waiting.sort((a,b)=>b.priority-a.priority);
    });
  }
  private async execute<T>(work:()=>Promise<T>):Promise<T> {
    this.active++;
    try {return await work();}
    finally {this.active--;while(this.active<this.maximum && this.waiting.length) this.waiting.shift()!.start();}
  }
}
function bounded(value:string|undefined,fallback:number,min:number,max:number) {const n=Number(value);return Number.isInteger(n)&&n>=min&&n<=max?n:fallback;}
const shared=globalThis as typeof globalThis & {assessmentCapacity?:AssessmentCapacity};
export const assessmentCapacity = shared.assessmentCapacity ??= new AssessmentCapacity(bounded(process.env.ASSESSMENT_MAX_IN_FLIGHT,16,1,64),bounded(process.env.ASSESSMENT_MAX_WAITING,256,0,1024));
export async function withAssessmentCapacity(priority:number,work:()=>Promise<NextResponse>) {
  try{return await assessmentCapacity.run(priority,work);}
  catch(error){const response=apiError(error);if(error instanceof ApiError && error.code==='ASSESSMENT_BUSY')response.headers.set('Retry-After','3');return response;}
}
