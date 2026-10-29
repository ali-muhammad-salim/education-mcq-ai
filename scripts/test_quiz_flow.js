const http = require('http');

function post(path, body) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body);
    const req = http.request({
      hostname: 'localhost',
      port: 3000,
      path,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data)
      }
    }, (res) => {
      let respBody = '';
      res.on('data', chunk => respBody += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(respBody) });
        } catch {
          resolve({ status: res.statusCode, raw: respBody });
        }
      });
    });
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

function get(path) {
  return new Promise((resolve, reject) => {
    http.get(`http://localhost:3000${path}`, (res) => {
      let respBody = '';
      res.on('data', chunk => respBody += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(respBody) });
        } catch {
          resolve({ status: res.statusCode, raw: respBody });
        }
      });
    }).on('error', reject);
  });
}

async function runTest() {
  console.log('--- Step 1: Create Assessment with Math & Visual Questions ---');
  const quizPayload = {
    title: 'Class IX Physics End-to-End Verification Test',
    description: 'Comprehensive test covering kinematics, equations, and Newton laws.',
    boardId: 'AKU-EB',
    classLevel: 9,
    subject: 'Physics',
    durationMin: 30,
    visibility: 'PUBLIC',
    status: 'PUBLISHED',
    settings: {
      tabMonitoringEnabled: true,
      tabWarningThreshold: 2,
      immediateFeedback: true,
      showCorrectAnswers: true
    },
    questions: [
      {
        orderIndex: 1,
        questionType: 'MCQ_SINGLE',
        stemText: 'What is the SI unit of momentum ($$p = mv$$)?',
        marks: 1,
        isRequired: true,
        options: [
          { id: 'opt-1', text: '$$\\text{kg}\\cdot\\text{m/s}$$', isCorrect: true },
          { id: 'opt-2', text: '$$\\text{N}\\cdot\\text{s}^2$$', isCorrect: false },
          { id: 'opt-3', text: '$$\\text{J}\\cdot\\text{s}$$', isCorrect: false },
          { id: 'opt-4', text: '$$\\text{kg/m}^3$$', isCorrect: false }
        ],
        explanation: 'Momentum is mass times velocity, with units $$\\text{kg}\\cdot\\text{m/s}$$.'
      },
      {
        orderIndex: 2,
        questionType: 'NUMERICAL',
        stemText: 'A car accelerates uniformly from rest at $$2\\text{ m/s}^2$$ for 5 seconds. What is its final velocity in m/s?',
        marks: 2,
        isRequired: true,
        correctAnswerText: '10',
        numericalTolerance: 0.1,
        explanation: 'Using $$v = u + at = 0 + (2)(5) = 10\\text{ m/s}$$.'
      }
    ]
  };

  const createRes = await post('/api/quizzes', quizPayload);
  console.log('Quiz Created:', createRes.status, createRes.data?.quizId);
  const quizId = createRes.data?.quizId;
  if (!quizId) throw new Error('Quiz creation failed');

  console.log('--- Step 2: Student Starts Timed Assessment Attempt ---');
  const attemptRes = await post(`/api/quizzes/${quizId}/attempt`, {});
  console.log('Attempt Started:', attemptRes.status, attemptRes.data?.attempt?.id);
  const attemptId = attemptRes.data?.attempt?.id;
  const questions = attemptRes.data?.attempt?.questions;
  console.log('Sanitized Question Count:', questions?.length);

  console.log('--- Step 3: Student Answers Question 1 (MCQ) & Question 2 (Numerical) ---');
  const q1 = questions[0];
  const q2 = questions[1];

  const ans1Res = await post(`/api/quizzes/${quizId}/attempt/answer`, {
    attemptId,
    questionId: q1.id,
    answerPayload: { selectedOptionId: 'opt-1' }
  });
  console.log('Answer 1 Saved:', ans1Res.status, ans1Res.data?.version);

  const ans2Res = await post(`/api/quizzes/${quizId}/attempt/answer`, {
    attemptId,
    questionId: q2.id,
    answerPayload: { numericAnswer: '10' }
  });
  console.log('Answer 2 Saved:', ans2Res.status, ans2Res.data?.version);

  console.log('--- Step 4: Anti-Cheating Tab Switch Monitoring Event ---');
  const eventRes = await post(`/api/quizzes/${quizId}/attempt/event`, {
    attemptId,
    eventType: 'TAB_VISIBILITY_CHANGE',
    metadata: { reason: 'Student switched to browser tab' }
  });
  console.log('Tab Switch Logged:', eventRes.status, 'Count:', eventRes.data?.tabSwitchCount, 'Threshold Exceeded:', eventRes.data?.thresholdExceeded);

  console.log('--- Step 5: Student Submits Assessment ---');
  const submitRes = await post(`/api/quizzes/${quizId}/attempt/submit`, {
    attemptId
  });
  console.log('Assessment Submitted:', submitRes.status, {
    score: submitRes.data?.score,
    maxMarks: submitRes.data?.maxMarks,
    percentage: submitRes.data?.percentage + '%',
    status: submitRes.data?.status
  });

  console.log('--- Step 6: Fetch Results & Explanations ---');
  const resultsRes = await get(`/api/quizzes/${quizId}/results?attemptId=${attemptId}`);
  console.log('Results Retrieved:', resultsRes.status, {
    score: resultsRes.data?.result?.score,
    maxMarks: resultsRes.data?.result?.maxMarks,
    percentage: resultsRes.data?.result?.percentage + '%',
    tabSwitches: resultsRes.data?.result?.tabSwitchCount,
    questionCount: resultsRes.data?.result?.questions?.length
  });

  console.log('--- All Steps Completed Successfully! ---');
}

runTest().catch(console.error);
