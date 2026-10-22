import KnowledgeReview from '@/components/KnowledgeReview';
import DiagramApproval from '@/components/DiagramApproval';
import QuestionMappingReview from '@/components/QuestionMappingReview';
import Link from 'next/link';
import styles from '@/components/KnowledgeReview.module.css';
import LegacyPaperChecks from '@/components/LegacyPaperChecks';
export default async function KnowledgeReviewPage({searchParams}:{searchParams:Promise<{view?:string}>}) { const view=(await searchParams).view;return <><nav aria-label="Source administration" className={styles.navigation}><Link href="/admin/knowledge">Source reviews</Link><Link href="/admin/knowledge?view=questions">Answer & syllabus reviews</Link><Link href="/admin/knowledge?view=diagrams">Diagram approvals</Link></nav>{view==='diagrams'?<DiagramApproval/>:view==='questions'?<><LegacyPaperChecks/><QuestionMappingReview/></>:<KnowledgeReview/>}</>; }
