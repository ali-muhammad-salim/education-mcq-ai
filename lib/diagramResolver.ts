export function resolveQuestionDiagram(
  paperCode?: string,
  questionNumber?: string | number,
  question?: any
): string | undefined {
  if (!questionNumber && !question) return undefined;

  // 1. Direct properties
  if (question?.diagramUrl) return question.diagramUrl;
  if (question?.diagram_url) return question.diagram_url;
  if (question?.image) return question.image;
  if (question?.imageUrl) return question.imageUrl;

  const meta = typeof question?.sourceRegion === 'string' 
    ? (() => { try { return JSON.parse(question.sourceRegion); } catch { return {}; } })()
    : (question?.sourceRegion || {});

  if (meta.diagram_url) return meta.diagram_url;
  if (meta.diagramUrl) return meta.diagramUrl;
  if (meta.image_url) return meta.image_url;

  const num = parseInt(String(questionNumber || question?.questionNumber || '0').replace(/\D/g, ''), 10);
  const pCode = (paperCode || '').toUpperCase();
  const isSSC2 = pCode.includes('X') || pCode.includes('SSC-2') || pCode.includes('SSC2') || pCode.includes('SSC-II');

  if (!isSSC2) {
    // SSC-1 / Class IX Diagrams
    const ssc1Map: Record<number, string> = {
      6: '/extracted_diagrams/PHY-IX-2025-P1_Q6.png',
      7: '/extracted_diagrams/PHY-IX-2025-P1_Q7.png',
      9: '/extracted_diagrams/PHY-IX-2025-P1_p5_drawing.png',
      10: '/extracted_diagrams/PHY-IX-2025-P1_p5_img0_0.png',
      15: '/extracted_diagrams/PHY-IX-2025-P1_Q15.png',
      16: '/extracted_diagrams/PHY-IX-2025-P1_Q16.png',
      17: '/extracted_diagrams/PHY-IX-2025-P1_Q17.png',
      28: '/extracted_diagrams/PHY-IX-2025-P1_Q28.png',
      29: '/extracted_diagrams/PHY-IX-2025-P1_Q29.png',
      36: '/extracted_diagrams/PHY-IX-2025-P1_Q36.png'
    };
    if (ssc1Map[num]) return ssc1Map[num];
  } else {
    // SSC-2 / Class X Diagrams
    const ssc2Map: Record<number, string> = {
      17: '/materials/scans/diagrams/ssc2_p1_p5_diagram.png',
      21: '/materials/scans/diagrams/ssc2_p1_p6_diagram.png',
      27: '/materials/scans/diagrams/ssc2_p1_p7_diagram.png',
      35: '/materials/scans/diagrams/ssc2_p1_p10_diagram.png',
      38: '/materials/scans/diagrams/ssc2_p1_p11_diagram.png',
      40: '/materials/scans/diagrams/ssc2_p1_p12_diagram.png'
    };
    if (ssc2Map[num]) return ssc2Map[num];
  }

  // Paper 2 CRQ diagrams
  if (pCode.includes('P2') || pCode.includes('PAPER 2') || pCode.includes('PAPER II')) {
    const crqMap: Record<number, string> = {
      3: '/extracted_diagrams/PHY-IX-2025-P2_p3_drawing.png',
      7: '/extracted_diagrams/PHY-IX-2025-P2_p7_drawing.png',
      8: '/extracted_diagrams/PHY-IX-2025-P2_p8_drawing.png'
    };
    if (crqMap[num]) return crqMap[num];
  }

  if (question?.isDiagram && question?.pageNumber) {
    return `/materials/scans/ssc1_p1_page_${question.pageNumber}.png`;
  }

  return undefined;
}
