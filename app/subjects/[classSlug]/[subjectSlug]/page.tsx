import {redirect,notFound} from 'next/navigation';
import {normalizeClassRoman} from '@/lib/boardHierarchy';
import {getSubjectMeta} from '@/lib/subjectMetadata';
export default async function Page({params}:{params:Promise<{classSlug:string;subjectSlug:string}>}){const raw=await params,grade=normalizeClassRoman(raw.classSlug);if(!grade)notFound();redirect('/akueb/'+grade+'/'+getSubjectMeta(raw.subjectSlug).slug);}
