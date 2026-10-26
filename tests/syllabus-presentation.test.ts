import { describe, expect, it } from 'vitest';
import physicsIX from '@/data/physics/ssc1_exact_syllabus.json';
import physicsX from '@/data/physics/ssc2_exact_syllabus.json';
import { filterSyllabus, syllabusLevel, syllabusDisplayText } from '@/lib/syllabusPresentation';
type Outcome={code:string;description:string;cognitiveLevel:string};
const outcomes=(units:{subtopics:{slos:Outcome[]}[]}[])=>units.flatMap(unit=>unit.subtopics.flatMap(topic=>topic.slos));
describe('Full digital syllabus presentation',()=>{
  it('restores printed scientific exponents without changing surrounding wording',()=>{
    expect(syllabusDisplayText('approximately 3 × 108 m/s;')).toBe('approximately $3 \\times 10^{8}\\,\\mathrm{m/s}$;');
    expect(syllabusDisplayText('K.E = ½ mv2')).toBe('K.E = $\\frac{1}{2}mv^{2}$');
    expect(syllabusDisplayText('formation of NADPH2;')).toBe('formation of NADPH₂;');
  });
  it('retains the printed analysis, creation and formative categories',()=>{
    expect(['An','C','FA'].map(syllabusLevel)).toEqual(['An','C','FA']);
    const sample=[{unitNumber:16,name:'Inheritance',subtopics:[{name:'DNA',slos:[{code:'16.2.4',description:'First printed outcome',cognitiveLevel:'E'},{code:'16.2.4',description:'Second printed outcome',cognitiveLevel:'U'}]}]}];
    expect(outcomes(filterSyllabus(sample,'16.2.4','all','all'))).toHaveLength(2);
  });
  it('keeps every stored outcome and its exact wording in the unfiltered view',()=>{
    for(const source of [physicsIX,physicsX]) {
      const original=outcomes(source), displayed=outcomes(filterSyllabus(source,'','all','all'));
      expect(displayed).toHaveLength(original.length);
      expect(Object.fromEntries(displayed.map(s=>[s.code,s.description]))).toEqual(Object.fromEntries(original.map(s=>[s.code,s.description])));
    }
  });
  it('filters real full-word cognitive levels with the R/U/A controls',()=>{
    for(const level of ['R','U','A']) {
      const displayed=outcomes(filterSyllabus(physicsIX,'',level,'all'));
      expect(displayed.length).toBeGreaterThan(0);
      expect(displayed.every(s=>syllabusLevel(s.cognitiveLevel)===level)).toBe(true);
    }
  });
  it('finds an exact SLO and sorts numbered outcomes in natural document order',()=>{
    expect(outcomes(filterSyllabus(physicsIX,'1.2.2','all','all')).map(s=>s.code)).toEqual(['1.2.2']);
    const codes=outcomes(filterSyllabus(physicsIX,'','all',8)).map(s=>s.code);
    expect(codes.indexOf('8.2.10')).toBeGreaterThan(codes.indexOf('8.2.9'));
  });
});
