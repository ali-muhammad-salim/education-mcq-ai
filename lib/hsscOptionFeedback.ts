export function validateHsscFeedback(code: string, count: number, feedback: string[][]) {
  if (feedback.length !== count || feedback.some(reasons => reasons.length !== 4 || reasons.some(reason => !reason.trim()))) {
    throw new Error(`Incomplete option explanations for ${code}`);
  }
}

export function hsscOptionFeedback(reasons: string[], correct: string | undefined) {
  const option_feedback = reasons.map((reason, index) => ({ key: "ABCD"[index], reason }));
  const explanation = option_feedback.find(option => option.key === correct)?.reason;
  return { option_feedback, ...(explanation ? { explanation } : {}) };
}
