'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { BoardInfo, ClassDefinition } from '@/lib/boardCatalog';
import { SubjectMeta } from '@/lib/subjectMetadata';
import { resolveQuestionDiagram } from '@/lib/diagramResolver';
import past2025 from '@/data/physics/ssc1_2025_past_mcqs.json';
import past2024 from '@/data/physics/ssc1_2024_past_mcqs.json';
import csPast2024 from '@/data/computer-science/ssc1_2024_past_mcqs.json';
import csPast2023 from '@/data/computer-science/ssc1_2023_past_mcqs.json';
import csPast2022 from '@/data/computer-science/ssc1_2022_past_mcqs.json';
import csPast2019 from '@/data/computer-science/ssc1_2019_past_mcqs.json';
import csPast2017 from '@/data/computer-science/ssc1_2017_past_mcqs.json';
import csXPast2024 from '@/data/computer-science/ssc2_2024_past_mcqs.json';
import chemPast2024 from '@/data/chemistry/ssc1_2024_past_mcqs.json';
import csXPast2023 from '@/data/computer-science/ssc2_2023_past_mcqs.json';
import csXPast2022 from '@/data/computer-science/ssc2_2022_past_mcqs.json';
import csXPast2019 from '@/data/computer-science/ssc2_2019_past_mcqs.json';
import csXPast2017 from '@/data/computer-science/ssc2_2017_past_mcqs.json';
import pastX2025 from '@/data/physics/ssc2_2025_past_mcqs.json';
import type { McqCategory } from '@/lib/mcqCategories';
import {
  annualOriginalReference,
  annualCurrentMapping,
  annual2024OriginalReference,
  annual2024CurrentMapping,
  annualX2025OriginalReference,
  csAnnual2024AnswerReviews,
  csAnnual2023AnswerReviews,
  csAnnual2022AnswerReviews,
  csAnnualX2024AnswerReviews,
  csAnnualX2023AnswerReviews,
  csAnnualX2019AnswerReviews,
  annualX2025CurrentMapping,
} from '@/lib/legacyPaperEvidence';
import QuestionSource from '@/components/QuestionSource';
import McqPracticeSheet, { type PracticeItem } from '@/components/McqPracticeSheet';
import TakeQuizModal from '@/components/TakeQuizModal';
import { smartMatch } from '@/lib/smartSearch';
import { questionSyllabus } from '@/lib/questionSyllabus';
import {
  HubEmpty, HubMasthead, HubRail, HubSection, HubShell, PaperGrid, TierGrid, UnitBrowser,
  type PaperEntry, type TierEntry, type UnitEntry,
} from '@/components/rise/McqHub';

interface Props {
  initialCategory?: McqCategory;
  useReviewedLegacy?: boolean;
  annualQuestions?: any[];
  mappedChapters?:{id:string;name:string;questions:any[]}[];
  availableTheorySections?: string[];
  reviewedPapers?: { paperCode: string; title: string; examYear: number; count: number }[];
  board: BoardInfo;
  classDef: ClassDefinition;
  meta: SubjectMeta;
  baseUrl: string;
  questions: any[];
  initialChapter?: string;
}

interface ChapterDef {
  unitNumber: number;
  name: string;
  slug: string;
  topics: string;
  qRange: [number, number];
  pastPaperCount: number;
}

const CLASS_IX_UNITS: ChapterDef[] = [
  {
    unitNumber: 1,
    name: 'Measurement',
    slug: 'measurement',
    topics: 'Physical Quantities, SI Units, Prefixes, Scientific Notation, Scalars & Vectors, Vernier Callipers, Screw Gauge, Significant Figures',
    qRange: [1, 5],
    pastPaperCount: 28
  },
  {
    unitNumber: 2,
    name: 'Kinematics',
    slug: 'kinematics',
    topics: 'Rest & Motion, Distance & Displacement, Speed & Velocity, Acceleration, Distance-Time & Speed-Time Graphs, Motion due to Gravity',
    qRange: [6, 9],
    pastPaperCount: 32
  },
  {
    unitNumber: 3,
    name: 'Dynamics',
    slug: 'dynamics',
    topics: 'Mass & Weight, Contact & Non-Contact Forces, Newton Laws of Motion, Momentum & Impulse, Friction, Uniform Circular Motion',
    qRange: [10, 14],
    pastPaperCount: 35
  },
  {
    unitNumber: 4,
    name: 'Turning Effect of Forces',
    slug: 'turning-effect-of-forces',
    topics: 'Parallel Forces, Moment of a Force (Torque), Principle of Moments, Centre of Gravity, Couple, Equilibrium & Stability',
    qRange: [15, 18],
    pastPaperCount: 24
  },
  {
    unitNumber: 5,
    name: 'Deformation of Solids ( & Historical Gravitation)',
    slug: 'deformation-of-solids',
    topics: 'Elasticity, Hooke Law (F = kx), Spring Constant, Load-Extension Graphs & Limit of Proportionality (plus 2023/2024 Gravitation items)',
    qRange: [19, 22],
    pastPaperCount: 20
  },
  {
    unitNumber: 6,
    name: 'Work, Energy and Power',
    slug: 'work-energy-and-power',
    topics: 'Work (W = Fd), Kinetic & Gravitational Potential Energy, Conservation of Energy, Renewable & Non-Renewable Sources, Efficiency, Power',
    qRange: [23, 27],
    pastPaperCount: 30
  },
  {
    unitNumber: 7,
    name: 'Pressure',
    slug: 'pressure',
    topics: 'Density, Pressure (P = F/A), Atmospheric Pressure & Barometer, Hydrostatic Pressure in Liquids (P = ρgh), Pascal Law & Hydraulic Lift',
    qRange: [28, 32],
    pastPaperCount: 29
  },
  {
    unitNumber: 8,
    name: 'Thermal Physics',
    slug: 'thermal-physics',
    topics: 'Kinetic Molecular Theory, Internal Energy, Specific Heat Capacity, Latent Heat of Fusion & Vaporisation, Evaporation, Thermometers',
    qRange: [33, 36],
    pastPaperCount: 22
  },
  {
    unitNumber: 9,
    name: 'Transfer of Thermal Energy',
    slug: 'transfer-of-thermal-energy',
    topics: 'Thermal Conduction, Convection Currents, Thermal Radiation, Good & Bad Emitters/Absorbers, Vacuum Flask, Greenhouse Effect',
    qRange: [37, 40],
    pastPaperCount: 20
  },
  {
    unitNumber: 10,
    name: 'Nature of Science',
    slug: 'nature-of-science',
    topics: 'Objectives of Physics, Sub-Fields of Physics, Hypothesis, Theory & Law, Scientific Method, Science, Technology & Engineering',
    qRange: [41, 41],
    pastPaperCount: 5
  }
];

const CLASS_X_UNITS: ChapterDef[] = [
  {
    unitNumber: 11,
    name: 'Wave Motion',
    slug: 'wave-motion',
    topics: 'Oscillatory Motion, Simple Pendulum, Transverse & Longitudinal Waves, Wave Equation (v = fλ), Ripple Tank Reflection, Refraction & Diffraction',
    qRange: [1, 4],
    pastPaperCount: 30
  },
  {
    unitNumber: 12,
    name: 'Sound',
    slug: 'sound',
    topics: 'Nature & Propagation of Sound, Loudness, Pitch, Quality & Intensity, Speed of Sound, Echo Calculations, Ultrasound & Noise Pollution',
    qRange: [5, 8],
    pastPaperCount: 25
  },
  {
    unitNumber: 13,
    name: 'Geometrical Optics',
    slug: 'geometrical-optics',
    topics: 'Reflection & Spherical Mirrors, Refraction & Snell Law, Dispersion, Total Internal Reflection & Optical Fibres, Thin Lenses & Eye Defects',
    qRange: [9, 13],
    pastPaperCount: 36
  },
  {
    unitNumber: 14,
    name: 'Electrostatics',
    slug: 'electrostatics',
    topics: 'Electric Charge, Gold-Leaf Electroscope, Coulomb Law, Electrostatic Induction, Electric Field & Potential, Applications & Lightning',
    qRange: [14, 17],
    pastPaperCount: 32
  },
  {
    unitNumber: 15,
    name: 'Electric Current',
    slug: 'electric-current',
    topics: 'Conventional Current, Potential Difference & e.m.f., Ohm Law, Resistance & Resistivity, Electrical Power & Joule Law, AC & Safety',
    qRange: [15, 20],
    pastPaperCount: 38
  },
  {
    unitNumber: 16,
    name: 'D.C. Circuits',
    slug: 'dc-circuits',
    topics: 'Series & Parallel Resistor Combinations, Equivalent Resistance, Circuit Diagrams, Potential Divider, Thermistor & LDR',
    qRange: [18, 21],
    pastPaperCount: 24
  },
  {
    unitNumber: 17,
    name: 'Magnetism and Electromagnetism',
    slug: 'magnetism-and-electromagnetism',
    topics: 'Domain Theory, Magnetic Field Lines, Field of Straight Conductor & Solenoid, Force on Conductor, Fleming Left-Hand Rule, DC Motor',
    qRange: [23, 26],
    pastPaperCount: 30
  },
  {
    unitNumber: 18,
    name: 'Electromagnetic Induction',
    slug: 'electromagnetic-induction',
    topics: 'Faraday Law, Lenz Law, Fleming Right-Hand Rule, AC Generator, Mutual Induction, Step-Up/Step-Down Transformers & Grid Transmission',
    qRange: [22, 24],
    pastPaperCount: 22
  },
  {
    unitNumber: 19,
    name: 'Electromagnetic Waves and Electronics',
    slug: 'electromagnetic-waves-and-electronics',
    topics: 'Electromagnetic Spectrum, Thermionic Emission, Cathode Ray Oscilloscope (CRO), Analogue & Digital Signals, Logic Gates & Truth Tables',
    qRange: [27, 35],
    pastPaperCount: 22
  },
  {
    unitNumber: 20,
    name: 'Atomic and Nuclear Physics',
    slug: 'atomic-and-nuclear-physics',
    topics: 'Rutherford Nuclear Model, Isotopes, Natural Radioactivity (Alpha, Beta, Gamma), Half-Life, Nuclear Fission & Fusion, Radiation Safety',
    qRange: [36, 40],
    pastPaperCount: 26
  }
];

const CS_CLASS_IX_UNITS: ChapterDef[] = [
  { unitNumber: 1, name: 'The Computer System', slug: 'the-computer-system', topics: 'Natural & Artificial Systems, Von Neumann Architecture, System Bus, Memory, Software, Programming Languages, Data Communication, Networks, Topologies, Packet Switching, Protocols, OSI Model', qRange: [1, 6], pastPaperCount: 65 },
  { unitNumber: 2, name: 'Computational Thinking and Algorithms', slug: 'computational-thinking-and-algorithms', topics: 'Problem Solving Steps, Defining & Analysing Problems, Candid Solutions, Algorithms, Flowcharts & Trace Tables', qRange: [8, 13], pastPaperCount: 12 },
  { unitNumber: 3, name: 'Programming Fundamentals (JavaScript, HTML & CSS)', slug: 'programming-fundamentals', topics: 'WWW, HTML Structure, Text Formatting, Lists, Images, Hyperlinks, Forms, Tables, Inline/Internal CSS, JavaScript Variables, prompt(), Operators', qRange: [14, 22], pastPaperCount: 25 },
  { unitNumber: 4, name: 'Data and Analysis', slug: 'data-and-analysis', topics: 'Scope of Data Science, Data Analysis, Qualitative vs Quantitative Data, 3 Vs of Big Data, Data Visualisation, Big Data in Healthcare, IoT, Manufacturing & Government', qRange: [23, 29], pastPaperCount: 7 },
  { unitNumber: 5, name: 'Applications of Computer Science', slug: 'applications-of-computer-science', topics: 'Artificial Intelligence (AI) in Healthcare, Robotics, Education & Transportation, Machine Learning (Supervised, Unsupervised, Reinforcement), Cloud Computing', qRange: [30, 34], pastPaperCount: 5 },
  { unitNumber: 6, name: 'Impact of Computing', slug: 'impact-of-computing', topics: 'Positive & Negative Impacts of Computing, Computer Security & Malware Vectors, Cyber Security Threats (Brute Force, DoS/DDoS, Phishing) & Two-Step Verification', qRange: [35, 37], pastPaperCount: 3 },
  { unitNumber: 7, name: 'Entrepreneurship in the Digital Age', slug: 'entrepreneurship-in-the-digital-age', topics: 'Role of Entrepreneurs, Market Trends, Idea Generation (SCAMPER), Business Model Canvas (BMC) for Digital Ventures', qRange: [38, 40], pastPaperCount: 3 },
];

const CS_CLASS_X_UNITS: ChapterDef[] = [
  { unitNumber: 8, name: 'Number Systems and Encoding Schemes', slug: 'number-systems-and-encoding-schemes', topics: 'Decimal, Binary & Hexadecimal Conversions, Binary Arithmetic, 1s & 2s Complement, ASCII & Unicode, OS Functions & UI, Interrupts, Buffers & IDE (plus Legacy Logic Gates)', qRange: [32, 34], pastPaperCount: 3 },
  { unitNumber: 9, name: 'Computational Thinking and Algorithm', slug: 'computational-thinking-and-algorithm', topics: 'Conditional, Iterative, Searching (Linear/Binary) & Sorting (Selection/Bubble) Algorithms and Flowcharts', qRange: [1, 6], pastPaperCount: 6 },
  { unitNumber: 10, name: 'Programming in JavaScript', slug: 'programming-in-javascript', topics: 'Syntax vs Semantics, Low-Level & High-Level Languages, Operators, Precedence, if-else & switch Statements, for, while & do-while Loops, 1D Arrays', qRange: [7, 31], pastPaperCount: 25 },
  { unitNumber: 11, name: 'Data and Analysis', slug: 'data-and-analysis-x', topics: 'Artificial Intelligence (AI) Trends, Machine Learning (Supervised/Unsupervised, Fraud Detection), Data Mining, NLP, Big Data Analytics', qRange: [41, 41], pastPaperCount: 0 },
  { unitNumber: 12, name: 'Security, Privacy and Data Integrity', slug: 'security-privacy-and-data-integrity', topics: 'Information Literacy, Digital Citizenship, Copyright, Plagiarism & Piracy, Cyberbullying, Digital Divide (plus Legacy Security Items)', qRange: [39, 39], pastPaperCount: 1 },
  { unitNumber: 13, name: 'Digital Literacy', slug: 'digital-literacy', topics: 'Digital Literacy vs Digital Technology, Digital Artefacts, MS Excel Formulas & Data Validation, Canva, Scratch, MS PowerPoint & MS Word', qRange: [35, 40], pastPaperCount: 5 },
  { unitNumber: 14, name: 'Entrepreneurship in the Digital Age', slug: 'entrepreneurship-in-the-digital-age-x', topics: 'Design Thinking, Business Planning Components, Digital Marketing Strategies, Research Surveys & Questionnaires', qRange: [42, 42], pastPaperCount: 0 },
];

function belongsToUnit(q: any, unit: ChapterDef, isAnnual: boolean): boolean {
  if (Number(q.unitNumber) === unit.unitNumber) return true;
  if (isAnnual) {
    return String(q.current_slo || q.slo || '').startsWith(unit.unitNumber + '.');
  }
  const qNum = Number(q.rawQuestionNumber || q.questionNumber || 0);
  return qNum >= unit.qRange[0] && qNum <= unit.qRange[1];
}

export default function McqsClient({ board, classDef, meta, baseUrl, questions,mappedChapters=[],availableTheorySections=['crqs','erqs','numericals','chapter-notes'],reviewedPapers=[],initialCategory,useReviewedLegacy=false,annualQuestions=past2025,initialChapter }: Props) {
  const isCs = meta.slug === 'computer-science';
  const isChem = meta.slug === 'chemistry';
  const isMath = meta.slug === 'mathematics';
  const isPhysics = !isCs && !isChem && !isMath;
  const currentMappedQuestions = (isMath || isChem) ? mappedChapters.flatMap(chapter => chapter.questions) : [];
  const subjPrefix = isChem ? 'CHM' : isMath ? 'MTH' : isCs ? 'CS' : 'PHY';
  const chemistryUnits: ChapterDef[] = [];
  if (isChem || isMath) {
    const seen = new Set<number>();
    for (const q of (isChem && mappedChapters.length ? currentMappedQuestions : [...questions, ...(annualQuestions || []), ...currentMappedQuestions]) as any[]) {
      const n = Number(q.unitNumber);
      if (!n || seen.has(n)) continue;
      seen.add(n);
      chemistryUnits.push({
        unitNumber: n,
        name: q.unitName || q.chapter || `Unit ${n}`,
        slug: String(q.unitName || q.chapter || `unit-${n}`).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''),
        topics: q.current_mapping?.[0]?.description || q.sloText || '',
        qRange: [0, 0],
        pastPaperCount: 0,
      });
    }
    chemistryUnits.sort((a, b) => a.unitNumber - b.unitNumber);
  }
  const unitsList = isChem || isMath
    ? chemistryUnits
    : questions.length
      ? (isCs ? (classDef.roman === 'IX' ? CS_CLASS_IX_UNITS : CS_CLASS_X_UNITS) : (classDef.roman === 'IX' ? CLASS_IX_UNITS : CLASS_X_UNITS))
      : [];
  const initialUnit = initialChapter
    ? unitsList.find(unit => unit.slug === initialChapter || String(unit.unitNumber) === initialChapter) || null
    : null;

  const router = useRouter();
  const [mappedChapter,setMappedChapter]=useState<string|null>(null);
  // Navigation Track State: 'hub' (Category Directory) | 'practice'
  const [currentView, setCurrentView] = useState<'hub' | 'practice'>(initialUnit ? 'practice' : 'hub');
  const [hubTab] = useState<'chapter_wise' | 'past_papers' | 'full_book' | 'cognitive'>(initialCategory || (questions.length?'chapter_wise':'past_papers'));
  const [selectedUnit, setSelectedUnit] = useState<ChapterDef | null>(initialUnit);
  const [practiceTitle, setPracticeTitle] = useState<string>(initialUnit
    ? `Unit ${initialUnit.unitNumber}: ${initialUnit.name} • Chapter-Wise MCQs (Model + 2024 & 2025 Past Papers)`
    : 'All Questions Practice');

  // Interactive Quiz / Practice States
  const [cognitiveFilter, setCognitiveFilter] = useState<'all' | 'Remembering' | 'Understanding' | 'Application' | 'diagram'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [quizModalOpen, setQuizModalOpen] = useState(false);

  const [practiceSource, setPracticeSource] = useState<'model' | 'annual' | 'annual2024' | 'annual2023' | 'annual2022' | 'annual2019' | 'annual2017' | 'annual_all' | 'chapter_all'>('chapter_all');

  const mappedModelPool = questions.map((q: any) => ({
    ...q,
    paperCode: `${subjPrefix}-${classDef.roman}-P1`,
    sourceTitle: 'Model Paper 1',
    questionNumber: Number(q.questionNumber),
    rawQuestionNumber: Number(q.questionNumber),
    cognitiveLevel: ({ K: 'Remembering', U: 'Understanding', A: 'Application' } as Record<string, string>)[q.cognitiveLevel] || q.cognitiveLevel,
  }));

  const active2025Raw = classDef.roman === 'X' && isPhysics && !annualQuestions?.length ? pastX2025 : annualQuestions;

  const mapped2025Pool = (classDef.roman === 'IX' || classDef.roman === 'X') && active2025Raw.length > 0
    ? active2025Raw.map((q: any) => ({
        ...q,
        ...(isPhysics ? (classDef.roman === 'IX' ? annualOriginalReference(q.questionNumber) : annualX2025OriginalReference(q.questionNumber)) : {}),
        ...(q.answer_review_note ? { answer_review_note: q.answer_review_note } : {}),
        ...(isPhysics && useReviewedLegacy
          ? (classDef.roman === 'IX'
              ? annualCurrentMapping(q.questionNumber, q.stem)
              : annualX2025CurrentMapping(q.questionNumber, q.stem))
          : {}),
        paperCode: `${subjPrefix}-${classDef.roman}-2025-P1`,
        sourceTitle: '2025 · Annual · Paper 1',
        examYear: 2025,
        questionNumber: Number(q.questionNumber),
        rawQuestionNumber: Number(q.questionNumber),
        cognitiveLevel: ({ K: 'Remembering', U: 'Understanding', A: 'Application' } as Record<string, string>)[q.cognitiveLevel] || q.cognitiveLevel,
      }))
    : [];

  const active2024Raw = isCs
    ? (classDef.roman === 'IX' ? csPast2024.filter(q => Number(q.questionNumber) !== 9) : csXPast2024)
    : isChem
      ? (classDef.roman === 'IX' ? chemPast2024 : [])
      : isMath
        ? []
        : (classDef.roman === 'IX' ? past2024 : []);
  const mapped2024Pool = active2024Raw.length > 0
    ? active2024Raw.map((q: any) => ({
        ...q,
        ...(isPhysics && classDef.roman === 'IX' ? annual2024OriginalReference(q.questionNumber) : {}),
        ...(isCs && classDef.roman === 'IX' && csAnnual2024AnswerReviews[Number(q.questionNumber)]
          ? { answer_review_note: csAnnual2024AnswerReviews[Number(q.questionNumber)] }
          : {}),
        ...(isCs && classDef.roman === 'X' && csAnnualX2024AnswerReviews[Number(q.questionNumber)]
          ? { answer_review_note: csAnnualX2024AnswerReviews[Number(q.questionNumber)] }
          : {}),
        ...(isPhysics && classDef.roman === 'IX' && useReviewedLegacy ? annual2024CurrentMapping(q.questionNumber, q.stem) : {}),
        paperCode: `${subjPrefix}-${classDef.roman}-2024-P1`,
        sourceTitle: '2024 · Annual · Paper 1',
        examYear: 2024,
        questionNumber: Number(q.questionNumber),
        rawQuestionNumber: Number(q.questionNumber),
        cognitiveLevel: ({ K: 'Remembering', U: 'Understanding', A: 'Application' } as Record<string, string>)[q.cognitiveLevel] || q.cognitiveLevel,
      }))
    : [];

  const active2023Raw = isCs ? (classDef.roman === 'IX' ? csPast2023.filter(q => Number(q.questionNumber) !== 11) : csXPast2023) : [];
  const mapped2023Pool = isCs && active2023Raw.length > 0
    ? active2023Raw.map((q: any) => ({
        ...q,
        ...(classDef.roman === 'IX' && csAnnual2023AnswerReviews[Number(q.questionNumber)]
          ? { answer_review_note: csAnnual2023AnswerReviews[Number(q.questionNumber)] }
          : {}),
        ...(classDef.roman === 'X' && csAnnualX2023AnswerReviews[Number(q.questionNumber)]
          ? { answer_review_note: csAnnualX2023AnswerReviews[Number(q.questionNumber)] }
          : {}),
        paperCode: `CS-${classDef.roman}-2023-P1`,
        sourceTitle: '2023 · Annual · Paper 1',
        examYear: 2023,
        questionNumber: Number(q.questionNumber),
        rawQuestionNumber: Number(q.questionNumber),
        cognitiveLevel: ({ K: 'Remembering', U: 'Understanding', A: 'Application' } as Record<string, string>)[q.cognitiveLevel] || q.cognitiveLevel,
      }))
    : [];

  const active2022Raw = isCs ? (classDef.roman === 'IX' ? csPast2022 : csXPast2022) : [];
  const mapped2022Pool = isCs && active2022Raw.length > 0
    ? active2022Raw.map((q: any) => ({
        ...q,
        ...(classDef.roman === 'IX' && csAnnual2022AnswerReviews[Number(q.questionNumber)]
          ? { answer_review_note: csAnnual2022AnswerReviews[Number(q.questionNumber)] }
          : {}),
        paperCode: `CS-${classDef.roman}-2022-P1`,
        sourceTitle: '2022 · Annual · Paper 1 (Theory + ATP)',
        examYear: 2022,
        questionNumber: Number(q.questionNumber),
        rawQuestionNumber: Number(q.questionNumber),
        cognitiveLevel: ({ K: 'Remembering', U: 'Understanding', A: 'Application' } as Record<string, string>)[q.cognitiveLevel] || q.cognitiveLevel,
      }))
    : [];

  const active2019Raw = isCs ? (classDef.roman === 'IX' ? csPast2019 : csXPast2019) : [];
  const mapped2019Pool = isCs && active2019Raw.length > 0
    ? active2019Raw.map((q: any) => ({
        ...q,
        ...(classDef.roman === 'X' && csAnnualX2019AnswerReviews[Number(q.questionNumber)]
          ? { answer_review_note: csAnnualX2019AnswerReviews[Number(q.questionNumber)] }
          : {}),
        paperCode: `CS-${classDef.roman}-2019-P1`,
        sourceTitle: '2019 · Annual · Paper 1',
        examYear: 2019,
        questionNumber: Number(q.questionNumber),
        rawQuestionNumber: Number(q.questionNumber),
        cognitiveLevel: ({ K: 'Remembering', U: 'Understanding', A: 'Application' } as Record<string, string>)[q.cognitiveLevel] || q.cognitiveLevel,
      }))
    : [];

  const active2017Raw = isCs ? (classDef.roman === 'IX' ? csPast2017 : csXPast2017) : [];
  const mapped2017Pool = isCs && active2017Raw.length > 0
    ? active2017Raw.map((q: any) => ({
        ...q,
        paperCode: `CS-${classDef.roman}-2017-P1`,
        sourceTitle: '2017 · Annual · Paper 1',
        examYear: 2017,
        questionNumber: Number(q.questionNumber),
        rawQuestionNumber: Number(q.questionNumber),
        cognitiveLevel: ({ K: 'Remembering', U: 'Understanding', A: 'Application' } as Record<string, string>)[q.cognitiveLevel] || q.cognitiveLevel,
      }))
    : [];

  const combinedChapterPool: any[] = [
    ...currentMappedQuestions,
    ...mappedModelPool,
    ...mapped2025Pool.map((q: any) => ({ ...q, questionNumber: 100 + Number(q.rawQuestionNumber) })),
    ...mapped2024Pool.map((q: any) => ({ ...q, questionNumber: 200 + Number(q.rawQuestionNumber) })),
    ...mapped2023Pool.map((q: any) => ({ ...q, questionNumber: 300 + Number(q.rawQuestionNumber) })),
    ...mapped2022Pool.map((q: any) => ({ ...q, questionNumber: 400 + Number(q.rawQuestionNumber) })),
    ...mapped2019Pool.map((q: any) => ({ ...q, questionNumber: 500 + Number(q.rawQuestionNumber) })),
    ...mapped2017Pool.map((q: any) => ({ ...q, questionNumber: 600 + Number(q.rawQuestionNumber) })),
  ].filter(q => !isChem || !mappedChapters.length || currentMappedQuestions.includes(q));

  const combinedAnnualPool: any[] = [
    ...currentMappedQuestions,
    ...mapped2025Pool,
    ...mapped2024Pool.map((q: any) => ({ ...q, questionNumber: 100 + Number(q.rawQuestionNumber) })),
    ...mapped2023Pool.map((q: any) => ({ ...q, questionNumber: 200 + Number(q.rawQuestionNumber) })),
    ...mapped2022Pool.map((q: any) => ({ ...q, questionNumber: 300 + Number(q.rawQuestionNumber) })),
    ...mapped2019Pool.map((q: any) => ({ ...q, questionNumber: 400 + Number(q.rawQuestionNumber) })),
    ...mapped2017Pool.map((q: any) => ({ ...q, questionNumber: 500 + Number(q.rawQuestionNumber) })),
  ].filter(q => !isChem || !mappedChapters.length || currentMappedQuestions.includes(q));

  const fullPapers = [
    ...reviewedPapers.map(paper => ({ title: paper.title, desc: 'Complete original examination paper with reviewed answers and source diagrams.', items: paper.count, time: 'Custom timer', badge: `ANNUAL ${paper.examYear}`, source: 'annual' as const, paperCode: paper.paperCode })),
    ...(questions.length ? [{ title: `${meta.title} Model Paper I`, desc: 'Practice the available model-paper MCQs with answer feedback and 2025 syllabus SLO mappings.', items: questions.length, time: 'Custom timer', badge: 'MODEL PAPER', source: 'model' as const }] : []),
    ...(questions.length && mapped2025Pool.length > 0 && (classDef.roman === 'IX' || classDef.roman === 'X') ? [
      { title: 'Annual Examination 2025 — Paper I', desc: 'Original 2025 examination MCQs with official answer key, cropped diagrams, and reviewed 2025 syllabus mappings.', items: mapped2025Pool.length, time: 'Custom timer', badge: 'ANNUAL 2025', source: 'annual' as const },
    ] : []),
    ...(questions.length && mapped2024Pool.length > 0 && (classDef.roman === 'IX' || classDef.roman === 'X') ? [
      { title: 'Annual Examination 2024 — Paper I', desc: 'Original 2024 examination MCQs with official answer key, cropped diagrams, and 2025 syllabus mappings.', items: mapped2024Pool.length, time: 'Custom timer', badge: 'ANNUAL 2024', source: 'annual2024' as const },
    ] : []),
    ...(questions.length && mapped2023Pool.length > 0 && (classDef.roman === 'IX' || classDef.roman === 'X') ? [
      { title: 'Annual Examination 2023 — Paper I', desc: 'Original 2023 examination MCQs with official answer key, cropped diagrams, and 2025 syllabus mappings.', items: mapped2023Pool.length, time: 'Custom timer', badge: 'ANNUAL 2023', source: 'annual2023' as const },
    ] : []),
    ...(questions.length && mapped2022Pool.length > 0 && (classDef.roman === 'IX' || classDef.roman === 'X') ? [
      { title: 'Annual Examination 2022 — Paper I (Theory + ATP)', desc: 'Original 2022 examination 50 MCQs (40 Theory + 10 Alternate to Practical) with official verification report key, cropped diagrams, and 2025 syllabus mappings.', items: mapped2022Pool.length, time: 'Custom timer', badge: 'ANNUAL 2022', source: 'annual2022' as const },
    ] : []),
    ...(questions.length && mapped2019Pool.length > 0 && (classDef.roman === 'IX' || classDef.roman === 'X') ? [
      { title: 'Annual Examination 2019 — Paper I', desc: 'Original April/May 2019 examination 25 MCQs with official answer key, cropped diagrams, and 2025 syllabus mappings.', items: mapped2019Pool.length, time: 'Custom timer', badge: 'ANNUAL 2019', source: 'annual2019' as const },
    ] : []),
    ...(questions.length && mapped2017Pool.length > 0 && (classDef.roman === 'IX' || classDef.roman === 'X') ? [
      { title: 'Annual Examination 2017 — Paper I', desc: 'Original April/May 2017 examination 25 MCQs with official answer key, cropped diagrams, and 2025 syllabus mappings.', items: mapped2017Pool.length, time: 'Custom timer', badge: 'ANNUAL 2017', source: 'annual2017' as const },
    ] : []),
  ];

  // Filtered Questions for Practice Mode
  const isAnnualSource = practiceSource === 'annual' || practiceSource === 'annual2024' || practiceSource === 'annual2023' || practiceSource === 'annual2022' || practiceSource === 'annual2019' || practiceSource === 'annual2017' || practiceSource === 'annual_all';
  const questionPool = mappedChapter
    ? mappedChapters.find(c => c.id === mappedChapter)?.questions || []
    : practiceSource === 'annual'
    ? mapped2025Pool
    : practiceSource === 'annual2024'
    ? mapped2024Pool
    : practiceSource === 'annual2023'
    ? mapped2023Pool
    : practiceSource === 'annual2022'
    ? mapped2022Pool
    : practiceSource === 'annual2019'
    ? mapped2019Pool
    : practiceSource === 'annual2017'
    ? mapped2017Pool
    : practiceSource === 'annual_all'
    ? combinedAnnualPool
    : practiceSource === 'chapter_all'
    ? combinedChapterPool
    : mappedModelPool;

  const activeQuestions: any[] = questionPool.filter((q: any) => {
    if (selectedUnit) {
      if (!belongsToUnit(q, selectedUnit, isAnnualSource || Boolean(q.examYear))) {
        return false;
      }
    }
    if (searchQuery.trim()) {
      const optsText = Object.values((q.options || q.choices || {}) as Record<string, unknown>).map(String).join(' ');
      const combined = `${q.stem || q.questionText || ''} ${optsText} ${q.explanation || ''} ${q.unitName || q.chapter || ''} ${q.current_slo || q.slo || ''}`;
      if (!smartMatch(combined, searchQuery, q.current_slo || q.slo)) return false;
    }
    if (cognitiveFilter === 'all') return true;
    if (cognitiveFilter === 'diagram') return Boolean(q.diagramBased || q.isDiagram || q.diagramUrl);
    return q.cognitiveLevel === cognitiveFilter;
  });

  // Collapse identical or trivially reworded question stems; keep every paper it came from as a compact source list.
  const displayQuestions: any[] = (() => {
    const stemText = (q: any) => String(q.stem || q.questionText || '');
    const exactKey = (q: any) => stemText(q)
      .toLowerCase()
      .replace(/<[^>]*>/g, ' ')
      .replace(/[^a-z0-9]+/g, ' ')
      .trim();
    const ignoredWords = new Set('a an as at be by for from in is it its of on or the that this to was were with'.split(' '));
    const contentKey = (q: any) => exactKey(q)
      .split(' ')
      .filter(word => word && !ignoredWords.has(word))
      .sort()
      .join(' ');
    // Diagram questions with near-identical wording can still show different images, so only their exact stems merge.
    const hasDiagram = (q: any) => Boolean(q.diagramBased || q.isDiagram || q.diagramUrl || q.diagram);
    const groups: any[][] = [];
    const byExact = new Map<string, any[]>();
    const byContent = new Map<string, any[]>();
    for (const q of activeQuestions) {
      const exact = exactKey(q) || `q-${q.questionNumber}`;
      const content = hasDiagram(q) ? '' : contentKey(q);
      const group = byExact.get(exact) || (content ? byContent.get(content) : undefined);
      if (group) group.push(q);
      else groups.push([q]);
      const target = group || groups[groups.length - 1];
      byExact.set(exact, target);
      if (content) byContent.set(content, target);
    }
    return groups.map((items) => {
      const [rep] = items;
      const seen = new Set<string>();
      const sources: { label: string; qNum: number | string; code?: string }[] = [];
      for (const item of items) {
        const title = String(item.sourceTitle || '');
        const yearMatch = title.match(/\b(19|20)\d{2}\b/);
        const label = /^model/i.test(title) ? 'Model 1' : item.examYear ? String(item.examYear) : yearMatch ? yearMatch[0] : 'Model 1';
        const qNum = item.rawQuestionNumber || item.questionNumber;
        const code = item.paperCode;
        const sourceKey = `${label}|${qNum}|${code || ''}`;
        if (seen.has(sourceKey)) continue;
        seen.add(sourceKey);
        sources.push({ label, qNum, code });
      }
      return { ...rep, __sources: sources };
    });
  })();

  // Stable per-question key so selections survive search and cognitive filtering.
  const questionKey = (q: any) => `${q.paperCode || q.sourcePaperId || 'model'}-${q.rawQuestionNumber || q.questionNumber}`;

  const handleStartChapterPractice = (unit: ChapterDef, isPastPaper = false) => {
    setMappedChapter(null);
    setPracticeSource(isPastPaper ? 'annual_all' : 'chapter_all');
    setSelectedUnit(unit);
    setPracticeTitle(isChem ? `Unit ${unit.unitNumber}: ${unit.name} • Reviewed Chemistry questions` : isPastPaper
      ? `Unit ${unit.unitNumber}: ${unit.name} • Past Examination Archive (2024 & 2025)`
      : `Unit ${unit.unitNumber}: ${unit.name} • Chapter-Wise MCQs (Model + 2024 & 2025 Past Papers)`
    );
    setCognitiveFilter('all');
    setCurrentView('practice');
  };

  useEffect(() => {
    if (initialCategory !== 'chapter_wise' || typeof window === 'undefined') return;
    const unitNumber = Number(new URLSearchParams(window.location.search).get('unit'));
    if (!unitNumber) return;
    const unit = unitsList.find((item) => item.unitNumber === unitNumber);
    if (unit) handleStartChapterPractice(unit, false);
  }, []);

  useEffect(() => {
    if (!initialChapter) return;
    if (!initialUnit) {
      router.replace(`${baseUrl}/mcqs/chapter-wise`);
      return;
    }
    setMappedChapter(null);
    setPracticeSource('chapter_all');
    setSelectedUnit(initialUnit);
    setPracticeTitle(isChem ? `Unit ${initialUnit.unitNumber}: ${initialUnit.name} • Reviewed Chemistry questions` : `Unit ${initialUnit.unitNumber}: ${initialUnit.name} • Chapter-Wise MCQs (Model + 2024 & 2025 Past Papers)`);
    setCognitiveFilter('all');
    setCurrentView('practice');
  }, [initialChapter]);

  const handleStartFullBookPractice = (title: string, source: 'model' | 'annual' | 'annual2024' | 'annual2023' | 'annual2022' | 'annual2019' | 'annual2017' | 'annual_all' | 'chapter_all' = 'model') => {
    setMappedChapter(null);
    setPracticeSource(source);
    setSelectedUnit(null);
    setPracticeTitle(title);
    setCognitiveFilter('all');
    setCurrentView('practice');
  };

  const handleStartCognitiveSprint = (level: 'Remembering' | 'Understanding' | 'Application') => {
    setMappedChapter(null);
    setSelectedUnit(null);
    setPracticeSource('chapter_all');
    setPracticeTitle(`${level} Cognitive Domain Sprint (All ${classDef.name} Papers)`);
    setCognitiveFilter(level);
    setCurrentView('practice');
  };

  const examYears = [...new Set(combinedChapterPool.map((q: any) => Number(q.examYear)).filter(Boolean))].sort((a, b) => b - a);

  const paperEntries: PaperEntry[] = fullPapers.map((paper, index) => ({
    id: `${paper.badge}-${index}`,
    badge: paper.badge,
    meta: `${paper.items} MCQs`,
    title: paper.title,
    description: paper.desc,
    tone: paper.source === 'model' ? 'model' : 'past',
    actions: [
      {
        label: 'Start practice',
        icon: 'play',
        onClick: () => 'paperCode' in paper && paper.paperCode ? router.push('/past-papers/' + paper.paperCode) : handleStartFullBookPractice(paper.title, paper.source),
      },
      {
        label: 'Timed exam',
        icon: 'timer',
        onClick: () => {
          if ('paperCode' in paper && paper.paperCode) { router.push('/past-papers/' + paper.paperCode + '?quiz=1'); return; }
          handleStartFullBookPractice(paper.title, paper.source);
          setQuizModalOpen(true);
        },
      },
    ],
  }));
  const annualPaperEntries = paperEntries.filter(entry => entry.tone === 'past');

  // Build quiz paperCode for TakeQuizModal
  const activeQuizCode = (() => {
    const cogTag = ({ all: 'ALL', Remembering: 'R', Understanding: 'U', Application: 'A', diagram: 'DIAGRAM' } as Record<string, string>)[cognitiveFilter] || 'ALL';
    if (mappedChapter) {
      return `CURRICULUM:${mappedChapter}:${cogTag}`;
    }
    if ((isMath || isChem) && selectedUnit) {
      const currentChapter = mappedChapters.find(chapter => chapter.questions.some(q => q.unitNumber === selectedUnit.unitNumber));
      if (currentChapter) return `CURRICULUM:${currentChapter.id}:${cogTag}`;
    }
    if (selectedUnit && (practiceSource === 'chapter_all' || practiceSource === 'annual_all')) {
      return `${subjPrefix}-${classDef.roman}-UNIT-${selectedUnit.unitNumber}-${practiceSource === 'annual_all' ? 'PAST' : 'ALL'}-${cogTag}`;
    }
    if (!selectedUnit && (practiceSource === 'chapter_all' || practiceSource === 'annual_all')) {
      return `${subjPrefix}-${classDef.roman}-UNIT-0-${practiceSource === 'annual_all' ? 'PAST' : 'ALL'}-${cogTag}`;
    }
    const yearSuffix =
      practiceSource === 'annual' ? '-2025'
      : practiceSource === 'annual2024' ? '-2024'
      : practiceSource === 'annual2023' ? '-2023'
      : practiceSource === 'annual2022' ? '-2022'
      : practiceSource === 'annual2019' ? '-2019'
      : practiceSource === 'annual2017' ? '-2017'
      : '';
    const basePaper = `${subjPrefix}-${classDef.roman}${yearSuffix}-P1`;
    const nums = [...new Set(displayQuestions.map((q: any) => Number(q.rawQuestionNumber || q.questionNumber)))].sort((a: number, b: number) => a - b);
    return `${basePaper}-SET-${nums.join('-')}`;
  })();

  const practiceItems: PracticeItem[] = displayQuestions.map((q, idx) => {
    const rawQNum = q.rawQuestionNumber || q.questionNumber || idx + 1;
    const correctKey = q.correctOption || q.correctAnswer;
    const qMeta = q.sourceRegion || q;
    const mapping = questionSyllabus(qMeta, q.slos, classDef.level, meta.title, board.shortCode, true);
    const isOutOfSyllabus = mapping.status === 'outside' || Boolean(qMeta.out_of_syllabus);
    const cognitiveRaw = String(q.cognitiveLevel || qMeta.cognitive_level || '');
    const cognitiveLabel = cognitiveRaw === 'K' || cognitiveRaw === 'Remembering'
      ? 'K (Knowledge)'
      : cognitiveRaw === 'U' || cognitiveRaw === 'Understanding'
        ? 'U (Understanding)'
        : cognitiveRaw === 'A' || cognitiveRaw === 'Application'
          ? 'A (Application)'
          : cognitiveRaw;
    const diagram = q.diagramBased === false || q.isDiagram === false
      ? null
      : resolveQuestionDiagram(
          q.paperCode || `PHY-${classDef.roman}${practiceSource === 'annual2024' ? '-2024' : practiceSource === 'annual' ? '-2025' : ''}-P1`,
          rawQNum,
          q
        );
    return {
      key: questionKey(q),
      stem: q.stem || q.questionText || '',
      options: q.options || q.choices || {},
      correct: correctKey,
      solution: qMeta.explanation || q.explanation || qMeta.better_response || qMeta.model_answer || (correctKey ? `Answer key: ${correctKey}.` : 'A reviewed answer key is not available for this question.'),
      optionFeedback: qMeta.option_feedback,
      diagram,
      meta: (
        <>
          <QuestionSource question={q} source={mappedChapter ? 'mapped' : (q.examYear || isAnnualSource) ? 'annual' : 'model'} board={board.shortCode} grade={classDef.level} subject={meta.title} sources={q.__sources} hideSlo inline />
          {mapping.status === 'mapped' ? (
            <Link
              scroll={false}
              href={mapping.href!}
              style={{ background: '#ecfdf5', color: '#066e4f', border: '1px solid #a7f3d0', padding: '2px 9px', borderRadius: '5px', fontSize: '0.8rem', fontWeight: 800, textDecoration: 'none' }}
            >
              2025 Syllabus: SLO {mapping.code}
            </Link>
          ) : (
            <span style={{
              background: isOutOfSyllabus ? '#fef2f2' : '#f1f5f9',
              color: isOutOfSyllabus ? '#b91c1c' : '#475569',
              border: isOutOfSyllabus ? '1px solid #fecaca' : '1px solid #e2e8f0',
              padding: '2px 9px',
              borderRadius: '5px',
              fontSize: '0.8rem',
              fontWeight: 800
            }}>
              {isOutOfSyllabus ? 'Out of 2025 Syllabus' : 'SLO mapping pending'}
            </span>
          )}
          {cognitiveLabel && (
            <span style={{ background: '#ffffff', color: '#475569', border: '1px solid #cbd5e1', padding: '2px 8px', borderRadius: '5px', fontSize: '0.76rem', fontWeight: 600 }}>
              Cognitive Level: {cognitiveLabel}
            </span>
          )}
        </>
      ),
    };
  });

  return (
    <div>
      {/* ========================================================================= */}
      {/* VIEW 1: MCQ CATEGORIES DIRECTORY HUB (The requested list of pages)        */}
      {/* ========================================================================= */}
      {currentView === 'hub' ? (
        <HubShell>
          <HubMasthead
            board={board.name}
            classLabel={`${classDef.name} (${classDef.stageLabel})`}
            title={`${meta.title} Multiple Choice Practice Hub`}
            lede="Chapter-by-chapter practice, past board papers, and full-length timed tests."
            stats={[
              { label: 'Units', value: unitsList.length },
              { label: 'MCQs', value: combinedChapterPool.length },
              { label: 'Papers', value: fullPapers.length },
              ...(examYears.length ? [{ label: 'Years', value: examYears.length > 1 ? `${examYears[examYears.length - 1]}–${examYears[0]}` : String(examYears[0]) }] : []),
            ]}
            back={{ href: baseUrl, label: `Back to ${meta.title} subject hub` }}
            primary={combinedChapterPool.length ? {
              label: `Practice all questions (${combinedChapterPool.length})`,
              onClick: () => handleStartFullBookPractice(`${classDef.name} Complete Question Bank (All ${combinedChapterPool.length} Items)`, 'chapter_all'),
            } : undefined}
          />

          <HubRail baseUrl={baseUrl} active={hubTab} theory={availableTheorySections} />

          {hubTab === 'chapter_wise' && (
            <HubSection
              title="Chapter-wise curriculum practice bank"
              note={`Every model and past-paper MCQ filed under the 2025 AKU-EB ${meta.title} syllabus unit it examines, with instant feedback and SLO mappings.`}
            >
              <UnitBrowser
                units={unitsList.map((unit): UnitEntry => {
                  const model = mappedModelPool.filter((q: any) => belongsToUnit(q, unit, false)).length;
                  const past = combinedAnnualPool.filter((q: any) => belongsToUnit(q, unit, true)).length;
                  return {
                    id: `unit-${unit.unitNumber}`,
                    number: unit.unitNumber,
                    title: unit.name,
                    topics: unit.topics,
                    total: model + past,
                    breakdown: [
                      { label: 'model', value: model, tone: 'model' },
                      { label: 'past-paper', value: past, tone: 'past' },
                    ],
                    action: { label: `Practice unit ${unit.unitNumber}`, href: `${baseUrl}/mcqs/chapter-wise/${unit.slug}`, icon: 'arrow' },
                    secondary: past > 0 ? { label: 'Past papers only', onClick: () => handleStartChapterPractice(unit, true), icon: 'paper' } : undefined,
                    emptyAction: { label: 'Learning outcomes', href: `${baseUrl}/syllabus#unit-${unit.unitNumber}`, icon: 'book' },
                  };
                })}
              />
            </HubSection>
          )}

          {hubTab === 'past_papers' && (
            <>
              {mappedChapters.length > 0 ? (
                <HubSection title="Current syllabus chapters" note="Past board MCQs regrouped under the reviewed 2025 syllabus chapters.">
                  <UnitBrowser
                    units={mappedChapters.map((chapter, index): UnitEntry => ({
                      id: chapter.id,
                      number: index + 1,
                      title: chapter.name,
                      topics: '',
                      total: chapter.questions.length,
                      badge: `Chapter ${index + 1}`,
                      countLabel: 'past MCQs',
                      action: {
                        label: 'Solve past-paper MCQs',
                        icon: 'play',
                        onClick: () => {
                          setMappedChapter(chapter.id);
                          setSelectedUnit(null);
                          setPracticeTitle(chapter.name);
                          setCognitiveFilter('all');
                          setCurrentView('practice');
                        },
                      },
                    }))}
                  />
                </HubSection>
              ) : combinedAnnualPool.length > 0 ? (
                <HubSection title="Past-paper MCQs by unit" note="Original annual-examination MCQs with the official keys, grouped by their reviewed 2025 syllabus mappings.">
                  <UnitBrowser
                    noun="past MCQs"
                    units={unitsList.map((unit): UnitEntry => {
                      const items = combinedAnnualPool.filter((q: any) => belongsToUnit(q, unit, true));
                      const years = [...new Set(items.map((q: any) => q.examYear).filter(Boolean))].sort((a, b) => b - a);
                      return {
                        id: `past-${unit.unitNumber}`,
                        number: unit.unitNumber,
                        title: unit.name,
                        topics: years.length ? `From the ${years.join(', ')} annual papers` : unit.topics,
                        total: items.length,
                        action: { label: 'Solve past-paper MCQs', onClick: () => handleStartChapterPractice(unit, true), icon: 'play' },
                        emptyNote: 'No past-paper MCQ maps to this unit yet',
                        emptyAction: { label: 'Model questions', href: `${baseUrl}/mcqs/chapter-wise/${unit.slug}`, icon: 'arrow' },
                      };
                    })}
                  />
                </HubSection>
              ) : (
                <HubEmpty
                  title="No past-paper MCQs archived yet"
                  body="Annual MCQs for this class have not been added. Chapter-wise model questions are available now."
                  action={{ label: 'Chapter-wise MCQs', href: `${baseUrl}/mcqs/chapter-wise`, icon: 'arrow' }}
                />
              )}
              {annualPaperEntries.length > 0 && (
                <HubSection title="Papers by year" note="Sit a whole annual Paper I as practice or as a timed exam.">
                  <PaperGrid papers={annualPaperEntries} />
                </HubSection>
              )}
            </>
          )}

          {hubTab === 'full_book' && (
            <HubSection title="Full papers & timed tests" note="Choose a complete model or annual paper to practise, or sit it as a timed exam.">
              {paperEntries.length ? (
                <PaperGrid papers={paperEntries} />
              ) : (
                <HubEmpty title="No full papers yet" body="Complete papers for this class have not been added. Chapter-wise practice is available now." />
              )}
            </HubSection>
          )}

          {hubTab === 'cognitive' && (
            <HubSection title="Practice by cognitive level" note="AKU-EB papers split marks across knowledge, understanding and application. Drill one level across the whole syllabus.">
              <TierGrid
                tiers={([
                  { level: 'Remembering', code: 'K', tone: 'recall', title: 'Knowledge & definitions drill', note: 'Recall of terms, units, definitions and direct facts.' },
                  { level: 'Understanding', code: 'U', tone: 'understanding', title: 'Conceptual reasoning practice', note: 'Explaining, comparing and interpreting ideas in short scenarios.' },
                  { level: 'Application', code: 'A', tone: 'application', title: 'Problem solving & application', note: 'Using rules, formulas and procedures in unfamiliar situations.' },
                ] as const).map((tier): TierEntry => ({
                  id: tier.level,
                  code: tier.code,
                  label: tier.level,
                  title: tier.title,
                  note: tier.note,
                  tone: tier.tone,
                  count: combinedChapterPool.filter((q: any) => q.cognitiveLevel === tier.level).length,
                  action: { label: `Start ${tier.level.toLowerCase()} drill`, onClick: () => handleStartCognitiveSprint(tier.level), icon: 'play' },
                }))}
              />
            </HubSection>
          )}
        </HubShell>
      ) : (
        <McqPracticeSheet
          key={`${practiceTitle}|${practiceSource}|${mappedChapter || ''}|${selectedUnit?.unitNumber || ''}`}
          title={practiceTitle}
          items={practiceItems}
          onBack={() => {
            if (initialChapter) router.push(`${baseUrl}/mcqs/chapter-wise`);
            else setCurrentView('hub');
          }}
          boardName={board.fullName}
          certificate={`SECONDARY SCHOOL CERTIFICATE · ${classDef.name}`}
          paperLine={`${meta.title} · Paper I (Multiple Choice Questions)`}
          filter={cognitiveFilter}
          onFilter={setCognitiveFilter}
          search={searchQuery}
          onSearch={setSearchQuery}
          onTakeQuiz={() => setQuizModalOpen(true)}
        />
      )}

      {/* Interactive Timed Quiz Modal */}
      <TakeQuizModal
        isOpen={quizModalOpen}
        onClose={() => setQuizModalOpen(false)}
        paperTitle={practiceTitle}
        paperCode={activeQuizCode}
        questions={displayQuestions}
      />
    </div>
  );
}
