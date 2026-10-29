const fs = require('fs');
const path = require('path');

const mcqs = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'data', 'physics', 'physics_chap1_2_past_mcqs.json'), 'utf8'));
const customQuizzesPath = path.join(process.cwd(), 'data', 'custom_quizzes.json');
let customQuizzes = [];
if (fs.existsSync(customQuizzesPath)) {
  try { customQuizzes = JSON.parse(fs.readFileSync(customQuizzesPath, 'utf8')); } catch (e) {}
}

const quizEntry = {
  id: 'sample-quiz-phy-chap-1-2',
  code: 'PHY-IX-CHAP1-2',
  title: 'Physics SSC-I Chapters 1 & 2 Past Papers (2014–2024 MCQs)',
  description: 'Complete 44 Past Paper Questions covering Physical Quantities & Measurements (Chap 1) and Kinematics (Chap 2) with 100% verified step-by-step solutions.',
  boardId: 'AKU-EB',
  classLevel: 9,
  subject: 'Physics',
  totalMarks: mcqs.length,
  durationMin: 55,
  status: 'PUBLISHED',
  visibility: 'PUBLIC',
  teacherName: 'AKU-EB Physics Faculty',
  settings: {
    immediateFeedback: true,
    showCorrectAnswers: true,
    tabMonitoringEnabled: false
  },
  questions: mcqs.map((m, idx) => ({
    id: `phy-ix-chap1-2-q${idx + 1}`,
    stemText: m.stem,
    marks: m.marks || 1,
    cognitiveLevel: m.cognitiveLevel || 'U',
    isDiagram: !!m.isDiagram,
    diagramUrl: m.diagramUrl,
    drawingSvg: m.diagramUrl ? `<div style="text-align: center;"><img src="${m.diagramUrl}" alt="Question Diagram" style="max-width: 100%; max-height: 280px; object-fit: contain; margin: 0 auto; display: block;" /></div>` : null,
    options: Object.entries(m.options).map(([key, text]) => ({
      id: key,
      text: text,
      isCorrect: key === m.correctOption
    })),
    explanation: m.explanation,
    correctOption: m.correctOption,
    slo: m.slo
  })),
  createdAt: new Date().toISOString()
};

// Also support a secondary alias with slug id
const slugEntry = {
  ...quizEntry,
  id: 'physics-chap-1-and-2-past-papers'
};

const existingIdx = customQuizzes.findIndex(q => q.id === quizEntry.id || q.code === quizEntry.code);
if (existingIdx >= 0) {
  customQuizzes[existingIdx] = quizEntry;
} else {
  customQuizzes.unshift(quizEntry);
}

const slugIdx = customQuizzes.findIndex(q => q.id === slugEntry.id);
if (slugIdx >= 0) {
  customQuizzes[slugIdx] = slugEntry;
} else {
  customQuizzes.push(slugEntry);
}

fs.writeFileSync(customQuizzesPath, JSON.stringify(customQuizzes, null, 2), 'utf8');
console.log('Successfully registered quiz into custom_quizzes.json. Total questions:', quizEntry.questions.length);
