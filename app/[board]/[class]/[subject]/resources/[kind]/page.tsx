import { notFound } from 'next/navigation';
import Breadcrumbs from '@/components/Breadcrumbs';
import MaterialList from '@/components/MaterialList';
import styles from '@/components/MaterialLayout.module.css';
import { supportingMaterialLabels } from '@/lib/materialTypes';
import { subjectMaterials } from '@/services/materials/catalog';
import { studyScope } from '@/services/study/navigation';
export const dynamic='force-dynamic';
export default async function Page({params}:{params:Promise<{board:string;class:string;subject:string;kind:string}>}){
  const raw=await params,scope=studyScope(raw.board,raw.class,raw.subject);
  const label=supportingMaterialLabels[raw.kind as keyof typeof supportingMaterialLabels];
  if(!scope||!label)notFound();
  const documents=await subjectMaterials(raw.board,raw.class,raw.subject,raw.kind);
  return <section className={styles.page}><Breadcrumbs items={[{label:scope.board.name,href:'/'+scope.board.id},{label:scope.classDef.name,href:'/'+scope.board.id+'/'+scope.classDef.roman},{label:scope.meta.title,href:scope.baseUrl},{label,active:true}]}/><h1>{label}</h1><MaterialList items={documents.map(doc=>({label:doc.metadata.title||label,href:'/materials/'+doc.id}))}/>{!documents.length&&<p>Coming soon</p>}</section>;
}
