import { describe,it,expect } from 'vitest';
import { answerFeedback,normalizeQuestion } from '@/services/assessment/scoring';
const question=(data:Record<string,unknown>)=>({id:'q',orderIndex:1,marks:2,content:normalizeQuestion(data)});
describe('Released answer feedback',()=>{
  it('identifies the wrong selection and correct answer without inventing an explanation',()=>{
    const q=question({stemText:'Unit of force?',options:[{id:'a',text:'Newton',isCorrect:true},{id:'b',text:'Joule',isCorrect:false}]});
    expect(answerFeedback(q,{selectedOptionId:'b'},0)).toContain('“Joule” does not match the correct answer “Newton”');
    expect(answerFeedback(q,{},0)).toContain('No answer');
    expect(answerFeedback(q,{selectedOptionId:'a'},2)).toContain('matches');
  });
  it('explains missing multiple-choice selections and numerical tolerance',()=>{
    const q=question({questionType:'MCQ_MULTIPLE',stemText:'Choose',options:[{id:'a',text:'First',isCorrect:true},{id:'b',text:'Second',isCorrect:true},{id:'c',text:'Third',isCorrect:false}]});
    const feedback=answerFeedback(q,{selectedOptionIds:['a','c']},0);expect(feedback).toContain('Incorrect choices selected: Third');expect(feedback).toContain('Correct choices missed: Second');
    const n=question({questionType:'NUMERICAL',stemText:'Value?',correctAnswerText:'10',numericalTolerance:.1,unit:'m'});
    expect(answerFeedback(n,{numericAnswer:'12'},0)).toContain('10 ± 0.1 m');
  });
  it('distinguishes unmarked written responses from incorrect answers',()=>{
    const q=question({questionType:'SHORT_ANSWER',stemText:'Explain'});expect(answerFeedback(q,{textAnswer:'Response'},null)).toContain('awaiting teacher marking');
  });
});
