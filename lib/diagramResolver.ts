import verifiedManifestJson from '@/data/physics/verified_diagrams_manifest.json';

interface DiagramEntry {
  diagramUrl: string;
  description?: string;
  page?: number;
  box_2d?: number[];
  width?: number;
  height?: number;
}

const verifiedManifest = verifiedManifestJson as Record<string, Record<string, DiagramEntry>>;

/**
 * Resolves verified cropped diagram, circuit, or graph image URLs for examination questions.
 * 
 * Strict Accuracy Rules:
 * 1. If a question is flagged as having NO diagram (`isDiagram === false` or `diagramBased === false`),
 *    it ALWAYS returns undefined to prevent erroneous rough-work boxes or unrelated images.
 * 2. Checks direct question object diagram properties (diagramUrl, imageUrl, sourceRegion).
 * 3. Consults the verified AI-cropped diagrams manifest (`data/physics/verified_diagrams_manifest.json`).
 * 4. Correctly distinguishes Class IX (SSC-1) from Class X (SSC-2) papers without false positives.
 */
export function resolveQuestionDiagram(
  paperCode?: string,
  questionNumber?: string | number,
  question?: any
): string | undefined {
  if (!questionNumber && !question) return undefined;

  // 1. HARD GUARD: If explicitly marked as not having a diagram, NEVER show an image
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

  // 2. Direct properties on the question object
  if (typeof question?.diagramUrl === 'string' && question.diagramUrl.trim()) return question.diagramUrl.trim();
  if (typeof question?.diagram_url === 'string' && question.diagram_url.trim()) return question.diagram_url.trim();
  if (typeof question?.image === 'string' && question.image.trim()) return question.image.trim();
  if (typeof question?.imageUrl === 'string' && question.imageUrl.trim()) return question.imageUrl.trim();

  // 3. Properties inside sourceRegion metadata
  if (typeof meta?.diagram_url === 'string' && meta.diagram_url.trim()) return meta.diagram_url.trim();
  if (typeof meta?.diagramUrl === 'string' && meta.diagramUrl.trim()) return meta.diagramUrl.trim();
  if (typeof meta?.image_url === 'string' && meta.image_url.trim()) return meta.image_url.trim();

  // 4. Manifest lookup for verified examination diagrams
  const rawQ = String(questionNumber || question?.questionNumber || '').replace(/^Q\.?\s*/i, '').trim();
  const normKey = rawQ.toLowerCase();
  const compactKey = normKey.replace(/\./g, '');
  const numStr = rawQ.replace(/\D/g, '');
  if (!normKey && !numStr) return undefined;

  const pCode = (paperCode || '').toUpperCase().trim();

  // Check Class IX before Class X because Roman numeral 'IX' contains the letter 'X'
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

  const is2024 = pCode.includes('2024') || Number(question?.examYear) === 2024;

  // Determine paper key for manifest
  let targetPaperKey = '';
  if (verifiedManifest[pCode]) {
    targetPaperKey = pCode;
  } else if (pCode.startsWith('PHY') || (!pCode.startsWith('CHM') && !pCode.startsWith('BIO') && !pCode.startsWith('MTH') && !pCode.startsWith('CSC') && !pCode.startsWith('ENG') && !pCode.startsWith('URD'))) {
    if (isClass9) {
      targetPaperKey = is2024
        ? (isPaper2 ? 'PHY-IX-2024-P2' : 'PHY-IX-2024-P1')
        : (isPaper2 ? 'PHY-IX-2025-P2' : 'PHY-IX-2025-P1');
    } else if (isClass10) {
      targetPaperKey = isPaper2 ? 'PHY-X-2025-P2' : 'PHY-X-2025-P1';
    }
  }

  if (targetPaperKey && verifiedManifest[targetPaperKey]) {
    const paperMap = verifiedManifest[targetPaperKey];
    const entry = paperMap[rawQ] || paperMap[normKey] || paperMap[compactKey] || (numStr ? paperMap[numStr] : undefined);
    if (entry && entry.diagramUrl) {
      return entry.diagramUrl;
    }
  }

  return undefined;
}
