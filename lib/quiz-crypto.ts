// The browser has no key for a sealed answer. Only the authenticated results API
// may release answers after submission, according to the teacher's quiz settings.
export interface QuizReveal {
  correctLetter: string;
  explanation: string;
  optionFeedback?: Record<string, string>;
  unit?: string;
}

export function decryptQuestionReveal(_questionId: string, _sealed?: string): QuizReveal | null {
  return null;
}
