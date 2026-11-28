type AnswerReview = {
  official_answer?: string;
  accepted_options?: string[];
  answer_review_note: string;
};

const problemAnalysisReview = 'Class X 2022 Paper I credits A, defining the problem. The Class IX model paper solution credits B, analysing the problem. The prompt combines identifying what the problem asks with examining its information and requirements, so it does not have a clear single answer.';

const reviews: Record<string, Record<number, AnswerReview>> = {
  'CS-IX-2026-P1': {
    17: { answer_review_note: 'The wording about software and the editor does not identify a unique false statement.' },
    20: { answer_review_note: 'The CSS gives the table a border. The question asks about the cell, which has no border of its own.' },
    29: { answer_review_note: 'Several choices describe the amount of data, so the question does not identify a unique answer.' },
  },
  'CS-IX-2022-P1': {
    5: { official_answer: 'D', accepted_options: ['A', 'D'], answer_review_note: 'The printed key credits D. On modern processors L2 cache is on the processor, which also makes A false. Older systems sometimes placed L2 on the motherboard.' },
    39: { official_answer: 'D', answer_review_note: 'Choice D uses the intended CSS declarations, but the printed <style="…"> opening is invalid HTML. A valid solution sets background-color on an element such as body and color on the paragraph.' },
  },
  'CS-IX-2023-P1': {
    11: { official_answer: '*', answer_review_note: 'The printed key contains an asterisk and does not identify a scorable answer.' },
    20: { official_answer: 'D', accepted_options: ['A', 'D'], answer_review_note: 'The printed key credits Layout. In Word, the Home tab also provides the line spacing control in the Paragraph group.' },
  },
  'CS-IX-2024-P1': {
    9: { official_answer: 'D,A', accepted_options: ['D', 'A'], answer_review_note: 'The printed key credits both D and A.' },
    39: { official_answer: '•', answer_review_note: 'The printed key shows a bullet. The educator solution is A, which correctly uses an HTML anchor with an href attribute.' },
  },
  'CS-IX-P1': {
    8: { answer_review_note: problemAnalysisReview },
    14: { answer_review_note: 'B is the intended choice for an explicitly tagged HTML document. As written, statement IV is also false. An HTML fragment does not need an html closing tag, and a complete HTML document can omit it under the HTML syntax rules.' },
    20: { accepted_options: ['A', 'C'], answer_review_note: 'A declares a variable and stores the result of prompt. C also stores the result if name is already available in the scope. The question does not require a declaration.' },
  },
  'CS-X-2019-P1': {
    21: { official_answer: 'A,C', accepted_options: ['A', 'C'], answer_review_note: 'The printed key credits both A and C.' },
  },
  'CS-X-2022-P1': {
    5: { official_answer: 'A', answer_review_note: problemAnalysisReview },
  },
  'CS-X-2023-P1': {
    37: { official_answer: 'D,B', accepted_options: ['D', 'B'], answer_review_note: 'The printed key credits both D and B.' },
  },
  'CS-X-2024-P1': {
    8: { official_answer: 'C,D', accepted_options: ['C', 'D'], answer_review_note: 'The printed key credits both C and D.' },
    26: { official_answer: 'D', accepted_options: ['C'], answer_review_note: 'The printed key credits D. With i <= 5 and i++, the initializer in C executes once and gives five repetitions. Starting at 5 gives one repetition.' },
    31: { official_answer: 'A', accepted_options: ['A', 'C'], answer_review_note: 'The printed key credits A. In C, break can exit either a switch statement or a for loop, so C is also valid.' },
  },
  'CS-X-P1': {
    5: { answer_review_note: 'The intended answer is D if division is integer division. The printed pseudocode does not specify integer division. Ordinary division gives 12.5, which is absent from the choices.' },
    10: { answer_review_note: 'Choice D assumes one-based indexing and rounds the first midpoint down. The printed pseudocode does not specify how fractional midpoints are rounded.' },
    11: { answer_review_note: 'Choice A shows a correct first bubble-sort pass. At i = 3 the printed loop accesses List[4], outside this four-element list. A correct zero-based pass stops at i = 2.' },
    13: { answer_review_note: 'Choice B describes what happens when the button is clicked. Executing the script installs a click handler and does not itself display a pop-up.' },
    14: { answer_review_note: 'No option is correct as printed. 9007199254740993 is a Number literal, rounded to 9007199254740992. Appending n would make it a BigInt literal and make A correct.' },
  },
};

export function sscComputerScienceMcqReview(paperCode: string, questionNumber: number | string) {
  return reviews[paperCode]?.[Number(questionNumber)];
}

// Current Class IX Chapter 2 contains these questions from multiple paper editions.
const chapterRepeats: Record<string, Record<number, string>> = {
  'CS-IX-P1': {
    8: 'cs-problem-analysis-actions',
    9: 'cs-salar-candidate-solutions',
    10: 'cs-flowchart-average-of-five-integers',
  },
  'CS-X-2022-P1': { 5: 'cs-problem-analysis-actions' },
  'CS-X-2023-P1': { 1: 'cs-salar-candidate-solutions' },
  'CS-X-2025-P1': { 2: 'cs-flowchart-average-of-five-integers' },
};

export function sscComputerScienceChapterDuplicateKey(paperCode: string, questionNumber: number | string) {
  return chapterRepeats[paperCode]?.[Number(questionNumber)];
}
