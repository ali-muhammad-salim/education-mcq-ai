const path = require('path');
const manifest = require('../data/physics/verified_diagrams_manifest.json');

// Replicate the exact logic from lib/diagramResolver.ts to test in node
function resolveQuestionDiagram(paperCode, questionNumber, question) {
  if (!questionNumber && !question) return undefined;

  const meta = typeof question?.sourceRegion === 'string'
    ? (() => { try { return JSON.parse(question.sourceRegion); } catch { return {}; } })()
    : (question?.sourceRegion || {});

  if (
    question?.isDiagram === false ||
    question?.diagramBased === false ||
    meta?.isDiagram === false ||
    meta?.diagramBased === false
  ) {
    return undefined;
  }

  if (typeof question?.diagramUrl === 'string' && question.diagramUrl.trim()) return question.diagramUrl.trim();
  if (typeof question?.diagram_url === 'string' && question.diagram_url.trim()) return question.diagram_url.trim();
  if (typeof question?.image === 'string' && question.image.trim()) return question.image.trim();
  if (typeof question?.imageUrl === 'string' && question.imageUrl.trim()) return question.imageUrl.trim();

  if (typeof meta?.diagram_url === 'string' && meta.diagram_url.trim()) return meta.diagram_url.trim();
  if (typeof meta?.diagramUrl === 'string' && meta.diagramUrl.trim()) return meta.diagramUrl.trim();
  if (typeof meta?.image_url === 'string' && meta.image_url.trim()) return meta.image_url.trim();

  const numStr = String(questionNumber || question?.questionNumber || '0').replace(/\D/g, '');
  if (!numStr) return undefined;

  const pCode = (paperCode || '').toUpperCase().trim();

  const isClass9 =
    pCode.includes('IX') ||
    pCode.includes('SSC-1') ||
    pCode.includes('SSC1') ||
    pCode.includes('SSC-I') ||
    pCode.includes('CLASS 9') ||
    pCode.includes('CLASS-9') ||
    pCode.includes('GRADE 9') ||
    pCode.includes('GRADE-9');

  const isClass10 =
    !isClass9 &&
    (pCode.includes('X') ||
      pCode.includes('SSC-2') ||
      pCode.includes('SSC2') ||
      pCode.includes('SSC-II') ||
      pCode.includes('CLASS 10') ||
      pCode.includes('CLASS-10') ||
      pCode.includes('GRADE 10') ||
      pCode.includes('GRADE-10'));

  const isPaper2 =
    pCode.includes('P2') ||
    pCode.includes('P-2') ||
    pCode.includes('PAPER 2') ||
    pCode.includes('PAPER-2') ||
    pCode.includes('PAPER II') ||
    pCode.includes('PAPER-II') ||
    pCode.includes('CRQ');

  let targetPaperKey = '';
  if (manifest[pCode]) {
    targetPaperKey = pCode;
  } else if (isClass9) {
    targetPaperKey = isPaper2 ? 'PHY-IX-2025-P2' : 'PHY-IX-2025-P1';
  } else if (isClass10) {
    targetPaperKey = isPaper2 ? 'PHY-X-2025-P2' : 'PHY-X-2025-P1';
  }

  if (targetPaperKey && manifest[targetPaperKey]) {
    const entry = manifest[targetPaperKey][numStr];
    if (entry && entry.diagramUrl) {
      return entry.diagramUrl;
    }
  }

  return undefined;
}

console.log("=== RUNNING DIAGRAM RESOLVER VALIDATION TESTS ===");

const testCases = [
  // Class IX Paper 1
  { paper: 'PHY-IX-2025-P1', q: 40, expected: undefined, desc: 'Class IX Q40 (Spoon problem) must have NO diagram' },
  { paper: 'SSC-I Physics (Class IX)', q: 40, expected: undefined, desc: 'Class IX by title Q40 must have NO diagram' },
  { paper: 'PHY-IX-P1', q: 40, expected: undefined, desc: 'PHY-IX-P1 Q40 must have NO diagram' },
  { paper: 'PHY-IX-2025-P1', q: 9, expected: '/extracted_diagrams/PHY-IX-2025-P1_Q9.png', desc: 'Class IX Q9 speed-time graph' },
  { paper: 'PHY-IX-2025-P1', q: 10, expected: '/extracted_diagrams/PHY-IX-2025-P1_Q10.png', desc: 'Class IX Q10 3-blocks diagram' },
  { paper: 'PHY-IX-2025-P1', q: 15, expected: '/extracted_diagrams/PHY-IX-2025-P1_Q15.png', desc: 'Class IX Q15 forces diagram' },
  { paper: 'PHY-IX-2025-P1', q: 6, expected: undefined, desc: 'Class IX Q6 must have NO diagram (was false positive before)' },
  { paper: 'PHY-IX-2025-P1', q: 36, expected: undefined, desc: 'Class IX Q36 must have NO diagram (was false positive before)' },

  // Class X Paper 1
  { paper: 'PHY-X-2025-P1', q: 40, expected: undefined, desc: 'Class X Q40 must have NO diagram (previously rough work page 12!)' },
  { paper: 'PHY-X-P1', q: 40, expected: undefined, desc: 'PHY-X-P1 Q40 must have NO diagram' },
  { paper: 'PHY-X-2025-P1', q: 17, expected: '/extracted_diagrams/PHY-X-2025-P1_Q17.png', desc: 'Class X Q17 capacitor circuit' },
  { paper: 'PHY-X-2025-P1', q: 21, expected: '/extracted_diagrams/PHY-X-2025-P1_Q21.png', desc: 'Class X Q21 circuit' },

  // Explicit guard test
  { paper: 'PHY-IX-2025-P1', q: 9, qObj: { isDiagram: false }, expected: undefined, desc: 'Question with isDiagram: false must NEVER return diagram' },
  { paper: 'PHY-X-2025-P1', q: 17, qObj: { diagramBased: false }, expected: undefined, desc: 'Question with diagramBased: false must NEVER return diagram' }
];

let failed = 0;
for (const tc of testCases) {
  const result = resolveQuestionDiagram(tc.paper, tc.q, tc.qObj);
  if (result === tc.expected) {
    console.log(`[PASS] ${tc.desc} -> ${result}`);
  } else {
    console.error(`[FAIL] ${tc.desc} -> Expected: ${tc.expected}, Got: ${result}`);
    failed++;
  }
}

if (failed === 0) {
  console.log("\nALL 14 TEST CASES PASSED PERFECTLY!");
  process.exit(0);
} else {
  console.error(`\n${failed} TEST CASES FAILED!`);
  process.exit(1);
}
