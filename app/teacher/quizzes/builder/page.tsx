'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { 
  Plus, Trash2, Copy, ArrowUp, ArrowDown, Settings, Eye, 
  Sparkles, Database, Upload, Check, AlertCircle, ArrowLeft, 
  HelpCircle, Calculator, CheckCircle2,
  FileText, ShieldAlert, Clock, CheckSquare, Radio, GripVertical,
  X, SlidersHorizontal, Layers, Award, Lightbulb, ChevronDown
} from 'lucide-react';
import MathText from '@/components/MathText';
import RichMathChemDiagramEditor from '@/components/RichMathChemDiagramEditor';
import './builder.css';

export interface QuestionOption {
  id: string;
  text: string;
  isCorrect: boolean;
}

export interface MatchingPair {
  id?: string;
  left: string;
  right: string;
}

export interface QuizQuestionData {
  id: string;
  orderIndex: number;
  questionType: 'MCQ_SINGLE' | 'MCQ_MULTIPLE' | 'TRUE_FALSE' | 'SHORT_ANSWER' | 'NUMERICAL' | 'MATCHING' | 'LONG_ANSWER';
  stemText: string;
  difficulty: 'Easy' | 'Medium' | 'Hard' | 'Custom';
  customDifficultyDesc?: string;
  cognitiveLevel: 'Knowledge' | 'Understanding' | 'Application';
  marks: number;
  isRequired: boolean;
  provenance: 'TEACHER_CREATED' | 'QUESTION_BANK' | 'AI_GENERATED' | 'IMPORTED' | 'PAST_PAPER';
  pastPaperRef?: string;
  options: QuestionOption[];
  correctAnswerText?: string;
  acceptedAnswers?: string[];
  numericalTolerance?: number;
  unit?: string;
  matchingPairs?: MatchingPair[];
  rubric?: string;
  explanation?: string;
  drawingSvg?: string;
}

export interface QuizSettings {
  maxAttempts: number;
  allowRetries: boolean;
  randomizeQuestions: boolean;
  randomizeOptions: boolean;
  immediateFeedback: boolean;
  showCorrectAnswers: boolean;
  resultVisibility: 'IMMEDIATE' | 'AFTER_DEADLINE' | 'MANUAL';
  manualGradingRequired: boolean;
  aiGradingMode: 'LENIENT' | 'MEDIUM' | 'STRICT' | 'CUSTOM';
  tabMonitoringEnabled: boolean;
  tabWarningThreshold: number;
}

const QUESTION_TYPES = [
  { id: 'MCQ_SINGLE', label: 'Multiple choice', icon: Radio, desc: 'Single correct answer' },
  { id: 'MCQ_MULTIPLE', label: 'Checkboxes', icon: CheckSquare, desc: 'Multiple correct answers' },
  { id: 'TRUE_FALSE', label: 'True / False', icon: CheckCircle2, desc: 'Binary choice' },
  { id: 'NUMERICAL', label: 'Numerical problem', icon: Calculator, desc: 'Calculated value with tolerance' },
  { id: 'SHORT_ANSWER', label: 'Short answer', icon: FileText, desc: 'Single line text' },
  { id: 'MATCHING', label: 'Matching pairs', icon: Layers, desc: 'Column A to Column B' },
  { id: 'LONG_ANSWER', label: 'Paragraph / Essay', icon: FileText, desc: 'Extended written response' }
];

const QUICK_MATH_SYMBOLS = [
  { label: 'x²', insert: '$x^2$' },
  { label: 'x₁', insert: '$x_1$' },
  { label: '√x', insert: '$\\sqrt{x}$' },
  { label: 'a/b', insert: '$\\frac{a}{b}$' },
  { label: '±', insert: '$\\pm$' },
  { label: 'π', insert: '$\\pi$' },
  { label: 'θ', insert: '$\\theta$' },
  { label: 'Δ', insert: '$\\Delta$' },
  { label: '→', insert: '$\\rightarrow$' },
  { label: 'm/s²', insert: '$\\text{m/s}^2$' },
  { label: 'Ω', insert: '$\\Omega$' }
];

function GoogleFormsQuizBuilderContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const editQuizId = searchParams ? searchParams.get('id') : null;

  // Active Tab
  const [activeTab, setActiveTab] = useState<'questions' | 'settings'>('questions');

  // Quiz Meta State
  const [quizId, setQuizId] = useState<string | null>(editQuizId);
  const [title, setTitle] = useState('Physics Mid-Term Examination 2026');
  const [description, setDescription] = useState('Official curriculum assessment aligned with AKU-EB Student Learning Objectives (SLOs). Answer all questions.');
  const [boardId, setBoardId] = useState('AKU-EB');
  const [classLevel, setClassLevel] = useState(9);
  const [subject, setSubject] = useState('Physics');
  const [durationMin, setDurationMin] = useState(45);
  const [visibility, setVisibility] = useState<'PUBLIC' | 'UNLISTED' | 'PRIVATE'>('PUBLIC');
  const [status, setStatus] = useState<'DRAFT' | 'PUBLISHED'>('DRAFT');

  // Quiz Settings State
  const [settings, setSettings] = useState<QuizSettings>({
    maxAttempts: 1,
    allowRetries: false,
    randomizeQuestions: false,
    randomizeOptions: false,
    immediateFeedback: true,
    showCorrectAnswers: true,
    resultVisibility: 'IMMEDIATE',
    manualGradingRequired: false,
    aiGradingMode: 'MEDIUM',
    tabMonitoringEnabled: true,
    tabWarningThreshold: 2
  });

  // Questions State
  const [questions, setQuestions] = useState<QuizQuestionData[]>([
    {
      id: 'q-init-1',
      orderIndex: 1,
      questionType: 'MCQ_SINGLE',
      stemText: 'Which of the following is a derived physical quantity in SI units?',
      difficulty: 'Easy',
      cognitiveLevel: 'Knowledge',
      marks: 1,
      isRequired: true,
      provenance: 'PAST_PAPER',
      pastPaperRef: 'AKU-EB 2025 Paper 1 Q1',
      options: [
        { id: 'opt-1', text: 'Mass ($m$)', isCorrect: false },
        { id: 'opt-2', text: 'Length ($l$)', isCorrect: false },
        { id: 'opt-3', text: 'Density ($\\rho = \\frac{m}{V}$)', isCorrect: true },
        { id: 'opt-4', text: 'Time ($t$)', isCorrect: false }
      ],
      explanation: 'Density is defined as mass per unit volume ($\\rho = \\frac{m}{V}$), derived from the base SI units kilograms (kg) and cubic meters ($m^3$).'
    },
    {
      id: 'q-init-2',
      orderIndex: 2,
      questionType: 'NUMERICAL',
      stemText: 'A car accelerates uniformly from rest at a rate of $2.5\\text{ m/s}^2$ for $8\\text{ s}$. Calculate the distance traveled by the car in meters.',
      difficulty: 'Medium',
      cognitiveLevel: 'Application',
      marks: 2,
      isRequired: true,
      provenance: 'TEACHER_CREATED',
      options: [],
      correctAnswerText: '80',
      numericalTolerance: 1.0,
      unit: 'm',
      explanation: 'Using the second equation of motion: $S = v_i t + \\frac{1}{2} a t^2$. Since $v_i = 0$, $S = \\frac{1}{2} (2.5)(8)^2 = 0.5 \\times 2.5 \\times 64 = 80\\text{ meters}$.'
    }
  ]);

  const [activeQuestionIndex, setActiveQuestionIndex] = useState<number>(0);
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'unsaved' | 'error'>('saved');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Answer Key Drawer toggle per question
  const [openAnswerKeys, setOpenAnswerKeys] = useState<Record<string, boolean>>({});

  // Modals
  const [isBankModalOpen, setIsBankModalOpen] = useState(false);
  const [isAiModalOpen, setIsAiModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);

  // Rich Math / Chem / Diagram Editor State
  const [richEditorState, setRichEditorState] = useState<{
    isOpen: boolean;
    questionIndex: number;
    optionIndex: number | null;
    fieldName: 'stemText' | 'option' | 'explanation' | 'rubric';
    initialContent: string;
    label: string;
  }>({
    isOpen: false,
    questionIndex: 0,
    optionIndex: null,
    fieldName: 'stemText',
    initialContent: '',
    label: ''
  });

  // Load existing quiz if edit mode
  useEffect(() => {
    if (editQuizId) {
      loadQuiz(editQuizId);
    }
  }, [editQuizId]);

  async function loadQuiz(id: string) {
    try {
      setSaveStatus('saving');
      const res = await fetch(`/api/quizzes/${id}?mode=edit`);
      const data = await res.json();
      if (data.success && data.quiz) {
        const q = data.quiz;
        setQuizId(q.id);
        setTitle(q.title || 'Untitled Assessment');
        setDescription(q.description || '');
        setBoardId(q.boardId || 'AKU-EB');
        setDurationMin(q.durationMin || 45);
        setVisibility(q.visibility || 'PUBLIC');
        setStatus(q.status || 'DRAFT');
        if (q.settings) {
          setSettings(prev => ({ ...prev, ...q.settings }));
        }
        if (Array.isArray(q.questions) && q.questions.length > 0) {
          setQuestions(q.questions.map((item: any, idx: number) => ({
            id: item.id || `q-${idx}`,
            orderIndex: idx + 1,
            questionType: item.questionType || 'MCQ_SINGLE',
            stemText: item.stemText || '',
            difficulty: item.difficulty || 'Medium',
            customDifficultyDesc: item.customDifficultyDesc || '',
            cognitiveLevel: item.cognitiveLevel || 'Understanding',
            marks: item.marks || 1,
            isRequired: item.isRequired ?? true,
            provenance: item.provenance || 'TEACHER_CREATED',
            pastPaperRef: item.pastPaperRef || '',
            options: Array.isArray(item.options) ? item.options : [
              { id: 'opt-1', text: 'Option A', isCorrect: true },
              { id: 'opt-2', text: 'Option B', isCorrect: false }
            ],
            correctAnswerText: item.correctAnswerText || '',
            acceptedAnswers: item.acceptedAnswers || [],
            numericalTolerance: item.numericalTolerance ?? 0.05,
            unit: item.unit || '',
            matchingPairs: item.matchingPairs || [],
            rubric: item.rubric || '',
            explanation: item.explanation || '',
            drawingSvg: item.drawingSvg || ''
          })));
        }
        setSaveStatus('saved');
      }
    } catch (err) {
      console.error('Failed to load quiz:', err);
      setSaveStatus('error');
    }
  }

  // Calculate total points
  const totalPoints = questions.reduce((sum, q) => sum + (Number(q.marks) || 1), 0);

  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const markUnsaved = () => {
    setSaveStatus('unsaved');
  };

  // Save Quiz
  const handleSaveQuiz = async (publish = false) => {
    try {
      setSaveStatus('saving');
      const targetStatus = publish ? 'PUBLISHED' : status;

      const payload = {
        id: quizId,
        title: title.trim() || 'Untitled Assessment',
        description,
        boardId,
        classLevel,
        subject,
        durationMin,
        visibility,
        status: targetStatus,
        settings,
        questions
      };

      const res = await fetch('/api/quizzes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (data.success) {
        setQuizId(data.quizId);
        if (publish) setStatus('PUBLISHED');
        setSaveStatus('saved');
        triggerToast(publish ? 'Assessment published successfully!' : 'All changes saved to cloud.');
      } else {
        setSaveStatus('error');
        triggerToast(`Save error: ${data.error || 'Server error'}`);
      }
    } catch (err: any) {
      console.error('Save error:', err);
      setSaveStatus('error');
      triggerToast('Error saving assessment to database.');
    }
  };

  // Question operations
  const addQuestion = (type: QuizQuestionData['questionType'] = 'MCQ_SINGLE', insertAfterIdx?: number) => {
    const newQ: QuizQuestionData = {
      id: `q-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      orderIndex: questions.length + 1,
      questionType: type,
      stemText: '',
      difficulty: 'Medium',
      cognitiveLevel: 'Understanding',
      marks: type === 'LONG_ANSWER' ? 4 : (type === 'NUMERICAL' ? 2 : 1),
      isRequired: true,
      provenance: 'TEACHER_CREATED',
      options: type === 'TRUE_FALSE' ? [
        { id: `opt-${Date.now()}-1`, text: 'True', isCorrect: true },
        { id: `opt-${Date.now()}-2`, text: 'False', isCorrect: false }
      ] : (type === 'NUMERICAL' || type === 'SHORT_ANSWER' || type === 'MATCHING' || type === 'LONG_ANSWER') ? [] : [
        { id: `opt-${Date.now()}-1`, text: 'Option 1', isCorrect: true },
        { id: `opt-${Date.now()}-2`, text: 'Option 2', isCorrect: false },
        { id: `opt-${Date.now()}-3`, text: 'Option 3', isCorrect: false },
        { id: `opt-${Date.now()}-4`, text: 'Option 4', isCorrect: false }
      ],
      matchingPairs: type === 'MATCHING' ? [
        { id: 'pair-1', left: 'Column A Item 1', right: 'Column B Match 1' },
        { id: 'pair-2', left: 'Column A Item 2', right: 'Column B Match 2' },
        { id: 'pair-3', left: 'Column A Item 3', right: 'Column B Match 3' }
      ] : [],
      explanation: ''
    };

    let nextList = [...questions];
    const targetIdx = insertAfterIdx !== undefined ? insertAfterIdx + 1 : nextList.length;
    nextList.splice(targetIdx, 0, newQ);
    nextList = nextList.map((q, i) => ({ ...q, orderIndex: i + 1 }));

    setQuestions(nextList);
    setActiveQuestionIndex(targetIdx);
    markUnsaved();
    triggerToast(`Added question ${targetIdx + 1}`);
  };

  const duplicateQuestion = (idx: number) => {
    const source = questions[idx];
    const dup: QuizQuestionData = {
      ...JSON.parse(JSON.stringify(source)),
      id: `q-dup-${Date.now()}-${Math.random().toString(36).substr(2, 3)}`,
      orderIndex: idx + 2
    };
    const nextList = [...questions];
    nextList.splice(idx + 1, 0, dup);
    const reindexed = nextList.map((q, i) => ({ ...q, orderIndex: i + 1 }));
    setQuestions(reindexed);
    setActiveQuestionIndex(idx + 1);
    markUnsaved();
    triggerToast(`Question duplicated`);
  };

  const deleteQuestion = (idx: number) => {
    if (questions.length <= 1) {
      triggerToast('An assessment requires at least 1 question.');
      return;
    }
    const nextList = questions.filter((_, i) => i !== idx).map((q, i) => ({ ...q, orderIndex: i + 1 }));
    setQuestions(nextList);
    setActiveQuestionIndex(Math.max(0, idx - 1));
    markUnsaved();
    triggerToast(`Question deleted`);
  };

  const moveQuestion = (idx: number, direction: 'up' | 'down') => {
    if ((direction === 'up' && idx === 0) || (direction === 'down' && idx === questions.length - 1)) return;
    const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
    const nextList = [...questions];
    const temp = nextList[idx];
    nextList[idx] = nextList[targetIdx];
    nextList[targetIdx] = temp;
    const reindexed = nextList.map((q, i) => ({ ...q, orderIndex: i + 1 }));
    setQuestions(reindexed);
    setActiveQuestionIndex(targetIdx);
    markUnsaved();
  };

  const updateQuestion = (idx: number, patch: Partial<QuizQuestionData>) => {
    setQuestions(prev => {
      const next = [...prev];
      next[idx] = { ...next[idx], ...patch };
      return next;
    });
    markUnsaved();
  };

  // Options operations
  const addOption = (qIdx: number) => {
    const q = questions[qIdx];
    const optNum = q.options.length + 1;
    const newOpt: QuestionOption = {
      id: `opt-${Date.now()}-${optNum}`,
      text: `Option ${optNum}`,
      isCorrect: false
    };
    updateQuestion(qIdx, { options: [...q.options, newOpt] });
  };

  const removeOption = (qIdx: number, optIdx: number) => {
    const q = questions[qIdx];
    if (q.options.length <= 2) {
      triggerToast('Multiple choice questions require at least two options.');
      return;
    }
    const newOptions = q.options.filter((_, i) => i !== optIdx);
    if (!newOptions.some(o => o.isCorrect)) {
      newOptions[0].isCorrect = true;
    }
    updateQuestion(qIdx, { options: newOptions });
  };

  const toggleCorrectOption = (qIdx: number, optIdx: number, isMulti: boolean) => {
    const q = questions[qIdx];
    let newOptions: QuestionOption[];
    if (isMulti) {
      newOptions = q.options.map((opt, i) => i === optIdx ? { ...opt, isCorrect: !opt.isCorrect } : opt);
      if (!newOptions.some(o => o.isCorrect)) newOptions[optIdx].isCorrect = true;
    } else {
      newOptions = q.options.map((opt, i) => ({ ...opt, isCorrect: i === optIdx }));
    }
    updateQuestion(qIdx, { options: newOptions });
  };

  // Matching operations
  const addMatchingPair = (qIdx: number) => {
    const q = questions[qIdx];
    const pairs = q.matchingPairs || [];
    const newPairs = [...pairs, { id: `p-${Date.now()}`, left: `Item ${pairs.length + 1}`, right: `Match ${pairs.length + 1}` }];
    updateQuestion(qIdx, { matchingPairs: newPairs });
  };

  const removeMatchingPair = (qIdx: number, pairIdx: number) => {
    const q = questions[qIdx];
    const pairs = q.matchingPairs || [];
    if (pairs.length <= 2) {
      triggerToast('Matching questions require at least 2 pairs.');
      return;
    }
    updateQuestion(qIdx, { matchingPairs: pairs.filter((_, i) => i !== pairIdx) });
  };

  // Rich editor modal helper
  const openRichEditor = (
    qIdx: number,
    fieldName: 'stemText' | 'option' | 'explanation' | 'rubric', 
    optIdx: number | null = null
  ) => {
    const q = questions[qIdx];
    if (!q) return;
    let initial = '';
    let label = '';
    if (fieldName === 'stemText') {
      initial = q.stemText;
      label = `Question ${qIdx + 1} Statement`;
    } else if (fieldName === 'option' && optIdx !== null) {
      initial = q.options[optIdx]?.text || '';
      label = `Question ${qIdx + 1} Option ${String.fromCharCode(65 + optIdx)}`;
    } else if (fieldName === 'explanation') {
      initial = q.explanation || '';
      label = `Question ${qIdx + 1} Explanation`;
    } else if (fieldName === 'rubric') {
      initial = q.rubric || '';
      label = `Question ${qIdx + 1} Rubric`;
    }

    setRichEditorState({
      isOpen: true,
      questionIndex: qIdx,
      optionIndex: optIdx,
      fieldName,
      initialContent: initial,
      label
    });
  };

  const handleRichEditorInsert = (content: string, type: 'latex' | 'chem' | 'drawing' | 'diagram') => {
    const { questionIndex, optionIndex, fieldName } = richEditorState;
    const q = questions[questionIndex];
    if (!q) return;

    let insertion = content;
    if (type === 'latex' || type === 'chem') {
      insertion = `$${content}$`;
    } else if (type === 'drawing' || type === 'diagram') {
      updateQuestion(questionIndex, { drawingSvg: content });
      return;
    }

    if (fieldName === 'stemText') {
      updateQuestion(questionIndex, { stemText: (q.stemText ? q.stemText + ' ' : '') + insertion });
    } else if (fieldName === 'option' && optionIndex !== null) {
      const nextOpts = [...q.options];
      nextOpts[optionIndex].text = (nextOpts[optionIndex].text ? nextOpts[optionIndex].text + ' ' : '') + insertion;
      updateQuestion(questionIndex, { options: nextOpts });
    } else if (fieldName === 'explanation') {
      updateQuestion(questionIndex, { explanation: (q.explanation ? q.explanation + ' ' : '') + insertion });
    } else if (fieldName === 'rubric') {
      updateQuestion(questionIndex, { rubric: (q.rubric ? q.rubric + ' ' : '') + insertion });
    }
  };

  return (
    <div className="gf-page">
      
      {/* 1. GOOGLE FORMS TOP BAR */}
      <header className="gf-navbar">
        {/* Left: Brand Icon & Title Input */}
        <div className="gf-nav-left">
          <Link
            href="/dashboard/teacher"
            className="gf-back-btn"
            title="Return to Teacher Dashboard"
          >
            <ArrowLeft size={20} />
          </Link>

          <div className="gf-form-icon" title="Assessment Form">
            📋
          </div>

          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <input
                type="text"
                value={title}
                onChange={(e) => { setTitle(e.target.value); markUnsaved(); }}
                className="gf-title-header-input"
                placeholder="Untitled form"
              />
              <span style={{ 
                fontSize: '11px', 
                fontWeight: 700, 
                padding: '2px 8px', 
                borderRadius: '12px',
                background: status === 'PUBLISHED' ? '#e6f4ea' : '#fef7e0',
                color: status === 'PUBLISHED' ? '#137333' : '#b06000'
              }}>
                {status}
              </span>
            </div>
            
            <div className="gf-save-badge">
              {saveStatus === 'saved' && <><Check size={14} color="#137333" /> All changes saved in cloud</>}
              {saveStatus === 'saving' && <>Saving changes...</>}
              {saveStatus === 'unsaved' && <>Unsaved changes</>}
              {saveStatus === 'error' && <><AlertCircle size={14} color="#d93025" /> Save failed</>}
            </div>
          </div>
        </div>

        {/* Center Tabs (Google Forms Signature Navigation) */}
        <div className="gf-nav-tabs">
          <button 
            type="button"
            onClick={() => setActiveTab('questions')}
            className={`gf-tab-btn ${activeTab === 'questions' ? 'active' : ''}`}
          >
            Questions
          </button>
          <button 
            type="button"
            onClick={() => setActiveTab('settings')}
            className={`gf-tab-btn ${activeTab === 'settings' ? 'active' : ''}`}
          >
            Settings
          </button>
        </div>

        {/* Right Action Buttons */}
        <div className="gf-nav-right">
          <button
            type="button"
            onClick={() => setIsPreviewModalOpen(true)}
            className="gf-icon-btn"
            title="Preview student experience"
          >
            <Eye size={20} />
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('settings')}
            className="gf-icon-btn"
            title="Settings & Anti-Cheating"
          >
            <Settings size={20} />
          </button>

          <button
            type="button"
            onClick={() => handleSaveQuiz(false)}
            disabled={saveStatus === 'saving'}
            className="gf-draft-btn"
          >
            Save Draft
          </button>

          <button
            type="button"
            onClick={() => handleSaveQuiz(true)}
            disabled={saveStatus === 'saving'}
            className="gf-publish-btn"
          >
            <CheckCircle2 size={16} />
            <span>Publish</span>
          </button>
        </div>
      </header>

      {/* 2. GOOGLE FORMS MAIN WORKSPACE CANVAS */}
      <div className="gf-main-container">
        
        {/* Floating Toast Notification */}
        {toastMessage && (
          <div className="gf-toast">
            <CheckCircle2 size={16} color="#81c995" />
            <span>{toastMessage}</span>
          </div>
        )}

        {/* TAB 1: QUESTIONS EDITOR */}
        {activeTab === 'questions' && (
          <>
            {/* GOOGLE FORMS TITLE CARD (With signature thick purple stripe) */}
            <div className="gf-title-card">
              <input
                type="text"
                value={title}
                onChange={(e) => { setTitle(e.target.value); markUnsaved(); }}
                placeholder="Form title"
                className="gf-main-title-input"
              />

              <textarea
                value={description}
                onChange={(e) => { setDescription(e.target.value); markUnsaved(); }}
                rows={2}
                placeholder="Form description / Student examination instructions..."
                className="gf-desc-input"
              />

              <div className="gf-meta-bar">
                <div className="gf-chips-group">
                  <span className="gf-chip">
                    {boardId} • Class {classLevel} • {subject}
                  </span>
                  <span className="gf-chip gf-chip-amber">
                    <Clock size={14} />
                    <span>{durationMin} mins</span>
                  </span>
                  <span className="gf-chip gf-chip-green">
                    {totalPoints} Total Points
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => setActiveTab('settings')}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#673ab7',
                    fontSize: '13px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}
                >
                  <SlidersHorizontal size={14} />
                  <span>Configure Settings</span>
                </button>
              </div>
            </div>

            {/* QUESTIONS LIST */}
            {questions.map((q, qIdx) => {
              const isActive = activeQuestionIndex === qIdx;
              const isAnswerKeyOpen = openAnswerKeys[q.id] || false;
              const currentTypeObj = QUESTION_TYPES.find(t => t.id === q.questionType) || QUESTION_TYPES[0];

              return (
                <div
                  key={q.id}
                  onClick={() => setActiveQuestionIndex(qIdx)}
                  className={`gf-question-card ${isActive ? 'active' : ''}`}
                >
                  {/* Top Drag Handle (6 dots) */}
                  <div className="gf-drag-handle" title="Drag to reorder">
                    <GripVertical size={16} style={{ transform: 'rotate(90deg)' }} />
                  </div>

                  {/* Question Stem & Question Type Dropdown Row */}
                  <div className="gf-q-header-row">
                    <div className="gf-stem-wrapper">
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span style={{ fontSize: '12px', fontWeight: 700, color: '#5f6368', textTransform: 'uppercase' }}>
                          Question {qIdx + 1}
                        </span>

                        {/* Open Rich Formula Editor */}
                        {isActive && (
                          <button
                            type="button"
                            onClick={() => openRichEditor(qIdx, 'stemText')}
                            style={{
                              background: '#ede7f6',
                              border: '1px solid #d1c4e9',
                              color: '#512da8',
                              borderRadius: '4px',
                              padding: '2px 8px',
                              fontSize: '12px',
                              fontWeight: 600,
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px'
                            }}
                            title="Open Math / Chem / Diagram Studio"
                          >
                            <Calculator size={13} />
                            <span>Math / Chem / Diagram</span>
                          </button>
                        )}
                      </div>

                      {/* Stem Textarea */}
                      <textarea
                        value={q.stemText}
                        onChange={(e) => updateQuestion(qIdx, { stemText: e.target.value })}
                        rows={isActive ? 2 : 1}
                        placeholder="Question statement (Use $...$ for math equations)"
                        className="gf-stem-input"
                      />

                      {/* Quick Math Ribbon */}
                      {isActive && (
                        <div className="gf-math-ribbon">
                          <span className="gf-math-ribbon-label">Quick Math:</span>
                          {QUICK_MATH_SYMBOLS.map((sym, sIdx) => (
                            <button
                              key={sIdx}
                              type="button"
                              onClick={() => {
                                const updated = (q.stemText ? q.stemText + ' ' : '') + sym.insert;
                                updateQuestion(qIdx, { stemText: updated });
                              }}
                              className="gf-math-btn"
                              title={`Insert ${sym.label}`}
                            >
                              {sym.label}
                            </button>
                          ))}
                        </div>
                      )}

                      {/* Live LaTeX preview */}
                      {q.stemText && (q.stemText.includes('$') || q.stemText.includes('\\')) && (
                        <div className="gf-katex-preview-box">
                          <span style={{ fontSize: '10px', fontWeight: 700, color: '#673ab7', textTransform: 'uppercase', display: 'block', marginBottom: '2px' }}>
                            Live Math Preview:
                          </span>
                          <MathText text={q.stemText} />
                        </div>
                      )}

                      {/* Attached Visual Diagram preview */}
                      {q.drawingSvg && (
                        <div style={{
                          padding: '12px',
                          background: '#f8f9fa',
                          border: '1px solid #dadce0',
                          borderRadius: '8px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          marginTop: '6px'
                        }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <div 
                              style={{ width: '80px', height: '60px', background: '#fff', border: '1px solid #dadce0', borderRadius: '4px', overflow: 'hidden', padding: '4px' }}
                              dangerouslySetInnerHTML={{ __html: q.drawingSvg }}
                            />
                            <div>
                              <strong style={{ fontSize: '13px', color: '#202124', display: 'block' }}>Visual Diagram Attached</strong>
                              <span style={{ fontSize: '11px', color: '#5f6368' }}>Rendered to student during examination</span>
                            </div>
                          </div>
                          {isActive && (
                            <button
                              type="button"
                              onClick={() => updateQuestion(qIdx, { drawingSvg: undefined })}
                              style={{ color: '#d93025', background: 'none', border: 'none', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}
                            >
                              Remove
                            </button>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Question Type Dropdown (Google Forms Style) */}
                    <div className="gf-type-dropdown-container">
                      <select
                        value={q.questionType}
                        onChange={(e) => updateQuestion(qIdx, { questionType: e.target.value as any })}
                        className="gf-type-select"
                      >
                        {QUESTION_TYPES.map(t => (
                          <option key={t.id} value={t.id}>
                            {t.label}
                          </option>
                        ))}
                      </select>
                      <ChevronDown size={16} color="#5f6368" style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
                    </div>
                  </div>

                  {/* Options List / Answer Configuration */}
                  <div className="gf-options-list">
                    
                    {/* MCQ SINGLE & MULTIPLE */}
                    {(q.questionType === 'MCQ_SINGLE' || q.questionType === 'MCQ_MULTIPLE') && (
                      <>
                        {q.options.map((opt, optIdx) => {
                          const isCorrect = opt.isCorrect;
                          const letter = String.fromCharCode(65 + optIdx);

                          return (
                            <div key={opt.id} className="gf-option-row">
                              {/* Clickable Circle/Square to select correct answer */}
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  toggleCorrectOption(qIdx, optIdx, q.questionType === 'MCQ_MULTIPLE');
                                }}
                                className={`gf-radio-indicator ${isCorrect ? 'checked' : ''}`}
                                title={isCorrect ? 'Correct Answer' : 'Click to mark as correct answer'}
                              >
                                {isCorrect && <Check size={14} />}
                              </button>

                              {/* Option Letter Badge */}
                              <span className={`gf-letter-badge ${isCorrect ? 'correct' : ''}`}>
                                {letter}
                              </span>

                              {/* Option Text Input */}
                              <input
                                type="text"
                                value={opt.text}
                                onChange={(e) => {
                                  const nextOpts = [...q.options];
                                  nextOpts[optIdx].text = e.target.value;
                                  updateQuestion(qIdx, { options: nextOpts });
                                }}
                                placeholder={`Option ${optIdx + 1}`}
                                className="gf-option-input"
                              />

                              {/* Option Math Button */}
                              {isActive && (
                                <button
                                  type="button"
                                  onClick={() => openRichEditor(qIdx, 'option', optIdx)}
                                  className="gf-opt-action-btn"
                                  title="Add Math/Chem formula to option"
                                >
                                  <Calculator size={15} />
                                </button>
                              )}

                              {/* Remove Option */}
                              {isActive && q.options.length > 2 && (
                                <button
                                  type="button"
                                  onClick={(e) => { e.stopPropagation(); removeOption(qIdx, optIdx); }}
                                  className="gf-opt-action-btn delete"
                                  title="Remove option"
                                >
                                  <X size={16} />
                                </button>
                              )}
                            </div>
                          );
                        })}

                        {/* Add Option Link (Google Forms signature design) */}
                        {isActive && (
                          <div className="gf-add-option-line">
                            <div style={{ width: '20px', height: '20px', borderRadius: '50%', border: '2px dashed #bdc1c6', flexShrink: 0 }} />
                            <button
                              type="button"
                              onClick={() => addOption(qIdx)}
                              className="gf-add-option-link"
                            >
                              Add option
                            </button>
                          </div>
                        )}
                      </>
                    )}

                    {/* TRUE / FALSE */}
                    {q.questionType === 'TRUE_FALSE' && (
                      <div style={{ display: 'flex', gap: '12px', padding: '6px 0' }}>
                        {q.options.map((opt, optIdx) => {
                          const isCorrect = opt.isCorrect;
                          return (
                            <button
                              key={opt.id}
                              type="button"
                              onClick={() => toggleCorrectOption(qIdx, optIdx, false)}
                              style={{
                                padding: '10px 20px',
                                borderRadius: '8px',
                                border: isCorrect ? '2px solid #137333' : '1px solid #dadce0',
                                background: isCorrect ? '#e6f4ea' : '#ffffff',
                                color: isCorrect ? '#137333' : '#3c4043',
                                fontWeight: 700,
                                fontSize: '14px',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px'
                              }}
                            >
                              <span className={`gf-radio-indicator ${isCorrect ? 'checked' : ''}`}>
                                {isCorrect && <Check size={12} />}
                              </span>
                              <span>{opt.text} {isCorrect ? '(Correct Answer)' : ''}</span>
                            </button>
                          );
                        })}
                      </div>
                    )}

                    {/* NUMERICAL */}
                    {q.questionType === 'NUMERICAL' && (
                      <div style={{ padding: '14px', background: '#f8f9fa', borderRadius: '8px', border: '1px solid #dadce0', display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                        <div>
                          <label style={{ fontSize: '12px', color: '#5f6368', display: 'block', marginBottom: '4px', fontWeight: 600 }}>Target Numeric Value</label>
                          <input
                            type="number"
                            step="any"
                            value={q.correctAnswerText || ''}
                            onChange={(e) => updateQuestion(qIdx, { correctAnswerText: e.target.value })}
                            placeholder="E.g. 9.8 or 80"
                            style={{ background: '#fff', border: '1px solid #dadce0', borderRadius: '4px', padding: '8px 12px', fontSize: '14px', outline: 'none' }}
                          />
                        </div>
                        <div>
                          <label style={{ fontSize: '12px', color: '#5f6368', display: 'block', marginBottom: '4px', fontWeight: 600 }}>Tolerance Margin (±)</label>
                          <input
                            type="number"
                            step="any"
                            value={q.numericalTolerance ?? 0.05}
                            onChange={(e) => updateQuestion(qIdx, { numericalTolerance: parseFloat(e.target.value) || 0 })}
                            placeholder="E.g. 0.05"
                            style={{ background: '#fff', border: '1px solid #dadce0', borderRadius: '4px', padding: '8px 12px', fontSize: '14px', outline: 'none' }}
                          />
                        </div>
                        <div>
                          <label style={{ fontSize: '12px', color: '#5f6368', display: 'block', marginBottom: '4px', fontWeight: 600 }}>Unit (Optional)</label>
                          <input
                            type="text"
                            value={q.unit || ''}
                            onChange={(e) => updateQuestion(qIdx, { unit: e.target.value })}
                            placeholder="E.g. m/s² or N"
                            style={{ background: '#fff', border: '1px solid #dadce0', borderRadius: '4px', padding: '8px 12px', fontSize: '14px', outline: 'none' }}
                          />
                        </div>
                      </div>
                    )}

                    {/* SHORT ANSWER */}
                    {q.questionType === 'SHORT_ANSWER' && (
                      <div style={{ padding: '8px 0', maxWidth: '400px' }}>
                        <input
                          type="text"
                          value={q.correctAnswerText || ''}
                          onChange={(e) => updateQuestion(qIdx, { correctAnswerText: e.target.value })}
                          placeholder="Short-answer text..."
                          style={{ width: '100%', border: 'none', borderBottom: '1px solid #70757a', padding: '8px 2px', fontSize: '14px', outline: 'none' }}
                        />
                        <span style={{ fontSize: '12px', color: '#5f6368', marginTop: '4px', display: 'block' }}>
                          Evaluated with case-insensitive normalized grading
                        </span>
                      </div>
                    )}

                    {/* MATCHING PAIRS */}
                    {q.questionType === 'MATCHING' && (
                      <div style={{ padding: '14px', background: '#f8f9fa', borderRadius: '8px', border: '1px solid #dadce0', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <span style={{ fontSize: '12px', fontWeight: 700, color: '#5f6368' }}>Match Column A with Column B:</span>
                        {(q.matchingPairs || []).map((pair, pIdx) => (
                          <div key={pair.id || pIdx} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <input
                              type="text"
                              value={pair.left}
                              onChange={(e) => {
                                const next = [...(q.matchingPairs || [])];
                                next[pIdx].left = e.target.value;
                                updateQuestion(qIdx, { matchingPairs: next });
                              }}
                              placeholder={`Column A #${pIdx + 1}`}
                              style={{ flex: 1, background: '#fff', border: '1px solid #dadce0', borderRadius: '4px', padding: '6px 10px', fontSize: '13px' }}
                            />
                            <span style={{ color: '#5f6368', fontWeight: 700 }}>⇄</span>
                            <input
                              type="text"
                              value={pair.right}
                              onChange={(e) => {
                                const next = [...(q.matchingPairs || [])];
                                next[pIdx].right = e.target.value;
                                updateQuestion(qIdx, { matchingPairs: next });
                              }}
                              placeholder={`Column B Match #${pIdx + 1}`}
                              style={{ flex: 1, background: '#fff', border: '1px solid #dadce0', borderRadius: '4px', padding: '6px 10px', fontSize: '13px' }}
                            />
                            <button
                              type="button"
                              onClick={() => removeMatchingPair(qIdx, pIdx)}
                              className="gf-opt-action-btn delete"
                            >
                              <X size={14} />
                            </button>
                          </div>
                        ))}
                        <button
                          type="button"
                          onClick={() => addMatchingPair(qIdx)}
                          className="gf-add-option-link"
                          style={{ alignSelf: 'flex-start', marginTop: '4px' }}
                        >
                          + Add matching pair
                        </button>
                      </div>
                    )}

                    {/* LONG ANSWER / ESSAY */}
                    {q.questionType === 'LONG_ANSWER' && (
                      <div style={{ padding: '8px 0' }}>
                        <textarea
                          rows={3}
                          value={q.rubric || ''}
                          onChange={(e) => updateQuestion(qIdx, { rubric: e.target.value })}
                          placeholder="Long-answer text / Marking scheme criteria for AI & manual evaluation..."
                          style={{ width: '100%', background: '#f8f9fa', border: '1px solid #dadce0', borderRadius: '6px', padding: '10px 12px', fontSize: '13px', outline: 'none' }}
                        />
                      </div>
                    )}
                  </div>

                  {/* GOOGLE FORMS ANSWER KEY & FEEDBACK DRAWER */}
                  {isActive && (
                    <div className="gf-answer-key-footer">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setOpenAnswerKeys(prev => ({ ...prev, [q.id]: !prev[q.id] }));
                        }}
                        className="gf-answer-key-trigger"
                      >
                        <CheckCircle2 size={16} />
                        <span>{isAnswerKeyOpen ? 'Hide answer key and explanation' : `Answer key and feedback (${q.marks} ${q.marks === 1 ? 'point' : 'points'})`}</span>
                      </button>

                      {isAnswerKeyOpen && (
                        <div className="gf-answer-key-box">
                          <div className="gf-ak-header">
                            <span style={{ fontSize: '13px', fontWeight: 700, color: '#137333' }}>
                              Points & Pedagogical Explanation
                            </span>
                            <div className="gf-points-input-group">
                              <span>Points:</span>
                              <input
                                type="number"
                                min="0.5"
                                max="20"
                                step="0.5"
                                value={q.marks}
                                onChange={(e) => updateQuestion(qIdx, { marks: parseFloat(e.target.value) || 1 })}
                                className="gf-points-input"
                              />
                            </div>
                          </div>

                          <textarea
                            value={q.explanation || ''}
                            onChange={(e) => updateQuestion(qIdx, { explanation: e.target.value })}
                            rows={2}
                            placeholder="Add answer feedback / explain scientific concept and cite syllabus SLOs..."
                            className="gf-explanation-textarea"
                          />

                          {q.explanation && (q.explanation.includes('$') || q.explanation.includes('\\')) && (
                            <div style={{ padding: '8px', background: '#fff', borderRadius: '4px', border: '1px solid #ceead6', fontSize: '12px' }}>
                              <MathText text={q.explanation} />
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {/* CARD BOTTOM ACTION BAR (Google Forms Footer) */}
                  {isActive && (
                    <div className="gf-card-bottom-bar">
                      {/* Difficulty Tag */}
                      <select
                        value={q.difficulty}
                        onChange={(e) => updateQuestion(qIdx, { difficulty: e.target.value as any })}
                        style={{ background: '#f8f9fa', border: '1px solid #dadce0', borderRadius: '4px', padding: '4px 8px', fontSize: '12px', color: '#5f6368', outline: 'none' }}
                      >
                        <option value="Easy">Easy</option>
                        <option value="Medium">Medium</option>
                        <option value="Hard">Hard</option>
                      </select>

                      {/* Move Up / Down */}
                      <button
                        type="button"
                        disabled={qIdx === 0}
                        onClick={(e) => { e.stopPropagation(); moveQuestion(qIdx, 'up'); }}
                        className="gf-footer-icon-btn"
                        title="Move question up"
                      >
                        <ArrowUp size={16} />
                      </button>

                      <button
                        type="button"
                        disabled={qIdx === questions.length - 1}
                        onClick={(e) => { e.stopPropagation(); moveQuestion(qIdx, 'down'); }}
                        className="gf-footer-icon-btn"
                        title="Move question down"
                      >
                        <ArrowDown size={16} />
                      </button>

                      {/* Duplicate */}
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); duplicateQuestion(qIdx); }}
                        className="gf-footer-icon-btn"
                        title="Duplicate question"
                      >
                        <Copy size={18} />
                      </button>

                      {/* Delete */}
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); deleteQuestion(qIdx); }}
                        className="gf-footer-icon-btn delete"
                        title="Delete question"
                      >
                        <Trash2 size={18} />
                      </button>

                      <div className="gf-footer-divider" />

                      {/* Required Toggle */}
                      <label className="gf-required-toggle">
                        <span>Required</span>
                        <div className="gf-switch">
                          <input
                            type="checkbox"
                            checked={q.isRequired}
                            onChange={(e) => updateQuestion(qIdx, { isRequired: e.target.checked })}
                          />
                          <span className="gf-slider" />
                        </div>
                      </label>
                    </div>
                  )}
                </div>
              );
            })}
          </>
        )}

        {/* TAB 2: SETTINGS (Google Forms Settings View) */}
        {activeTab === 'settings' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* Setting Card 1: Exam Timers & Board */}
            <div className="gf-question-card" style={{ cursor: 'default' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                <Clock size={20} color="#673ab7" />
                <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#202124' }}>Exam Schedule & Academic Board</h3>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div>
                  <label style={{ fontSize: '13px', fontWeight: 600, color: '#5f6368', display: 'block', marginBottom: '4px' }}>Board</label>
                  <select
                    value={boardId}
                    onChange={(e) => { setBoardId(e.target.value); markUnsaved(); }}
                    className="gf-type-select"
                  >
                    <option value="AKU-EB">AKU-EB (Aga Khan University Examination Board)</option>
                    <option value="FBISE">Federal Board (FBISE)</option>
                    <option value="BIEK">Karachi Board</option>
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: '13px', fontWeight: 600, color: '#5f6368', display: 'block', marginBottom: '4px' }}>Grade / Class</label>
                  <select
                    value={classLevel}
                    onChange={(e) => { setClassLevel(Number(e.target.value)); markUnsaved(); }}
                    className="gf-type-select"
                  >
                    <option value={9}>Class IX (SSC-I)</option>
                    <option value={10}>Class X (SSC-II)</option>
                    <option value={11}>Class XI (HSSC-I)</option>
                    <option value={12}>Class XII (HSSC-II)</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginTop: '12px' }}>
                <div>
                  <label style={{ fontSize: '13px', fontWeight: 600, color: '#5f6368', display: 'block', marginBottom: '4px' }}>Subject</label>
                  <select
                    value={subject}
                    onChange={(e) => { setSubject(e.target.value); markUnsaved(); }}
                    className="gf-type-select"
                  >
                    <option value="Physics">Physics</option>
                    <option value="Chemistry">Chemistry</option>
                    <option value="Biology">Biology</option>
                    <option value="Mathematics">Mathematics</option>
                    <option value="Computer Science">Computer Science</option>
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: '13px', fontWeight: 600, color: '#5f6368', display: 'block', marginBottom: '4px' }}>Time Allowed (Minutes)</label>
                  <input
                    type="number"
                    min={5}
                    max={240}
                    value={durationMin}
                    onChange={(e) => { setDurationMin(Number(e.target.value)); markUnsaved(); }}
                    style={{ width: '100%', background: '#fff', border: '1px solid #dadce0', borderRadius: '4px', padding: '10px 14px', fontSize: '14px', outline: 'none' }}
                  />
                </div>
              </div>
            </div>

            {/* Setting Card 2: Security & Anti-Cheating Sentinel */}
            <div className="gf-question-card" style={{ cursor: 'default' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                <ShieldAlert size={20} color="#673ab7" />
                <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#202124' }}>Anti-Cheating & Integrity Sentinel</h3>
              </div>

              <div style={{ padding: '12px', background: '#e8f0fe', borderRadius: '6px', fontSize: '13px', color: '#1a73e8', lineHeight: 1.5 }}>
                Tracks browser tab visibility changes, window blurs, and student navigation events in real-time with server-authoritative timestamps.
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid #dadce0' }}>
                <div>
                  <strong style={{ fontSize: '14px', color: '#202124', display: 'block' }}>Enable Tab-Switch Monitoring</strong>
                  <span style={{ fontSize: '12px', color: '#5f6368' }}>Warn student and record violations to teacher audit log</span>
                </div>
                <div className="gf-switch">
                  <input
                    type="checkbox"
                    checked={settings.tabMonitoringEnabled}
                    onChange={(e) => {
                      setSettings(prev => ({ ...prev, tabMonitoringEnabled: e.target.checked }));
                      markUnsaved();
                    }}
                  />
                  <span className="gf-slider" />
                </div>
              </div>

              {settings.tabMonitoringEnabled && (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 0' }}>
                  <span style={{ fontSize: '13px', color: '#5f6368' }}>Warning Alert Threshold:</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span>&gt;</span>
                    <input
                      type="number"
                      min={1}
                      max={10}
                      value={settings.tabWarningThreshold}
                      onChange={(e) => {
                        setSettings(prev => ({ ...prev, tabWarningThreshold: Number(e.target.value) || 2 }));
                        markUnsaved();
                      }}
                      style={{ width: '60px', padding: '4px', textAlign: 'center', border: '1px solid #dadce0', borderRadius: '4px', fontWeight: 700 }}
                    />
                    <span>switches</span>
                  </div>
                </div>
              )}
            </div>

            {/* Setting Card 3: Feedback & Score Release */}
            <div className="gf-question-card" style={{ cursor: 'default' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                <CheckCircle2 size={20} color="#673ab7" />
                <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#202124' }}>Release Scores & Feedback</h3>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid #dadce0' }}>
                <div>
                  <strong style={{ fontSize: '14px', color: '#202124', display: 'block' }}>Immediately after each submission</strong>
                  <span style={{ fontSize: '12px', color: '#5f6368' }}>Release objective score right away</span>
                </div>
                <div className="gf-switch">
                  <input
                    type="checkbox"
                    checked={settings.immediateFeedback}
                    onChange={(e) => {
                      setSettings(prev => ({ ...prev, immediateFeedback: e.target.checked }));
                      markUnsaved();
                    }}
                  />
                  <span className="gf-slider" />
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 0' }}>
                <div>
                  <strong style={{ fontSize: '14px', color: '#202124', display: 'block' }}>Show Correct Answers in Review</strong>
                  <span style={{ fontSize: '12px', color: '#5f6368' }}>Display correct answer choices and RAG explanations to student</span>
                </div>
                <div className="gf-switch">
                  <input
                    type="checkbox"
                    checked={settings.showCorrectAnswers}
                    onChange={(e) => {
                      setSettings(prev => ({ ...prev, showCorrectAnswers: e.target.checked }));
                      markUnsaved();
                    }}
                  />
                  <span className="gf-slider" />
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 3. ICONIC GOOGLE FORMS FLOATING TOOL DOCK */}
      <div className="gf-floating-toolbar">
        <button
          type="button"
          onClick={() => addQuestion('MCQ_SINGLE', activeQuestionIndex)}
          className="gf-dock-btn"
          title="Add question (+)"
        >
          <Plus size={22} />
        </button>

        <button
          type="button"
          onClick={() => setIsBankModalOpen(true)}
          className="gf-dock-btn"
          title="Import from AKU-EB Question Bank"
        >
          <Database size={20} color="#673ab7" />
        </button>

        <button
          type="button"
          onClick={() => setIsAiModalOpen(true)}
          className="gf-dock-btn"
          title="Generate with Gemini AI"
        >
          <Sparkles size={20} color="#b06000" />
        </button>

        <button
          type="button"
          onClick={() => setIsImportModalOpen(true)}
          className="gf-dock-btn"
          title="Import raw JSON"
        >
          <Upload size={20} />
        </button>

        <div className="gf-dock-divider" />

        <button
          type="button"
          onClick={() => setActiveTab(activeTab === 'questions' ? 'settings' : 'questions')}
          className="gf-dock-btn"
          title="Settings"
        >
          <Settings size={20} />
        </button>

        <button
          type="button"
          onClick={() => setIsPreviewModalOpen(true)}
          className="gf-dock-btn"
          title="Student Live Preview"
        >
          <Eye size={20} />
        </button>
      </div>

      {/* 4. MODALS */}

      {/* QUESTION BANK MODAL */}
      {isBankModalOpen && (
        <QuestionBankModal
          boardId={boardId}
          classLevel={classLevel}
          subject={subject}
          onClose={() => setIsBankModalOpen(false)}
          onAddQuestions={(selected) => {
            const reindexed = [...questions, ...selected].map((q, i) => ({ ...q, orderIndex: i + 1 }));
            setQuestions(reindexed);
            setIsBankModalOpen(false);
            setActiveQuestionIndex(questions.length);
            markUnsaved();
            triggerToast(`Added ${selected.length} questions from Question Bank!`);
          }}
        />
      )}

      {/* GEMINI AI GENERATOR MODAL */}
      {isAiModalOpen && (
        <AiGeneratorModal
          boardId={boardId}
          classLevel={classLevel}
          subject={subject}
          onClose={() => setIsAiModalOpen(false)}
          onAddQuestions={(generated) => {
            const reindexed = [...questions, ...generated].map((q, i) => ({ ...q, orderIndex: i + 1 }));
            setQuestions(reindexed);
            setIsAiModalOpen(false);
            setActiveQuestionIndex(questions.length);
            markUnsaved();
            triggerToast(`Added ${generated.length} AI-generated questions!`);
          }}
        />
      )}

      {/* IMPORT JSON MODAL */}
      {isImportModalOpen && (
        <ImportQuestionsModal
          onClose={() => setIsImportModalOpen(false)}
          onImport={(imported) => {
            const reindexed = [...questions, ...imported].map((q, i) => ({ ...q, orderIndex: i + 1 }));
            setQuestions(reindexed);
            setIsImportModalOpen(false);
            markUnsaved();
            triggerToast(`Imported ${imported.length} questions successfully!`);
          }}
        />
      )}

      {/* STUDENT LIVE PREVIEW MODAL */}
      {isPreviewModalOpen && (
        <StudentPreviewModal
          title={title}
          description={description}
          boardId={boardId}
          classLevel={classLevel}
          subject={subject}
          durationMin={durationMin}
          questions={questions}
          onClose={() => setIsPreviewModalOpen(false)}
        />
      )}

      {/* RICH MATH / CHEM / DIAGRAM POPUP */}
      <RichMathChemDiagramEditor
        isOpen={richEditorState.isOpen}
        onClose={() => setRichEditorState(prev => ({ ...prev, isOpen: false }))}
        onInsert={handleRichEditorInsert}
        initialContent={richEditorState.initialContent}
        targetFieldLabel={richEditorState.label}
      />
    </div>
  );
}

// -------------------------------------------------------------------------------------
// QUESTION BANK MODAL (Google Styled)
// -------------------------------------------------------------------------------------
function QuestionBankModal({
  boardId,
  classLevel,
  subject,
  onClose,
  onAddQuestions
}: {
  boardId: string;
  classLevel: number;
  subject: string;
  onClose: () => void;
  onAddQuestions: (selected: QuizQuestionData[]) => void;
}) {
  const [bankQuestions, setBankQuestions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [difficultyFilter, setDifficultyFilter] = useState('ALL');

  useEffect(() => {
    fetchBank();
  }, [boardId, classLevel, subject, difficultyFilter]);

  async function fetchBank() {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        boardId,
        classLevel: String(classLevel),
        subject,
        difficulty: difficultyFilter
      });
      const res = await fetch(`/api/questions/bank?${params.toString()}`);
      const data = await res.json();
      if (data.success) {
        setBankQuestions(data.questions || []);
      }
    } catch (err) {
      console.error('Failed to load bank questions:', err);
    } finally {
      setLoading(false);
    }
  }

  const toggleSelect = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  const handleSelectAll = () => {
    if (selectedIds.size === filtered.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filtered.map(q => q.id)));
    }
  };

  const handleInsert = () => {
    const chosen = bankQuestions.filter(q => selectedIds.has(q.id)).map(q => ({
      id: `q-bank-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      orderIndex: 1,
      questionType: (q.questionType || 'MCQ_SINGLE') as any,
      stemText: q.stemText,
      difficulty: q.difficulty || 'Medium',
      cognitiveLevel: q.cognitiveLevel || 'Understanding',
      marks: q.marks || 1,
      isRequired: true,
      provenance: 'QUESTION_BANK' as const,
      pastPaperRef: q.sourcePaper ? `${q.sourcePaper} (${q.examYear || 'Past Paper'})` : 'AKU-EB Question Bank',
      options: q.options || [],
      explanation: q.explanation || ''
    }));
    onAddQuestions(chosen);
  };

  const filtered = bankQuestions.filter(q => 
    search ? q.stemText.toLowerCase().includes(search.toLowerCase()) : true
  );

  return (
    <div className="gf-modal-backdrop">
      <div className="gf-modal-content">
        <div className="gf-modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Database size={22} color="#673ab7" />
            <div>
              <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#202124' }}>AKU-EB Question Bank</h3>
              <span style={{ fontSize: '12px', color: '#5f6368' }}>Class {classLevel} • {subject} • Official Past Papers</span>
            </div>
          </div>
          <button onClick={onClose} className="gf-icon-btn">
            <X size={20} />
          </button>
        </div>

        {/* Filters */}
        <div style={{ padding: '12px 24px', background: '#f8f9fa', borderBottom: '1px solid #dadce0', display: 'flex', gap: '12px', alignItems: 'center' }}>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by topic, formula, or keyword..."
            style={{ flex: 1, background: '#fff', border: '1px solid #dadce0', borderRadius: '4px', padding: '6px 12px', fontSize: '13px', outline: 'none' }}
          />
          <select
            value={difficultyFilter}
            onChange={(e) => setDifficultyFilter(e.target.value)}
            style={{ background: '#fff', border: '1px solid #dadce0', borderRadius: '4px', padding: '6px 12px', fontSize: '13px', outline: 'none' }}
          >
            <option value="ALL">All Difficulties</option>
            <option value="Easy">Easy</option>
            <option value="Medium">Medium</option>
            <option value="Hard">Hard</option>
          </select>
          <button
            onClick={handleSelectAll}
            style={{ background: 'none', border: 'none', color: '#673ab7', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}
          >
            {selectedIds.size === filtered.length && filtered.length > 0 ? 'Deselect All' : 'Select All'}
          </button>
        </div>

        {/* List */}
        <div className="gf-modal-body">
          {loading ? (
            <div style={{ textAlign: 'center', padding: '40px', color: '#5f6368', fontSize: '13px' }}>Loading questions from bank...</div>
          ) : filtered.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px', color: '#5f6368', fontSize: '13px' }}>No questions found.</div>
          ) : (
            filtered.map((item) => {
              const isSelected = selectedIds.has(item.id);
              return (
                <div
                  key={item.id}
                  onClick={() => toggleSelect(item.id)}
                  style={{
                    padding: '14px',
                    borderRadius: '8px',
                    border: isSelected ? '2px solid #673ab7' : '1px solid #dadce0',
                    background: isSelected ? '#f3e8fd' : '#ffffff',
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                >
                  <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => {}}
                      style={{ marginTop: '3px', cursor: 'pointer', accentColor: '#673ab7' }}
                    />
                    <div style={{ flex: 1 }}>
                      <p style={{ fontSize: '14px', fontWeight: 500, color: '#202124' }}>
                        <MathText text={item.stemText} />
                      </p>
                      
                      {Array.isArray(item.options) && item.options.length > 0 && (
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', marginTop: '8px' }}>
                          {item.options.map((opt: any, oIdx: number) => (
                            <div 
                              key={oIdx} 
                              style={{ 
                                fontSize: '12px', 
                                padding: '4px 8px', 
                                borderRadius: '4px',
                                background: opt.isCorrect ? '#e6f4ea' : '#f1f3f4',
                                color: opt.isCorrect ? '#137333' : '#3c4043',
                                fontWeight: opt.isCorrect ? 700 : 400
                              }}
                            >
                              <strong>{String.fromCharCode(65 + oIdx)}.</strong> <MathText text={opt.text} />
                            </div>
                          ))}
                        </div>
                      )}

                      <div style={{ display: 'flex', gap: '8px', marginTop: '6px', fontSize: '11px', color: '#5f6368' }}>
                        <span>{item.difficulty}</span>
                        <span>•</span>
                        {item.sourcePaper && <span style={{ color: '#1a73e8', fontWeight: 600 }}>{item.sourcePaper}</span>}
                        <span>•</span>
                        <span>{item.marks || 1} mark</span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="gf-modal-footer">
          <span style={{ fontSize: '13px', color: '#5f6368', marginRight: 'auto' }}>
            Selected: <strong style={{ color: '#673ab7' }}>{selectedIds.size}</strong> questions
          </span>
          <button onClick={onClose} className="gf-draft-btn">Cancel</button>
          <button
            onClick={handleInsert}
            disabled={selectedIds.size === 0}
            className="gf-publish-btn"
            style={{ opacity: selectedIds.size === 0 ? 0.5 : 1 }}
          >
            Add Selected ({selectedIds.size})
          </button>
        </div>
      </div>
    </div>
  );
}

// -------------------------------------------------------------------------------------
// GEMINI AI GENERATION MODAL (Google Styled)
// -------------------------------------------------------------------------------------
function AiGeneratorModal({
  boardId,
  classLevel,
  subject,
  onClose,
  onAddQuestions
}: {
  boardId: string;
  classLevel: number;
  subject: string;
  onClose: () => void;
  onAddQuestions: (generated: QuizQuestionData[]) => void;
}) {
  const [topic, setTopic] = useState('Kinematics, Newton Laws & Gravitation');
  const [count, setCount] = useState(5);
  const [includeEquations, setIncludeEquations] = useState(true);
  const [easyCount, setEasyCount] = useState(2);
  const [mediumCount, setMediumCount] = useState(2);
  const [hardCount, setHardCount] = useState(1);
  const [instructions, setInstructions] = useState('');
  const [generating, setGenerating] = useState(false);
  const [generatedList, setGeneratedList] = useState<any[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

  const handleGenerate = async () => {
    try {
      setGenerating(true);
      const res = await fetch('/api/quizzes/generate-ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          board: boardId,
          classLevel,
          subject,
          chapter: topic,
          count,
          difficultyDistribution: {
            easy: easyCount,
            medium: mediumCount,
            hard: hardCount
          },
          includeEquations,
          customInstructions: instructions
        })
      });

      const data = await res.json();
      if (data.success && Array.isArray(data.questions)) {
        setGeneratedList(data.questions);
        setSelectedIds(new Set(data.questions.map((_: any, idx: number) => idx)));
      } else {
        alert(data.error || 'Failed to generate questions');
      }
    } catch (err: any) {
      console.error('AI Generation error:', err);
      alert('Error connecting to Gemini AI generator');
    } finally {
      setGenerating(false);
    }
  };

  const handleInsert = () => {
    const chosen = generatedList.filter((_, idx) => selectedIds.has(idx)).map((q, i) => ({
      id: `q-ai-${Date.now()}-${i}`,
      orderIndex: 1,
      questionType: (q.questionType || 'MCQ_SINGLE') as any,
      stemText: q.stemText,
      difficulty: q.difficulty || 'Medium',
      cognitiveLevel: q.cognitiveLevel || 'Understanding',
      marks: q.marks || 1,
      isRequired: true,
      provenance: 'AI_GENERATED' as const,
      options: q.options || [],
      explanation: q.explanation || ''
    }));
    onAddQuestions(chosen);
  };

  return (
    <div className="gf-modal-backdrop">
      <div className="gf-modal-content">
        <div className="gf-modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Sparkles size={22} color="#b06000" />
            <div>
              <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#202124' }}>Generate Questions with Gemini AI</h3>
              <span style={{ fontSize: '12px', color: '#5f6368' }}>AKU-EB Syllabus Aligned</span>
            </div>
          </div>
          <button onClick={onClose} className="gf-icon-btn"><X size={20} /></button>
        </div>

        <div className="gf-modal-body">
          {generatedList.length === 0 ? (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 600, color: '#5f6368', display: 'block', marginBottom: '4px' }}>Topic / Chapter</label>
                  <input
                    type="text"
                    value={topic}
                    onChange={(e) => setTopic(e.target.value)}
                    style={{ width: '100%', border: '1px solid #dadce0', borderRadius: '4px', padding: '8px 12px', fontSize: '13px' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 600, color: '#5f6368', display: 'block', marginBottom: '4px' }}>Question Count</label>
                  <input
                    type="number"
                    min={1}
                    max={15}
                    value={count}
                    onChange={(e) => {
                      const c = Number(e.target.value);
                      setCount(c);
                      setEasyCount(Math.ceil(c * 0.4));
                      setMediumCount(Math.floor(c * 0.4));
                      setHardCount(c - Math.ceil(c * 0.4) - Math.floor(c * 0.4));
                    }}
                    style={{ width: '100%', border: '1px solid #dadce0', borderRadius: '4px', padding: '8px 12px', fontSize: '13px' }}
                  />
                </div>
              </div>

              <div>
                <label style={{ fontSize: '12px', fontWeight: 600, color: '#5f6368', display: 'block', marginBottom: '4px' }}>Difficulty Breakdown</label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
                  <div style={{ padding: '8px', background: '#f8f9fa', borderRadius: '4px', border: '1px solid #dadce0' }}>
                    <span style={{ fontSize: '12px', fontWeight: 700, color: '#137333', display: 'block', marginBottom: '2px' }}>Easy</span>
                    <input
                      type="number"
                      min={0}
                      value={easyCount}
                      onChange={(e) => setEasyCount(Number(e.target.value))}
                      style={{ width: '100%', border: '1px solid #dadce0', padding: '4px', borderRadius: '4px' }}
                    />
                  </div>
                  <div style={{ padding: '8px', background: '#f8f9fa', borderRadius: '4px', border: '1px solid #dadce0' }}>
                    <span style={{ fontSize: '12px', fontWeight: 700, color: '#b06000', display: 'block', marginBottom: '2px' }}>Medium</span>
                    <input
                      type="number"
                      min={0}
                      value={mediumCount}
                      onChange={(e) => setMediumCount(Number(e.target.value))}
                      style={{ width: '100%', border: '1px solid #dadce0', padding: '4px', borderRadius: '4px' }}
                    />
                  </div>
                  <div style={{ padding: '8px', background: '#f8f9fa', borderRadius: '4px', border: '1px solid #dadce0' }}>
                    <span style={{ fontSize: '12px', fontWeight: 700, color: '#d93025', display: 'block', marginBottom: '2px' }}>Hard</span>
                    <input
                      type="number"
                      min={0}
                      value={hardCount}
                      onChange={(e) => setHardCount(Number(e.target.value))}
                      style={{ width: '100%', border: '1px solid #dadce0', padding: '4px', borderRadius: '4px' }}
                    />
                  </div>
                </div>
              </div>

              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#3c4043', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={includeEquations}
                  onChange={(e) => setIncludeEquations(e.target.checked)}
                  style={{ accentColor: '#673ab7' }}
                />
                <span>Include LaTeX mathematical formulas & chemical equilibrium arrows</span>
              </label>

              <button
                type="button"
                onClick={handleGenerate}
                disabled={generating}
                className="gf-publish-btn"
                style={{ justifyContent: 'center', width: '100%', padding: '12px' }}
              >
                {generating ? 'Gemini is generating questions...' : `Generate ${count} Questions`}
              </button>
            </>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#5f6368' }}>
                <span>Select questions to insert:</span>
                <button onClick={() => setGeneratedList([])} style={{ color: '#673ab7', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}>Generate Again</button>
              </div>

              {generatedList.map((item, idx) => (
                <div
                  key={idx}
                  onClick={() => {
                    const next = new Set(selectedIds);
                    if (next.has(idx)) next.delete(idx);
                    else next.add(idx);
                    setSelectedIds(next);
                  }}
                  style={{
                    padding: '12px',
                    borderRadius: '8px',
                    border: selectedIds.has(idx) ? '2px solid #673ab7' : '1px solid #dadce0',
                    background: selectedIds.has(idx) ? '#f3e8fd' : '#fff',
                    cursor: 'pointer'
                  }}
                >
                  <p style={{ fontSize: '13px', fontWeight: 600 }}>
                    <MathText text={item.stemText} />
                  </p>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px', marginTop: '6px' }}>
                    {(item.options || []).map((opt: any, oIdx: number) => (
                      <div key={oIdx} style={{ fontSize: '11px', color: opt.isCorrect ? '#137333' : '#5f6368', fontWeight: opt.isCorrect ? 700 : 400 }}>
                        {String.fromCharCode(65 + oIdx)}. <MathText text={opt.text} />
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {generatedList.length > 0 && (
          <div className="gf-modal-footer">
            <button onClick={() => setGeneratedList([])} className="gf-draft-btn">Back</button>
            <button onClick={handleInsert} className="gf-publish-btn">
              Add {selectedIds.size} Questions
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// -------------------------------------------------------------------------------------
// IMPORT RAW JSON MODAL
// -------------------------------------------------------------------------------------
function ImportQuestionsModal({
  onClose,
  onImport
}: {
  onClose: () => void;
  onImport: (questions: QuizQuestionData[]) => void;
}) {
  const [jsonText, setJsonText] = useState(`[
  {
    "stemText": "What is the SI unit of electric current?",
    "questionType": "MCQ_SINGLE",
    "difficulty": "Easy",
    "marks": 1,
    "options": [
      { "id": "1", "text": "Volt", "isCorrect": false },
      { "id": "2", "text": "Ampere", "isCorrect": true },
      { "id": "3", "text": "Ohm", "isCorrect": false },
      { "id": "4", "text": "Watt", "isCorrect": false }
    ],
    "explanation": "Ampere (A) is the base SI unit of electric current."
  }
]`);

  const handleParse = () => {
    try {
      const parsed = JSON.parse(jsonText);
      if (!Array.isArray(parsed)) throw new Error('Input must be a JSON array of questions');
      const formatted = parsed.map((item, idx) => ({
        id: `q-imp-${Date.now()}-${idx}`,
        orderIndex: 1,
        questionType: item.questionType || 'MCQ_SINGLE',
        stemText: item.stemText || '',
        difficulty: item.difficulty || 'Medium',
        cognitiveLevel: item.cognitiveLevel || 'Understanding',
        marks: item.marks || 1,
        isRequired: true,
        provenance: 'IMPORTED' as const,
        options: item.options || [],
        explanation: item.explanation || ''
      }));
      onImport(formatted);
    } catch (err: any) {
      alert(`Invalid JSON format: ${err.message}`);
    }
  };

  return (
    <div className="gf-modal-backdrop">
      <div className="gf-modal-content">
        <div className="gf-modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Upload size={20} color="#673ab7" />
            <h3 style={{ fontSize: '16px', fontWeight: 600 }}>Import Questions JSON</h3>
          </div>
          <button onClick={onClose} className="gf-icon-btn"><X size={20} /></button>
        </div>
        <div className="gf-modal-body">
          <textarea
            value={jsonText}
            onChange={(e) => setJsonText(e.target.value)}
            rows={10}
            style={{ width: '100%', fontFamily: 'monospace', fontSize: '12px', padding: '12px', border: '1px solid #dadce0', borderRadius: '4px' }}
          />
        </div>
        <div className="gf-modal-footer">
          <button onClick={onClose} className="gf-draft-btn">Cancel</button>
          <button onClick={handleParse} className="gf-publish-btn">Validate & Import</button>
        </div>
      </div>
    </div>
  );
}

// -------------------------------------------------------------------------------------
// STUDENT LIVE PREVIEW MODAL
// -------------------------------------------------------------------------------------
function StudentPreviewModal({
  title,
  description,
  boardId,
  classLevel,
  subject,
  durationMin,
  questions,
  onClose
}: {
  title: string;
  description: string;
  boardId: string;
  classLevel: number;
  subject: string;
  durationMin: number;
  questions: QuizQuestionData[];
  onClose: () => void;
}) {
  const [selectedAnswers, setSelectedAnswers] = useState<Record<number, any>>({});

  return (
    <div className="gf-modal-backdrop">
      <div className="gf-modal-content" style={{ maxWidth: '780px', maxHeight: '90vh' }}>
        <div className="gf-modal-header" style={{ background: '#f8f9fa' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ background: '#ede7f6', color: '#512da8', fontSize: '11px', fontWeight: 700, padding: '3px 8px', borderRadius: '12px' }}>
              Student Experience Simulation
            </span>
            <span style={{ fontSize: '12px', color: '#5f6368' }}>Correct answers are hidden</span>
          </div>
          <button onClick={onClose} className="gf-draft-btn">Exit Preview</button>
        </div>

        <div className="gf-modal-body" style={{ background: '#f0ebf8', padding: '20px' }}>
          {/* Header Card */}
          <div className="gf-title-card" style={{ marginBottom: '14px' }}>
            <h2 style={{ fontSize: '26px', fontWeight: 500, color: '#202124' }}>{title}</h2>
            {description && <p style={{ fontSize: '14px', color: '#5f6368', marginTop: '6px' }}>{description}</p>}
            <div style={{ fontSize: '12px', color: '#5f6368', marginTop: '10px', paddingTop: '10px', borderTop: '1px solid #f1f3f4' }}>
              {boardId} • Class {classLevel} • {subject} • Time Allowed: {durationMin} minutes
            </div>
          </div>

          {/* Question Cards */}
          {questions.map((q, idx) => (
            <div key={q.id} className="gf-question-card" style={{ cursor: 'default', marginBottom: '14px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '12px', fontWeight: 700, color: '#5f6368', textTransform: 'uppercase' }}>
                  Question {idx + 1} ({q.marks} {q.marks === 1 ? 'point' : 'points'})
                </span>
              </div>

              <div style={{ fontSize: '15px', fontWeight: 500, color: '#202124', lineHeight: 1.5 }}>
                <MathText text={q.stemText} />
              </div>

              {q.drawingSvg && (
                <div 
                  style={{ padding: '8px', background: '#fff', border: '1px solid #dadce0', borderRadius: '4px', maxWidth: '300px' }}
                  dangerouslySetInnerHTML={{ __html: q.drawingSvg }}
                />
              )}

              {/* Options */}
              {(q.questionType === 'MCQ_SINGLE' || q.questionType === 'MCQ_MULTIPLE') && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '8px' }}>
                  {q.options.map((opt, oIdx) => {
                    const isChosen = selectedAnswers[idx] === opt.id;
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => setSelectedAnswers(prev => ({ ...prev, [idx]: opt.id }))}
                        style={{
                          padding: '12px 16px',
                          borderRadius: '8px',
                          border: isChosen ? '2px solid #673ab7' : '1px solid #dadce0',
                          background: isChosen ? '#f3e8fd' : '#ffffff',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '12px',
                          cursor: 'pointer',
                          textAlign: 'left'
                        }}
                      >
                        <div style={{
                          width: '18px',
                          height: '18px',
                          borderRadius: '50%',
                          border: isChosen ? '2px solid #673ab7' : '2px solid #5f6368',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}>
                          {isChosen && <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#673ab7' }} />}
                        </div>
                        <span style={{ fontSize: '14px', color: '#202124' }}>
                          <strong>{String.fromCharCode(65 + oIdx)}.</strong> <MathText text={opt.text} />
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}

              {q.questionType === 'TRUE_FALSE' && (
                <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
                  {['True', 'False'].map((choice) => {
                    const isChosen = selectedAnswers[idx] === choice;
                    return (
                      <button
                        key={choice}
                        type="button"
                        onClick={() => setSelectedAnswers(prev => ({ ...prev, [idx]: choice }))}
                        style={{
                          flex: 1,
                          padding: '12px',
                          borderRadius: '8px',
                          border: isChosen ? '2px solid #673ab7' : '1px solid #dadce0',
                          background: isChosen ? '#f3e8fd' : '#ffffff',
                          fontWeight: 700,
                          cursor: 'pointer'
                        }}
                      >
                        {choice}
                      </button>
                    );
                  })}
                </div>
              )}

              {q.questionType === 'NUMERICAL' && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '8px' }}>
                  <input
                    type="number"
                    placeholder="Your answer"
                    style={{ border: 'none', borderBottom: '1px solid #70757a', padding: '8px 4px', fontSize: '14px', width: '200px', outline: 'none' }}
                  />
                  {q.unit && <span style={{ fontSize: '14px', fontWeight: 600 }}>{q.unit}</span>}
                </div>
              )}

              {q.questionType === 'SHORT_ANSWER' && (
                <div style={{ marginTop: '8px' }}>
                  <input
                    type="text"
                    placeholder="Your answer"
                    style={{ width: '100%', maxWidth: '400px', border: 'none', borderBottom: '1px solid #70757a', padding: '8px 4px', fontSize: '14px', outline: 'none' }}
                  />
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function GoogleFormsQuizBuilder() {
  return (
    <React.Suspense fallback={<div style={{ padding: '2rem', textAlign: 'center', fontFamily: 'sans-serif' }}>Loading Quiz Builder...</div>}>
      <GoogleFormsQuizBuilderContent />
    </React.Suspense>
  );
}
