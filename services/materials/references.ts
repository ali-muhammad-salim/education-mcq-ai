import prisma from '@/lib/prisma';
import { publicMaterialWhere } from '@/lib/materialVisibility';
import { materialMetadata } from './catalog';
export async function paperResources(documentId: string | null | undefined) {
  if (!documentId) return [];
  const rows = await prisma.knowledgeReference.findMany({where:{documentId,reference:{...publicMaterialWhere,resourceType:{in:['answer_key','e_marking']}}},include:{reference:{select:{id:true,resourceType:true,catalogMetadata:true,totalPages:true,_count:{select:{artifacts:true}}}}},orderBy:{referenceId:'asc'}});
  return rows.filter(({reference:r})=>r.totalPages>0 && r.totalPages===r._count.artifacts).map(({reference:r})=>({label:materialMetadata.parse(r.catalogMetadata||{}).title || (r.resourceType==='answer_key'?'Official answer key':'E-marking notes'),href:'/materials/'+r.id}));
}
