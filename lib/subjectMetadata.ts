export interface SubjectMeta {
  title: string;
  slug: string;
  code?: string;
  icon: string;
  description: string;
  chapterCount?: number;
  sloCount?: number;
  categories: string[];
}

export const SUBJECT_METADATA: Record<string, SubjectMeta> = {
  'mathematics-humanities-group': {title:'Mathematics Humanities Group',slug:'mathematics-humanities-group',code:'MTH-H',icon:'📐',description:'AKU-EB mathematics resources for the humanities group.',categories:['Official Syllabus','Model Papers','Study Notes']},
  'literature-in-english': {title:'Literature in English',slug:'literature-in-english',code:'LIT',icon:'📖',description:'AKU-EB English literature syllabus and examination resources.',categories:['Official Syllabus','Model Papers','Study Notes']},
  'food-and-nutrition': {title:'Food and Nutrition',slug:'food-and-nutrition',code:'FNU',icon:'📚',description:'AKU-EB food and nutrition syllabus and examination resources.',categories:['Official Syllabus','Model Papers','Practicals']},
  'physics': {
    title: 'Physics',
    slug: 'physics',
    code: 'PHY',
    icon: '⚛️',
    description: 'Fundamental principles of matter, motion, energy, mechanics, thermodynamics, and physical measurement mapped to AKU-EB examination standards.',
    chapterCount: 8,
    sloCount: 145,
    categories: ['Official Syllabus', 'Model Papers', '2025 Past Papers', 'Interactive MCQs', 'E-Marking Notes', 'Practicals']
  },
  'chemistry': {
    title: 'Chemistry',
    slug: 'chemistry',
    code: 'CHM',
    icon: '🧪',
    description: 'Structure of atoms, chemical bonding, periodicity, physical states, solutions, and electrochemistry under active national curriculum standards.',
    chapterCount: 8,
    sloCount: 130,
    categories: ['Official Syllabus', 'Model Papers', 'Chapter MCQs', 'Notes', 'Lab Manual']
  },
  'biology': {
    title: 'Biology',
    slug: 'biology',
    code: 'BIO',
    icon: '🧬',
    description: 'Living systems, cellular biology, biodiversity, cell cycle, bioenergetics, nutrition, and transport processes mapped to SLO guidelines.',
    chapterCount: 9,
    sloCount: 160,
    categories: ['Official Syllabus', 'Model Papers', 'Chapter MCQs', 'Study Notes']
  },
  'mathematics': {
    title: 'Mathematics',
    slug: 'mathematics',
    code: 'MTH',
    icon: '📐',
    description: 'Real numbers, logarithms, algebraic expressions, linear equations, matrices, geometry, and trigonometry according to AKU-EB exam pattern.',
    chapterCount: 9,
    sloCount: 155,
    categories: ['Official Syllabus', 'Model Papers', 'Formula Sheets', 'MCQ Banks']
  },
  'mathematics-science-group': {
    title: 'Mathematics Science Group',
    slug: 'mathematics-science-group',
    code: 'MTH',
    icon: '📐',
    description: 'Advanced mathematics curriculum for science stream including quadratic equations, geometry, trigonometry, and calculus concepts.',
    chapterCount: 10,
    sloCount: 170,
    categories: ['Official Syllabus', 'Model Papers', 'Solved Questions', 'Practice Quizzes']
  },
  'computer-science': {
    title: 'Computer Science',
    slug: 'computer-science',
    code: 'CS',
    icon: '💻',
    description: 'Computer systems, computational thinking, algorithms, flowcharts, programming fundamentals, and cybersecurity ethics.',
    chapterCount: 5,
    sloCount: 90,
    categories: ['Official Syllabus', 'Model Papers', 'Coding Notes', 'Chapter Quizzes']
  },
  'english-compulsory': {
    title: 'English Compulsory',
    slug: 'english-compulsory',
    code: 'ENG',
    icon: '📖',
    description: 'Reading comprehension, writing skills, grammar & syntax, vocabulary, and literary analysis aligned with AKU-EB specifications.',
    chapterCount: 4,
    sloCount: 65,
    categories: ['Official Syllabus', 'Model Papers', 'Past Passages', 'Sample Essays']
  },
  'urdu-compulsory': {
    title: 'Urdu Compulsory',
    slug: 'urdu-compulsory',
    code: 'URD',
    icon: '✍️',
    description: 'Urdu comprehension, prose and poetry explanation, grammar, composition, and thematic writing.',
    chapterCount: 4,
    sloCount: 60,
    categories: ['Official Syllabus', 'Model Papers', 'Nasar & Ghazal', 'Grammar Notes']
  },
  'islamiyat': {
    title: 'Islamiyat',
    slug: 'islamiyat',
    code: 'ISL',
    icon: '🕌',
    description: 'Quranic studies, Hadith comprehension, Islamic history, and moral ethical guidelines.',
    chapterCount: 4,
    sloCount: 50,
    categories: ['Official Syllabus', 'Model Papers', 'Ahadith & Ayaat', 'Short Notes']
  },
  'pakistan-studies': {
    title: 'Pakistan Studies',
    slug: 'pakistan-studies',
    code: 'PST',
    icon: '🇵🇰',
    description: 'Ideological basis of Pakistan, historical evolution, geography, environment, and constitutional development.',
    chapterCount: 4,
    sloCount: 55,
    categories: ['Official Syllabus', 'Model Papers', 'Historical Timeline', 'Quizzes']
  },
  'ethics': {
    title: 'Ethics',
    slug: 'ethics',
    code: 'ETH',
    icon: '⚖️',
    description: 'Moral philosophy, universal ethical principles, and civic responsibilities for non-Muslim candidates.',
    chapterCount: 4,
    sloCount: 45,
    categories: ['Official Syllabus', 'Model Papers', 'Study Notes']
  },
  'general-science': {
    title: 'General Science',
    slug: 'general-science',
    code: 'GSC',
    icon: '🔬',
    description: 'Everyday science, health, environment, energy, and technology principles for humanities and general group students.',
    chapterCount: 8,
    sloCount: 110,
    categories: ['Official Syllabus', 'Model Papers', 'Chapter Notes']
  },
  'general-mathematics': {
    title: 'General Mathematics',
    slug: 'general-mathematics',
    code: 'GMT',
    icon: '🔢',
    description: 'Practical arithmetic, commercial mathematics, basic statistics, and algebraic calculations for humanities candidates.',
    chapterCount: 6,
    sloCount: 85,
    categories: ['Official Syllabus', 'Model Papers', 'MCQ Banks']
  },
  'economics': {
    title: 'Economics',
    slug: 'economics',
    code: 'ECO',
    icon: '📊',
    description: 'Microeconomics, macroeconomics, supply and demand, market structures, and financial institutions in Pakistan.',
    chapterCount: 6,
    sloCount: 95,
    categories: ['Official Syllabus', 'Model Papers', 'Case Studies']
  },
  'principles-of-accounting': {
    title: 'Principles Of Accounting',
    slug: 'principles-of-accounting',
    code: 'ACC',
    icon: '📑',
    description: 'Financial ledger systems, double-entry bookkeeping, trial balance, and financial statement formulation.',
    chapterCount: 7,
    sloCount: 105,
    categories: ['Official Syllabus', 'Model Papers', 'Ledger Practice']
  }
};

export function getSubjectMeta(rawName: string): SubjectMeta {
  const normalized = rawName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  if (SUBJECT_METADATA[normalized]) {
    return SUBJECT_METADATA[normalized];
  }

  // Fallback slug mappings
  if (normalized.includes('physics')) return SUBJECT_METADATA['physics'];
  if (normalized.includes('chemistry')) return SUBJECT_METADATA['chemistry'];
  if (normalized.includes('biology')) return SUBJECT_METADATA['biology'];
  if (normalized.includes('math')&&normalized.includes('humanit')) return SUBJECT_METADATA['mathematics-humanities-group'];
  if (normalized.includes('math')) return SUBJECT_METADATA['mathematics-science-group'];
  if (normalized.includes('literature')&&normalized.includes('english')) return SUBJECT_METADATA['literature-in-english'];
  if (normalized.includes('english')) return SUBJECT_METADATA['english-compulsory'];
  if (normalized.includes('urdu')) return SUBJECT_METADATA['urdu-compulsory'];
  if (normalized.includes('islam')) return SUBJECT_METADATA['islamiyat'];
  if (normalized.includes('pakistan')) return SUBJECT_METADATA['pakistan-studies'];
  if (normalized.includes('computer')) return SUBJECT_METADATA['computer-science'];

  return {
    title: rawName,
    slug: normalized,
    code: normalized.slice(0, 3).toUpperCase(),
    icon: '📚',
    description: `Official ${rawName} curriculum resources, past examination papers, model questions, and syllabus tracker.`,
    categories: ['Official Syllabus', 'Model Papers', 'Past Papers']
  };
}
