export const mcqCategories = [
  { id: 'chapter-wise', key: 'chapter_wise', label: 'Chapter-wise MCQs' },
  { id: 'past-papers', key: 'past_papers', label: 'Past-paper MCQs' },
  { id: 'full-papers', key: 'full_book', label: 'Full papers & quizzes' },
  { id: 'cognitive', key: 'cognitive', label: 'Practice by cognitive level' },
] as const;
export type McqCategory = typeof mcqCategories[number]['key'];
