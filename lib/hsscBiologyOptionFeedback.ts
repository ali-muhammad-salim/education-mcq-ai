import data from '@/data/biology/hssc_mcq_option_feedback.json';

const reviewedFeedback: Record<string, Record<string, string[]>> = data;

export function hsscBiologyOptionFeedback(paper: string, question: string | number) {
  return reviewedFeedback[paper]?.[question]?.map((reason, index) => ({ key: 'ABCD'[index], reason }));
}
