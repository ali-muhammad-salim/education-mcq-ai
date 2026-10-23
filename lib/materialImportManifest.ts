import { z } from 'zod';
import { materialResourceTypes } from './materialTypes';
export const importEntrySchema=z.object({relativePath:z.string().min(1).max(1000),sha256:z.string().regex(/^[a-f0-9]{64}$/),subject:z.string().min(1).max(160),classLevel:z.enum(['Class IX','Class X','Class XI','Class XII']),classLevels:z.array(z.number().int().min(9).max(12)).min(1).max(4),resourceType:z.enum(materialResourceTypes),title:z.string().min(1).max(240),examYear:z.string().regex(/^\d{4}$/).optional(),paperComponent:z.string().max(80).optional(),syllabusEffectiveFrom:z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),syllabusSourceSha256:z.string().regex(/^[a-f0-9]{64}$/).optional(),studyKinds:z.array(z.enum(['CHAPTER_NOTES','NUMERICAL_GUIDE','FORMULA_SHEET','CHEAT_SHEET','FLASHCARDS','PRACTICE_SET','CHAPTER_READER'])).optional(),publishAfterReview:z.boolean(),studyResources:z.boolean().default(false),note:z.string().max(2000).optional()});
export const materialImportManifest=z.object({version:z.literal(1),board:z.literal('AKU-EB'),entries:z.array(importEntrySchema).min(1).max(200)}).superRefine((value,ctx)=>{
  const hashes=new Set<string>();for(const [index,item]of value.entries.entries()){if(hashes.has(item.sha256))ctx.addIssue({code:'custom',path:['entries',index,'sha256'],message:'Duplicate source hash in manifest.'});hashes.add(item.sha256);}
});
export type ImportEntry=z.infer<typeof importEntrySchema>;
export type MaterialImportManifest=z.infer<typeof materialImportManifest>;
export function relativeSourceMatches(filePath:string,expected:string){
  const normalize=(s:string)=>s.replace(/\\/g,'/').replace(/^\.\//,'');
  const file=normalize(filePath),source=normalize(expected);
  return file===source || file.endsWith('/'+source);
}
