import { snapshotSchema, FrozenQuestion } from '@/services/assessment/scoring';
import { Prisma } from '@prisma/client';
export function topicOf(q: FrozenQuestion) {
  return q.content.topicName?.trim() || q.content.sloCode?.trim() || 'Topic not mapped';
}
export type InsightAttempt = { id:string; questionSnapshot: Prisma.JsonValue; answers:{questionId:string;score:number|null}[] };
export function summarizeTopics(attempts: InsightAttempt[]) {
  const groups = new Map<string,{topic:string;earned:number;possible:number;questions:number;missed:number}>();
  let unmapped=0;
  for(const attempt of attempts){
    const parsed=snapshotSchema.safeParse(attempt.questionSnapshot); if(!parsed.success)continue;
    const answers=new Map(attempt.answers.map(a=>[a.questionId,a]));
    for(const q of parsed.data){
      const a=answers.get(q.id); if(!a || a.score===null)continue;
      const topic=topicOf(q); if(topic==='Topic not mapped')unmapped++;
      const group=groups.get(topic)||{topic,earned:0,possible:0,questions:0,missed:0};
      group.earned+=a.score;group.possible+=q.marks;group.questions++;if(a.score<q.marks)group.missed++;
      groups.set(topic,group);
    }
  }
  return {topics:[...groups.values()].map(g=>({...g,percent:g.possible?Math.max(0,Math.round(g.earned/g.possible*100)):0})).sort((a,b)=>a.percent-b.percent),unmapped};
}
export function revisionQuestions(attempts:InsightAttempt[],topic?:string,count=10){
  const selected=new Map<string,FrozenQuestion>();
  for(const attempt of attempts){
    const parsed=snapshotSchema.safeParse(attempt.questionSnapshot);if(!parsed.success)continue;
    const answers=new Map(attempt.answers.map(a=>[a.questionId,a]));
    for(const q of parsed.data){const answer=answers.get(q.id);
      if(answer?.score===null||answer?.score===undefined||answer.score>=q.marks||(topic&&topicOf(q)!==topic))continue;
      const key=JSON.stringify([q.content.stemText,q.content.options]);if(!selected.has(key))selected.set(key,q);
      if(selected.size>=count)return [...selected.values()];
    }
  }
  return [...selected.values()];
}
