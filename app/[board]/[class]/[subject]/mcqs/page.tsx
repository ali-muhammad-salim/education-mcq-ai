import SubjectMcqsPage from '@/components/SubjectMcqsPage';
export default function Page({params}:{params:Promise<{board:string;class:string;subject:string}>}){return <SubjectMcqsPage params={params}/>;}
