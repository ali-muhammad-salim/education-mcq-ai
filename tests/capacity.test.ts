import { describe,it,expect } from 'vitest';
import { AssessmentCapacity } from '@/services/assessment/capacity';
describe('Assessment admission control',()=>{
  it('bounds active work and runs submissions before queued starts',async()=>{
    const gate=new AssessmentCapacity(1,2),order:string[]=[];
    let release!:()=>void;
    const first=gate.run(1,()=>new Promise<void>(resolve=>{release=resolve;}));
    const start=gate.run(1,async()=>{order.push('start');});
    const submit=gate.run(3,async()=>{order.push('submit');});
    expect(gate.snapshot()).toMatchObject({active:1,waiting:2});
    await expect(gate.run(3,async()=>{})).rejects.toMatchObject({code:'ASSESSMENT_BUSY'});
    release();await Promise.all([first,start,submit]);expect(order).toEqual(['submit','start']);
    expect(gate.snapshot()).toMatchObject({active:0,waiting:0});
  });
  it('expires waiting work without executing it and releases capacity after failure',async()=>{
    const gate=new AssessmentCapacity(1,1,10);let release!:()=>void,ran=false;
    const first=gate.run(1,()=>new Promise<void>(resolve=>{release=resolve;}));
    await expect(gate.run(2,async()=>{ran=true;})).rejects.toMatchObject({code:'ASSESSMENT_BUSY'});
    expect(ran).toBe(false);release();await first;
    await expect(gate.run(1,async()=>{throw new Error('work failed');})).rejects.toThrow('work failed');
    await expect(gate.run(1,async()=>42)).resolves.toBe(42);
  });
});
