import { ApiError } from '@/lib/api';
/** A resumable wait must never consume the job's failure retry budget. */
export class JobDeferred extends ApiError {
  constructor(public retryAt:Date,code:string,message:string){super(503,code,message);}
}
