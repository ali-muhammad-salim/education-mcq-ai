import {describe,expect,it} from 'vitest';
import {sourceRecheck} from '@/services/ingestion/recheck';
describe('Bounded literal-source recheck',()=>{
  const flagged={checksComplete:true,conflicts:['Missing printed header']};
  it('rechecks only complete flagged pending pages selected for publication',()=>{
    expect(sourceRecheck(flagged,'PENDING_REVIEW',true)).toEqual(flagged.conflicts);
    expect(sourceRecheck(flagged,'APPROVED',true)).toBeNull();
    expect(sourceRecheck(flagged,'REJECTED',true)).toBeNull();
    expect(sourceRecheck(flagged,'PENDING_REVIEW',false)).toBeNull();
    expect(sourceRecheck({...flagged,checksComplete:false},'PENDING_REVIEW',true)).toBeNull();
    expect(sourceRecheck({...flagged,conflicts:[]},'PENDING_REVIEW',true)).toBeNull();
  });
  it('stops after one correction pass and rejects invalid checkpoints',()=>{
    expect(sourceRecheck({...flagged,automaticRepairAttempts:1},'PENDING_REVIEW',true)).toBeNull();
    expect(sourceRecheck({...flagged,automaticRepairAttempts:-1},'PENDING_REVIEW',true)).toBeNull();
    expect(sourceRecheck(null,'PENDING_REVIEW',true)).toBeNull();
  });
});
