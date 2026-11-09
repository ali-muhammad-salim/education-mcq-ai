'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Plus, Trash2, Copy, ArrowUp, ArrowDown, Settings, Eye,
  Sparkles, Database, Upload, Check, AlertCircle, ArrowLeft,
  HelpCircle, Calculator, CheckCircle2,
  FileText, ShieldAlert, Clock, CheckSquare, Radio, GripVertical,
  X, SlidersHorizontal, Layers, Award, Lightbulb, ChevronDown,
  Share2, KeyRound, Shuffle, MinusCircle
} from 'lucide-react';

import { useDialog } from '@/lib/use-dialog';
import { questionSchema } from '@/lib/validations/assessment';
import MathText from '@/components/MathText';
import { QuizSharingSettings } from '@/components/AssessmentManagement';
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
  topicName?: string;
  reviewId?: string;
  sloId?: string;
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
  drawingSvg?: string; diagramUrl?: string;
}

export interface QuizSettings {
  maxAttempts: number;
  allowRetries: boolean;
  randomizeQuestions: boolean;
  randomizeOptions: boolean;
  immediateFeedback: boolean;
  showCorrectAnswers: boolean;
  resultVisibility: 'IMMEDIATE' | 'SCHEDULED' | 'MANUAL_RELEASE';
  resultReleaseDate?: string | null;
  manualGradingRequired: boolean;
  aiGradingMode: 'OFF' | 'LENIENT' | 'MEDIUM' | 'STRICT' | 'CUSTOM';
  tabMonitoringEnabled: boolean;
  tabWarningThreshold: number;
  negativeMarking: boolean;
  negativeMarkValue: number;
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
  const [title, setTitle] = useState('Untitled assessment');
  const [scheduleStart, setScheduleStart] = useState(''), [scheduleEnd, setScheduleEnd] = useState('');
  const [description, setDescription] = useState('Official curriculum assessment aligned with AKU-EB Student Learning Objectives (SLOs). Answer all questions.');
  const [boardId, setBoardId] = useState('AKU-EB');
  const [classLevel, setClassLevel] = useState(9);
  const [subject, setSubject] = useState('Physics');
  const [durationMin, setDurationMin] = useState(45);
  const [visibility, setVisibility] = useState<'PUBLIC' | 'UNLISTED' | 'PRIVATE'>('UNLISTED');
  const [status, setStatus] = useState<'DRAFT' | 'PUBLISHED'>('DRAFT');

  // Quiz Settings State
  const [settings, setSettings] = useState<QuizSettings>({
    maxAttempts: 1,
    allowRetries: false,
    randomizeQuestions: false,
    randomizeOptions: false,
    immediateFeedback: false,
    showCorrectAnswers: false,
    resultVisibility: 'MANUAL_RELEASE',
    manualGradingRequired: false,
    aiGradingMode: 'OFF',
    tabMonitoringEnabled: true,
    tabWarningThreshold: 2,
    negativeMarking: false,
    negativeMarkValue: 0
  });

  // Questions State
  const [questions, setQuestions] = useState<QuizQuestionData[]>([]);

  const [activeQuestionIndex, setActiveQuestionIndex] = useState<number>(0);
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'unsaved' | 'error'>('unsaved');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Answer Key Drawer toggle per question
  const [openAnswerKeys, setOpenAnswerKeys] = useState<Record<string, boolean>>({});

  // Modals
  const [isBankModalOpen, setIsBankModalOpen] = useState(false);
  const [isAiModalOpen, setIsAiModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [quizCode, setQuizCode] = useState<string | null>(null);

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

  useEffect(() => { const warn = (event: BeforeUnloadEvent) => { if (saveStatus === 'unsaved' || saveStatus === 'error') { event.preventDefault(); event.returnValue = ''; } }; window.addEventListener('beforeunload', warn); return () => window.removeEventListener('beforeunload', warn); }, [saveStatus]);

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
      if (!res.ok) throw new Error(data.error?.message || 'Unable to load this assessment.');
      if (data.success && data.quiz) {
        const q = data.quiz;
        const duplicate = searchParams?.get('duplicate') === '1';
        setQuizId(duplicate ? null : q.id);
      if (duplicate) setQuizCode(null);
        else if (q.code) setQuizCode(q.code);
        else setQuizCode(q.id);
        setTitle((duplicate ? 'Copy of ' : '') + (q.title || 'Untitled Assessment'));
        setClassLevel(q.classLevel || 9); setSubject(q.subject || 'Physics');
        setScheduleStart(q.scheduleStart || ''); setScheduleEnd(q.scheduleEnd || '');
        setDescription(q.description || '');
        setBoardId(q.boardId || 'AKU-EB');
        setDurationMin(q.durationMin || 45);
        setVisibility(q.visibility || 'PUBLIC');
        setStatus(duplicate ? 'DRAFT' : q.status || 'DRAFT');
        if (q.settings) {
          setSettings(prev => ({ ...prev, ...q.settings, aiGradingMode: 'OFF' }));
        }
        if (Array.isArray(q.questions)) {
          setQuestions(q.questions.map((item: any, idx: number) => ({
            ...item, id: item.id || `q-${idx}`,
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
        setSaveStatus(duplicate ? 'unsaved' : 'saved');
      }
    } catch (err) {
      triggerToast(err instanceof Error ? err.message : 'Unable to load assessment.');
      console.error('Failed to load quiz:', err);
      setSaveStatus('error');
    }
  }

  const draftKey = useRef('');
  const [draftAvailable, setDraftAvailable] = useState(false);
  useEffect(() => { void fetch('/api/auth/me').then(r => r.json()).then(data => { if (data.user) { draftKey.current = 'builder-draft:' + data.user.id + ':' + (editQuizId || 'new'); setDraftAvailable(Boolean(sessionStorage.getItem(draftKey.current))); } }); }, [editQuizId]);
  useEffect(() => { if (draftAvailable || saveStatus !== 'unsaved' || !draftKey.current) return; const timer = setTimeout(() => { try { sessionStorage.setItem(draftKey.current, JSON.stringify({ quizId, title, description, boardId, classLevel, subject, durationMin, visibility, scheduleStart, scheduleEnd, settings, questions })); } catch { /* The online save action remains available if browser storage is full. */ } }, 500); return () => clearTimeout(timer); }, [title, description, boardId, classLevel, subject, durationMin, visibility, scheduleStart, scheduleEnd, settings, questions, saveStatus, draftAvailable, quizId]);
  const restoreDraft = () => { try { const draft = JSON.parse(sessionStorage.getItem(draftKey.current) || 'null'); if (!draft || !Array.isArray(draft.questions)) return; setQuizId(draft.quizId || null); setTitle(draft.title); setDescription(draft.description); setBoardId(draft.boardId); setClassLevel(draft.classLevel); setSubject(draft.subject); setDurationMin(draft.durationMin); setVisibility(draft.visibility); setScheduleStart(draft.scheduleStart || ''); setScheduleEnd(draft.scheduleEnd || ''); setSettings(draft.settings); setQuestions(draft.questions); setSaveStatus('unsaved'); setDraftAvailable(false); } catch { triggerToast('This local draft could not be restored.'); } };
  // Calculate total points
  const totalPoints = questions.reduce((sum, q) => sum + (Number(q.marks) || 1), 0);

  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const markUnsaved = () => {
    setSaveStatus('unsaved');
  };

  async function syncReviews() {
    try { const response = await fetch('/api/dashboard/teacher/doubts'); const data = await response.json(); if (!response.ok) throw new Error(data.error?.message || 'Unable to load reviews.'); setQuestions(previous => previous.map(q => { const approved = data.resolved.find((r: any) => r.id === q.reviewId && r.status === 'APPROVED'); return approved ? { ...q, ...approved.question, id: q.id, reviewId: approved.id, provenance: 'AI_GENERATED' } : q; })); markUnsaved(); triggerToast('Approved question revisions synchronized.'); } catch (error) { triggerToast(error instanceof Error ? error.message : 'Unable to synchronize reviews.'); }
  }
  async function reviseQuestion(question: QuizQuestionData) { try { const response = await fetch('/api/dashboard/teacher/doubts', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'REVISE', doubtId: question.reviewId, question }) }); const data = await response.json(); if (!response.ok) throw new Error(data.error?.message || 'Unable to submit revision.'); triggerToast('Revision sent to the educator review queue. Approve it before publishing.'); } catch (error) { triggerToast(error instanceof Error ? error.message : 'Unable to submit revision.'); } }
  // Save Quiz
  const handleSaveQuiz = async (publish = false) => {
    try {
      setSaveStatus('saving');
      const targetStatus = publish ? 'PUBLISHED' : status;

      const payload = {
        id: quizId,
        code: quizCode,
        title: title.trim() || 'Untitled Assessment',
        description,
        boardId,
        classLevel,
        subject,
        durationMin,
        visibility,
        status: targetStatus,
        scheduleStart: scheduleStart || null, scheduleEnd: scheduleEnd || null, settings,
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
        if (draftKey.current) sessionStorage.removeItem(draftKey.current);
        if (data.code) setQuizCode(data.code);
        if (publish) {
          setStatus('PUBLISHED');
          setIsShareModalOpen(true);
        }
        setSaveStatus('saved');
        triggerToast(publish ? `Assessment published! Code: ${data.code || ''}` : 'All changes saved to cloud.');
      } else {
        setSaveStatus('error');
        triggerToast(`Save error: ${typeof data.error === 'string' ? data.error : data.error?.message || 'Server error'}`);
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
    <div className="rise-ui gf-page">

      {/* Setter's toolbar */}
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
                background: status === 'PUBLISHED' ? 'var(--r-right-wash)' : 'var(--r-flag-wash)',
                color: status === 'PUBLISHED' ? 'var(--r-right)' : 'var(--r-flag)'
              }}>
                {status}
              </span>
            </div>

            <div className="gf-save-badge">
              {saveStatus === 'saved' && <><Check size={14} color="var(--r-right)" /> All changes saved in cloud</>}
              {saveStatus === 'saving' && <>Saving changes...</>}
              {saveStatus === 'unsaved' && <>Unsaved changes</>}
              {saveStatus === 'error' && <><AlertCircle size={14} color="var(--r-wrong)" /> Save failed</>}
            </div>
          </div>
        </div>

        {/* Tabs */}
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
          {/* Question Bank Quick Loader Button */}
          <button
            type="button"
            onClick={() => setIsBankModalOpen(true)}
            className="gf-draft-btn"
            style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
            title="Import questions from official AKU-EB Question Bank"
          >
            <Database size={16} color="var(--r-emerald)" />
            <span>Question Bank</span>
          </button>

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

          {/* Share Unique Quiz Code Button */}
          <button
            type="button"
            onClick={() => {
              if (!quizCode) {
                handleSaveQuiz(true);
              } else {
                if(saveStatus==='unsaved'||saveStatus==='error'){triggerToast('Save your changes before opening sharing settings.');return;}
                setIsShareModalOpen(true);
              }
            }}
            className="gf-draft-btn"
            title="Share unique quiz code and direct join link"
          >
            <Share2 size={16} />
            <span>{quizCode ? `Share (${quizCode})` : 'Share Code'}</span>
          </button>
        </div>

      </header>

      {/* Desk */}
      <div className="gf-main-container">

        {/* Floating Toast Notification */}
        {toastMessage && (
          <div className="gf-toast">
            <CheckCircle2 size={16} color="var(--r-right)" />
            <span>{toastMessage}</span>
          </div>
        )}

        {/* TAB 1: QUESTIONS EDITOR */}
        {activeTab === 'questions' && (
          <>
            {/* Paper header, banded like a printed board paper */}
            <div className="gf-title-sheet">
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
                    color: 'var(--r-emerald)',
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

            {questions.length === 0 && (
              <div className="gf-blank-sheet">
                <span className="gf-blank-rule">No items set</span>
                <h2 className="gf-blank-title">An empty paper, waiting to be set</h2>
                <p className="gf-blank-note">
                  Write the first question yourself, or pull items in from the board question bank,
                  a generated draft, or an existing JSON export.
                </p>
                <div className="gf-blank-ways">
                  <button type="button" className="gf-way gf-way-lead" onClick={() => addQuestion('MCQ_SINGLE')}>
                    <Plus size={18} />
                    <span className="gf-way-name">Write a question</span>
                    <span className="gf-way-note">Start with a single-answer MCQ</span>
                  </button>
                  <button type="button" className="gf-way" onClick={() => setIsBankModalOpen(true)}>
                    <Database size={18} />
                    <span className="gf-way-name">Question bank</span>
                    <span className="gf-way-note">Pick vetted AKU-EB items</span>
                  </button>
                  <button type="button" className="gf-way" onClick={() => setIsAiModalOpen(true)}>
                    <Sparkles size={18} />
                    <span className="gf-way-name">Generate a draft</span>
                    <span className="gf-way-note">Review every item before publishing</span>
                  </button>
                  <button type="button" className="gf-way" onClick={() => setIsImportModalOpen(true)}>
                    <Upload size={18} />
                    <span className="gf-way-name">Import JSON</span>
                    <span className="gf-way-note">Bring in a prepared paper</span>
                  </button>
                </div>
              </div>
            )}

            {/* QUESTIONS LIST */}
            {questions.map((q, qIdx) => {
              const isActive = activeQuestionIndex === qIdx;
              const isAnswerKeyOpen = openAnswerKeys[q.id] || false;
              const currentTypeObj = QUESTION_TYPES.find(t => t.id === q.questionType) || QUESTION_TYPES[0];

              return (
                <div
                  key={q.id}
                  onClick={() => setActiveQuestionIndex(qIdx)}
                  className={`gf-item-sheet ${isActive ? 'active' : ''}`}
                >
                  {/* Top Drag Handle (6 dots) */}
                  <div className="gf-drag-handle" title="Drag to reorder">
                    <GripVertical size={16} style={{ transform: 'rotate(90deg)' }} />
                  </div>

                  {/* Question Stem & Question Type Dropdown Row */}
                  <label style={{display:'grid',gap:6,padding:'0 20px 12px',fontSize:13}}>Topic / chapter (optional)
                    <input aria-label={`Topic for question ${qIdx + 1}`} maxLength={160} placeholder="E.g. Kinematics — used in learning progress" value={q.topicName||''} onChange={e=>updateQuestion(qIdx,{topicName:e.target.value})} style={{padding:'10px 12px',border:'1px solid var(--r-rule)',borderRadius:8,background:'var(--r-paper)',color:'var(--r-ink)'}}/>
                  </label>
                  <div className="gf-q-header-row">
                    <div className="gf-stem-wrapper">
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--r-ink-muted)', textTransform: 'uppercase' }}>
                          Question {qIdx + 1}
                        </span>

                        {/* Open Rich Formula Editor */}
                        {isActive && (
                          <button
                            type="button"
                            onClick={() => openRichEditor(qIdx, 'stemText')}
                            style={{
                              background: 'var(--r-emerald-wash)',
                              border: '1px solid var(--r-emerald)',
                              color: 'var(--r-emerald)',
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
                          <span style={{ fontSize: '10px', fontWeight: 700, color: 'var(--r-emerald)', textTransform: 'uppercase', display: 'block', marginBottom: '2px' }}>
                            Live Math Preview:
                          </span>
                          <MathText text={q.stemText} />
                        </div>
                      )}

                      {/* Attached Visual Diagram preview */}
                      {q.reviewId && <button type="button" className="gf-draft-btn" onClick={() => void reviseQuestion(q)}>Submit edited question for review</button>}
                      {q.drawingSvg && (
                        <div style={{
                          padding: '12px',
                          background: 'var(--r-surface)',
                          border: '1px solid var(--r-rule)',
                          borderRadius: '8px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          marginTop: '6px'
                        }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <div
                              style={{ width: '80px', height: '60px', background: 'var(--r-paper)', border: '1px solid var(--r-rule)', borderRadius: '4px', overflow: 'hidden', padding: '4px' }}
                              children={<img alt="Question diagram" src={'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(q.drawingSvg)} style={{ maxWidth: '100%' }} />}
                            />
                            <div>
                              <strong style={{ fontSize: '13px', color: 'var(--r-ink)', display: 'block' }}>Visual Diagram Attached</strong>
                              <span style={{ fontSize: '11px', color: 'var(--r-ink-muted)' }}>Rendered to student during examination</span>
                            </div>
                          </div>
                          {isActive && (
                            <button
                              type="button"
                              onClick={() => updateQuestion(qIdx, { drawingSvg: undefined })}
                              style={{ color: 'var(--r-wrong)', background: 'none', border: 'none', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}
                            >
                              Remove
                            </button>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Question type */}
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
                      <ChevronDown size={16} color="var(--r-ink-muted)" style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
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

                        {/* Add option */}
                        {isActive && (
                          <div className="gf-add-option-line">
                            <div style={{ width: '20px', height: '20px', borderRadius: '50%', border: '2px dashed var(--r-rule-strong)', flexShrink: 0 }} />
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
                                border: isCorrect ? '2px solid var(--r-right)' : '1px solid var(--r-rule)',
                                background: isCorrect ? 'var(--r-right-wash)' : 'var(--r-paper)',
                                color: isCorrect ? 'var(--r-right)' : 'var(--r-ink)',
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
                      <div style={{ padding: '14px', background: 'var(--r-surface)', borderRadius: '8px', border: '1px solid var(--r-rule)', display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                        <div>
                          <label style={{ fontSize: '12px', color: 'var(--r-ink-muted)', display: 'block', marginBottom: '4px', fontWeight: 600 }}>Target Numeric Value</label>
                          <input
                            type="number"
                            step="any"
                            value={q.correctAnswerText || ''}
                            onChange={(e) => updateQuestion(qIdx, { correctAnswerText: e.target.value })}
                            placeholder="E.g. 9.8 or 80"
                            style={{ background: 'var(--r-paper)', border: '1px solid var(--r-rule)', borderRadius: '4px', padding: '8px 12px', fontSize: '14px', outline: 'none' }}
                          />
                        </div>
                        <div>
                          <label style={{ fontSize: '12px', color: 'var(--r-ink-muted)', display: 'block', marginBottom: '4px', fontWeight: 600 }}>Tolerance Margin (±)</label>
                          <input
                            type="number"
                            step="any"
                            value={q.numericalTolerance ?? 0.05}
                            onChange={(e) => updateQuestion(qIdx, { numericalTolerance: parseFloat(e.target.value) || 0 })}
                            placeholder="E.g. 0.05"
                            style={{ background: 'var(--r-paper)', border: '1px solid var(--r-rule)', borderRadius: '4px', padding: '8px 12px', fontSize: '14px', outline: 'none' }}
                          />
                        </div>
                        <div>
                          <label style={{ fontSize: '12px', color: 'var(--r-ink-muted)', display: 'block', marginBottom: '4px', fontWeight: 600 }}>Unit (Optional)</label>
                          <input
                            type="text"
                            value={q.unit || ''}
                            onChange={(e) => updateQuestion(qIdx, { unit: e.target.value })}
                            placeholder="E.g. m/s² or N"
                            style={{ background: 'var(--r-paper)', border: '1px solid var(--r-rule)', borderRadius: '4px', padding: '8px 12px', fontSize: '14px', outline: 'none' }}
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
                          style={{ width: '100%', border: 'none', borderBottom: '1px solid var(--r-rule-strong)', padding: '8px 2px', fontSize: '14px', outline: 'none' }}
                        />
                        <span style={{ fontSize: '12px', color: 'var(--r-ink-muted)', marginTop: '4px', display: 'block' }}>
                          Evaluated with case-insensitive normalized grading
                        </span>
                      </div>
                    )}

                    {/* MATCHING PAIRS */}
                    {q.questionType === 'MATCHING' && (
                      <div style={{ padding: '14px', background: 'var(--r-surface)', borderRadius: '8px', border: '1px solid var(--r-rule)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--r-ink-muted)' }}>Match Column A with Column B:</span>
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
                              style={{ flex: 1, background: 'var(--r-paper)', border: '1px solid var(--r-rule)', borderRadius: '4px', padding: '6px 10px', fontSize: '13px' }}
                            />
                            <span style={{ color: 'var(--r-ink-muted)', fontWeight: 700 }}>⇄</span>
                            <input
                              type="text"
                              value={pair.right}
                              onChange={(e) => {
                                const next = [...(q.matchingPairs || [])];
                                next[pIdx].right = e.target.value;
                                updateQuestion(qIdx, { matchingPairs: next });
                              }}
                              placeholder={`Column B Match #${pIdx + 1}`}
                              style={{ flex: 1, background: 'var(--r-paper)', border: '1px solid var(--r-rule)', borderRadius: '4px', padding: '6px 10px', fontSize: '13px' }}
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
                          style={{ width: '100%', background: 'var(--r-surface)', border: '1px solid var(--r-rule)', borderRadius: '6px', padding: '10px 12px', fontSize: '13px', outline: 'none' }}
                        />
                      </div>
                    )}
                  </div>

                  {/* Marking scheme */}
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
                            <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--r-right)' }}>
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
                            <div style={{ padding: '8px', background: 'var(--r-paper)', borderRadius: '4px', border: '1px solid var(--r-right)', fontSize: '12px' }}>
                              <MathText text={q.explanation} />
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Item footer */}
                  {isActive && (
                    <div className="gf-item-footer">
                      {/* Difficulty Tag */}
                      <select
                        value={q.difficulty}
                        onChange={(e) => updateQuestion(qIdx, { difficulty: e.target.value as any })}
                        style={{ background: 'var(--r-surface)', border: '1px solid var(--r-rule)', borderRadius: '4px', padding: '4px 8px', fontSize: '12px', color: 'var(--r-ink-muted)', outline: 'none' }}
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

        {/* Tab 2: settings */}
        {activeTab === 'settings' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* Setting Card 1: Exam Timers & Board */}
            <div className="gf-item-sheet" style={{ cursor: 'default' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                <Clock size={20} color="var(--r-emerald)" />
                <h3 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--r-ink)' }}>Exam Schedule & Academic Board</h3>
              </div>

              <div className="mobile-stack-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div>
                  <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--r-ink-muted)', display: 'block', marginBottom: '4px' }}>Board</label>
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
                  <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--r-ink-muted)', display: 'block', marginBottom: '4px' }}>Grade / Class</label>
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

              <div className="mobile-stack-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginTop: '12px' }}>
                <div>
                  <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--r-ink-muted)', display: 'block', marginBottom: '4px' }}>Subject</label>
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
                  <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--r-ink-muted)', display: 'block', marginBottom: '4px' }}>Time Allowed (Minutes)</label>
                  <input
                    type="number"
                    min={1}
                    max={600}
                    value={durationMin}
                    onChange={(e) => { setDurationMin(Number(e.target.value)); markUnsaved(); }}
                    style={{ width: '100%', background: 'var(--r-paper)', border: '1px solid var(--r-rule)', borderRadius: '4px', padding: '10px 14px', fontSize: '14px', outline: 'none' }}
                  />
                </div>
              </div>
            </div>

            <div className="gf-item-sheet" style={{ cursor: 'default' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                <CheckSquare size={20} color="var(--r-emerald)" />
                <h3 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--r-ink)' }}>Availability & attempts</h3>
              </div>

              <div className="mobile-stack-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <label className="gf-field">
                  <span className="gf-field-label">Opens</span>
                  <input
                    type="datetime-local"
                    className="gf-field-input"
                    value={scheduleStart ? new Date(new Date(scheduleStart).getTime() - new Date(scheduleStart).getTimezoneOffset() * 60000).toISOString().slice(0, 16) : ''}
                    onChange={e => { setScheduleStart(e.target.value ? new Date(e.target.value).toISOString() : ''); markUnsaved(); }}
                  />
                </label>
                <label className="gf-field">
                  <span className="gf-field-label">Closes</span>
                  <input
                    type="datetime-local"
                    className="gf-field-input"
                    value={scheduleEnd ? new Date(new Date(scheduleEnd).getTime() - new Date(scheduleEnd).getTimezoneOffset() * 60000).toISOString().slice(0, 16) : ''}
                    onChange={e => { setScheduleEnd(e.target.value ? new Date(e.target.value).toISOString() : ''); markUnsaved(); }}
                  />
                </label>
              </div>

              <div className="gf-field-row">
                <label className="gf-field-toggle">
                  <span className="gf-field-label">Allow retries</span>
                  <div className="gf-switch">
                    <input
                      type="checkbox"
                      checked={settings.allowRetries}
                      onChange={e => { setSettings(p => ({ ...p, allowRetries: e.target.checked })); markUnsaved(); }}
                    />
                    <span className="gf-slider" />
                  </div>
                </label>
                <label className="gf-field gf-field-tight">
                  <span className="gf-field-label">Maximum attempts</span>
                  <input
                    type="number"
                    min={1}
                    max={100}
                    className="gf-field-input"
                    disabled={!settings.allowRetries}
                    value={settings.maxAttempts}
                    onChange={e => { setSettings(p => ({ ...p, maxAttempts: Number(e.target.value) })); markUnsaved(); }}
                  />
                </label>
              </div>

              <p style={{ fontSize: '13px', color: 'var(--r-ink-muted)', lineHeight: 1.5 }}>
                Required items should be answered before submission; unanswered items receive zero.
                Written responses require teacher marking.
              </p>
            </div>

            <div className="gf-item-sheet" style={{ cursor: 'default' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                <Shuffle size={20} color="var(--r-emerald)" />
                <h3 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--r-ink)' }}>Question delivery</h3>
              </div>

              <p style={{ fontSize: '13px', color: 'var(--r-ink-muted)', lineHeight: 1.5, marginBottom: '4px' }}>
                Shuffling changes what each student sees first without altering the paper or the answer key.
              </p>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px', padding: '12px 0', borderBottom: '1px solid var(--r-rule)' }}>
                <div>
                  <strong style={{ fontSize: '14px', color: 'var(--r-ink)', display: 'block' }}>Shuffle question order</strong>
                  <span style={{ fontSize: '12px', color: 'var(--r-ink-muted)' }}>Each attempt receives the items in a different order</span>
                </div>
                <div className="gf-switch">
                  <input
                    type="checkbox"
                    checked={settings.randomizeQuestions}
                    onChange={e => { setSettings(p => ({ ...p, randomizeQuestions: e.target.checked })); markUnsaved(); }}
                  />
                  <span className="gf-slider" />
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px', padding: '12px 0' }}>
                <div>
                  <strong style={{ fontSize: '14px', color: 'var(--r-ink)', display: 'block' }}>Shuffle answer choices</strong>
                  <span style={{ fontSize: '12px', color: 'var(--r-ink-muted)' }}>Multiple-choice options appear in a different order</span>
                </div>
                <div className="gf-switch">
                  <input
                    type="checkbox"
                    checked={settings.randomizeOptions}
                    onChange={e => { setSettings(p => ({ ...p, randomizeOptions: e.target.checked })); markUnsaved(); }}
                  />
                  <span className="gf-slider" />
                </div>
              </div>
            </div>

            <div className="gf-item-sheet" style={{ cursor: 'default' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                <MinusCircle size={20} color="var(--r-emerald)" />
                <h3 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--r-ink)' }}>Marking policy</h3>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px', padding: '12px 0', borderBottom: settings.negativeMarking ? '1px solid var(--r-rule)' : 'none' }}>
                <div>
                  <strong style={{ fontSize: '14px', color: 'var(--r-ink)', display: 'block' }}>Deduct marks for wrong answers</strong>
                  <span style={{ fontSize: '12px', color: 'var(--r-ink-muted)' }}>Only attempted questions that are answered incorrectly lose marks</span>
                </div>
                <div className="gf-switch">
                  <input
                    type="checkbox"
                    checked={settings.negativeMarking}
                    onChange={e => { setSettings(p => ({ ...p, negativeMarking: e.target.checked })); markUnsaved(); }}
                  />
                  <span className="gf-slider" />
                </div>
              </div>

              {settings.negativeMarking && (
                <div className="gf-field gf-field-tight" style={{ paddingTop: '12px' }}>
                  <span className="gf-field-label">Marks deducted per wrong answer</span>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    step={0.25}
                    className="gf-field-input"
                    value={settings.negativeMarkValue}
                    onChange={e => { setSettings(p => ({ ...p, negativeMarkValue: Math.max(0, Number(e.target.value) || 0) })); markUnsaved(); }}
                  />
                </div>
              )}

              <p style={{ fontSize: '13px', color: 'var(--r-ink-muted)', lineHeight: 1.5 }}>
                Unanswered questions always score zero. Written responses stay in the teacher marking queue.
              </p>
            </div>
            {/* Setting Card 2: Security & Anti-Cheating Sentinel */}
            <div className="gf-item-sheet" style={{ cursor: 'default' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                <ShieldAlert size={20} color="var(--r-emerald)" />
                <h3 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--r-ink)' }}>Anti-Cheating & Integrity Sentinel</h3>
              </div>

              <div style={{ padding: '12px', background: 'var(--r-subject-wash)', borderRadius: '6px', fontSize: '13px', color: 'var(--r-subject)', lineHeight: 1.5 }}>
                Tracks browser tab visibility changes, window blurs, and student navigation events in real-time with server-authoritative timestamps.
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid var(--r-rule)' }}>
                <div>
                  <strong style={{ fontSize: '14px', color: 'var(--r-ink)', display: 'block' }}>Enable Tab-Switch Monitoring</strong>
                  <span style={{ fontSize: '12px', color: 'var(--r-ink-muted)' }}>Warn student and record violations to teacher audit log</span>
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
                  <span style={{ fontSize: '13px', color: 'var(--r-ink-muted)' }}>Warning Alert Threshold:</span>
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
                      style={{ width: '60px', padding: '4px', textAlign: 'center', border: '1px solid var(--r-rule)', borderRadius: '4px', fontWeight: 700 }}
                    />
                    <span>switches</span>
                  </div>
                </div>
              )}
            </div>

            {/* Setting Card 3: Feedback & Score Release */}
            <div className="gf-item-sheet" style={{ cursor: 'default' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                <CheckCircle2 size={20} color="var(--r-emerald)" />
                <h3 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--r-ink)' }}>Release Scores & Feedback</h3>
              </div>

              <label style={{display:'block',padding:'0.75rem 0'}}>Result release policy <select className="gf-type-select" value={settings.resultVisibility} onChange={e=>{const policy=e.target.value as QuizSettings['resultVisibility'];setSettings(p=>({...p,resultVisibility:policy,immediateFeedback:policy==='IMMEDIATE'}));markUnsaved();}}><option value="IMMEDIATE">After submission</option><option value="MANUAL_RELEASE">Hold until teacher release</option><option value="SCHEDULED">At a scheduled time</option></select></label>{settings.resultVisibility==='SCHEDULED'&&<label>Release at <input type="datetime-local" required value={settings.resultReleaseDate?new Date(new Date(settings.resultReleaseDate).getTime()-new Date(settings.resultReleaseDate).getTimezoneOffset()*60000).toISOString().slice(0,16):''} onChange={e=>{setSettings(p=>({...p,resultReleaseDate:e.target.value?new Date(e.target.value).toISOString():null}));markUnsaved();}}/></label>}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid var(--r-rule)' }}>
                <div>
                  <strong style={{ fontSize: '14px', color: 'var(--r-ink)', display: 'block' }}>Immediately after each submission</strong>
                  <span style={{ fontSize: '12px', color: 'var(--r-ink-muted)' }}>Release objective score right away</span>
                </div>
                <div className="gf-switch">
                  <input
                    type="checkbox"
                    checked={settings.immediateFeedback}
                    onChange={(e) => {
                      setSettings(prev => ({ ...prev, immediateFeedback: e.target.checked, resultVisibility: e.target.checked ? 'IMMEDIATE' : 'MANUAL_RELEASE' }));
                      markUnsaved();
                    }}
                  />
                  <span className="gf-slider" />
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 0' }}>
                <div>
                  <strong style={{ fontSize: '14px', color: 'var(--r-ink)', display: 'block' }}>Show Correct Answers in Review</strong>
                  <span style={{ fontSize: '12px', color: 'var(--r-ink-muted)' }}>Show the answer key and teacher-provided explanations after results are released</span>
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

      <div style={{ maxWidth: 770, margin: '1rem auto' }}>{questions.some(q => q.reviewId) && <button className="gf-draft-btn" onClick={() => void syncReviews()}>Sync approved question revisions</button>}</div>
      {draftAvailable && (
        <div role="status" className="gf-draft-notice">
          <span className="gf-blank-rule">Unsaved draft</span>
          <p>This browser tab is holding changes that were never saved to the server.</p>
          <div className="gf-draft-notice-actions">
            <button type="button" className="gf-publish-btn" onClick={restoreDraft}>Restore local draft</button>
            <button
              type="button"
              className="gf-draft-btn"
              onClick={() => { sessionStorage.removeItem(draftKey.current); setDraftAvailable(false); }}
            >
              Discard
            </button>
          </div>
        </div>
      )}
      {/* Instrument tray */}
      <div className="gf-floating-toolbar">
        <button
          type="button"
          onClick={() => addQuestion('MCQ_SINGLE', questions.length ? activeQuestionIndex : undefined)}
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
          <Database size={20} color="var(--r-emerald)" />
        </button>

        <button
          type="button"
          onClick={() => setIsAiModalOpen(true)}
          className="gf-dock-btn"
          title="Generate with Gemini AI"
        >
          <Sparkles size={20} color="var(--r-flag)" />
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

      {/* SHARE QUIZ MODAL */}
      {isShareModalOpen && quizCode && (
        <ShareQuizModal
          code={quizCode}
          quizId={quizId!}
          onSaved={async()=>{try{const r=await fetch('/api/quizzes/'+quizId+'/release');if(r.ok){const {quiz:q}=await r.json();setSettings(p=>({...p,...q.settings,aiGradingMode:'OFF'}));setDurationMin(q.durationMin);setVisibility(q.visibility);setScheduleStart(q.scheduleStart||'');setScheduleEnd(q.scheduleEnd||'');}}catch{triggerToast('Settings saved. Reload to refresh the builder values.');}}}
          title={title}
          onClose={() => setIsShareModalOpen(false)}
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
  const dialogProps = useDialog(true, 'Question Bank Modal', onClose);
  const bankRequest = useRef(0);
  const [bankPage, setBankPage] = useState(1), [bankHasMore, setBankHasMore] = useState(false);
  const [bankError, setBankError] = useState('');
  const [selectedClass, setSelectedClass] = useState<string>(String(classLevel));
  const [bankQuestions, setBankQuestions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [difficultyFilter, setDifficultyFilter] = useState('ALL');

  useEffect(() => {
    const timer = setTimeout(() => void fetchBank(), 300); return () => clearTimeout(timer);
  }, [boardId, selectedClass, subject, difficultyFilter, search]);

  async function fetchBank(page = 1) {
    try {
      setLoading(true); setBankError(''); const requestId = ++bankRequest.current;
      const params = new URLSearchParams({
        page: String(page), boardId,
        classLevel: selectedClass,
        subject,
        difficulty: difficultyFilter
      });
      const res = await fetch(`/api/questions/bank?${params.toString()}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.message || 'Unable to load question bank.');
      if (data.success && requestId === bankRequest.current) {
        setBankQuestions(previous => page === 1 ? data.questions || [] : [...previous, ...(data.questions || [])]); setBankPage(page); setBankHasMore(Boolean(data.hasMore));
      }
    } catch (err) {
      setBankQuestions([]); setBankError(err instanceof Error ? err.message : 'Unable to load question bank.');
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
    <div {...dialogProps} className="gf-modal-backdrop">
      <div className="gf-modal-content">
        <div className="gf-modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Database size={22} color="var(--r-emerald)" />
            <div>
              <h3 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--r-ink)' }}>AKU-EB Question Bank</h3>
              <span style={{ fontSize: '12px', color: 'var(--r-ink-muted)' }}>Class {selectedClass === 'ALL' ? '9 & 10' : selectedClass} • {subject} • Solved Model Papers & Units</span>
            </div>
          </div>
          <button aria-label="Close dialog" onClick={onClose} className="gf-icon-btn">
            <X size={20} />
          </button>
        </div>

        {/* Filters */}
        <div style={{ padding: '12px 24px', background: 'var(--r-surface)', borderBottom: '1px solid var(--r-rule)', display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search questions by topic, formula, or keyword..."
            style={{ flex: 1, minWidth: '200px', background: 'var(--r-paper)', border: '1px solid var(--r-rule)', borderRadius: '4px', padding: '6px 12px', fontSize: '13px', outline: 'none' }}
          />
          <select
            value={selectedClass}
            onChange={(e) => setSelectedClass(e.target.value)}
            style={{ background: 'var(--r-paper)', border: '1px solid var(--r-rule)', borderRadius: '4px', padding: '6px 12px', fontSize: '13px', outline: 'none', fontWeight: 600 }}
          >
            <option value="9">Class 9 (SSC-I)</option>
            <option value="10">Class 10 (SSC-II)</option>
            <option value="ALL">All Classes (Combine SSC-I & II)</option>
          </select>
          <select
            value={difficultyFilter}
            onChange={(e) => setDifficultyFilter(e.target.value)}
            style={{ background: 'var(--r-paper)', border: '1px solid var(--r-rule)', borderRadius: '4px', padding: '6px 12px', fontSize: '13px', outline: 'none' }}
          >
            <option value="ALL">All Difficulties</option>
            <option value="Easy">Easy</option>
            <option value="Medium">Medium</option>
            <option value="Hard">Hard</option>
          </select>
          <button
            onClick={handleSelectAll}
            style={{ background: 'none', border: 'none', color: 'var(--r-emerald)', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}
          >
            {selectedIds.size === filtered.length && filtered.length > 0 ? 'Deselect All' : 'Select All'}
          </button>
        </div>


        {/* List */}
        <div className="gf-modal-body">{bankError && <p role="alert">{bankError}</p>}
          {loading ? (
            <div style={{ textAlign: 'center', padding: '40px', color: 'var(--r-ink-muted)', fontSize: '13px' }}>Loading questions from bank...</div>
          ) : filtered.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px', color: 'var(--r-ink-muted)', fontSize: '13px' }}>No questions found.</div>
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
                    border: isSelected ? '2px solid var(--r-emerald)' : '1px solid var(--r-rule)',
                    background: isSelected ? 'var(--r-emerald-wash)' : 'var(--r-paper)',
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                >
                  <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => {}}
                      style={{ marginTop: '3px', cursor: 'pointer', accentColor: 'var(--r-emerald)' }}
                    />
                    <div style={{ flex: 1 }}>
                      <p style={{ fontSize: '14px', fontWeight: 500, color: 'var(--r-ink)' }}>
                        <MathText text={item.stemText} />
                      </p>

                      {Array.isArray(item.options) && item.options.length > 0 && (
                        <div className="mobile-stack-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', marginTop: '8px' }}>
                          {item.options.map((opt: any, oIdx: number) => (
                            <div
                              key={oIdx}
                              style={{
                                fontSize: '12px',
                                padding: '4px 8px',
                                borderRadius: '4px',
                                background: opt.isCorrect ? 'var(--r-right-wash)' : 'var(--r-surface)',
                                color: opt.isCorrect ? 'var(--r-right)' : 'var(--r-ink)',
                                fontWeight: opt.isCorrect ? 700 : 400
                              }}
                            >
                              <strong>{String.fromCharCode(65 + oIdx)}.</strong> <MathText text={opt.text} />
                            </div>
                          ))}
                        </div>
                      )}

                      <div style={{ display: 'flex', gap: '8px', marginTop: '6px', fontSize: '11px', color: 'var(--r-ink-muted)' }}>
                        <span>{item.difficulty}</span>
                        <span>•</span>
                        {item.sourcePaper && <span style={{ color: 'var(--r-subject)', fontWeight: 600 }}>{item.sourcePaper}</span>}
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
        <div className="gf-modal-footer">{bankHasMore && <button type="button" disabled={loading} onClick={() => void fetchBank(bankPage + 1)}>Load more questions</button>}
          <span style={{ fontSize: '13px', color: 'var(--r-ink-muted)', marginRight: 'auto' }}>
            Selected: <strong style={{ color: 'var(--r-emerald)' }}>{selectedIds.size}</strong> questions
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
  const dialogProps = useDialog(true, 'Ai Generator Modal', onClose);
  const [pastJobs, setPastJobs] = useState<any[]>([]);
  const refreshJobs = () => { void fetch('/api/jobs?kind=AI_GENERATION').then(r => r.json()).then(data => setPastJobs(data.jobs || [])); };
  useEffect(() => { refreshJobs(); const timer = setInterval(refreshJobs, 10000); return () => clearInterval(timer); }, []);
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

      let data = await res.json();
      if (res.status === 202 && data.jobId) {
        const jobId = data.jobId;
        for (let poll = 0; poll < 300; poll++) {
          await new Promise(resolve => setTimeout(resolve, 2000));
          const statusResponse = await fetch('/api/jobs/' + encodeURIComponent(jobId));
          const statusData = await statusResponse.json();
          if (!statusResponse.ok) throw new Error(statusData.error?.message || 'Could not read generation status.');
          if (statusData.job.status === 'FAILED') throw new Error(statusData.job.error || 'Generation failed.');
          if (statusData.job.status === 'COMPLETED') { data = { success: true, ...statusData.job.result }; break; }
        }
      }
      if (data.success && Array.isArray(data.questions)) {
        setGeneratedList(data.questions);
        setSelectedIds(new Set(data.questions.map((_: any, idx: number) => idx)));
      } else {
        alert(typeof data.error === 'string' ? data.error : data.error?.message || 'Generation is still queued. Check the review queue when processing finishes.');
      }
    } catch (err: any) {
      console.error('AI Generation error:', err);
      alert(err.message || 'Error connecting to Gemini AI generator');
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
      reviewId: q.reviewId,
      sloId: q.sloId,
      correctAnswerText: q.correctAnswerText,
      rubric: q.rubric,
      options: q.options || [],
      explanation: q.explanation || ''
    }));
    onAddQuestions(chosen);
  };

  return (
    <div {...dialogProps} className="gf-modal-backdrop">
      <div className="gf-modal-content">
        <div className="gf-modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Sparkles size={22} color="var(--r-flag)" />
            <div>
              <h3 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--r-ink)' }}>Generate Questions with Gemini AI</h3>
              <span style={{ fontSize: '12px', color: 'var(--r-ink-muted)' }}>AKU-EB Syllabus Aligned</span>
            </div>
          </div>
          <button aria-label="Close dialog" onClick={onClose} className="gf-icon-btn"><X size={20} /></button>
        </div>

        <div className="gf-modal-body"><details><summary>Recent generation jobs</summary>{pastJobs.map(job => <p key={job.id}>{new Date(job.createdAt).toLocaleString()} — {job.status} {job.error} {Array.isArray(job.result?.questions) && <button type="button" onClick={() => { setGeneratedList(job.result.questions); setSelectedIds(new Set(job.result.questions.map((_: unknown, index: number) => index))); }}>Restore generated questions</button>}</p>)}</details>
          {generatedList.length === 0 ? (
            <>
              <div className="mobile-stack-grid" style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--r-ink-muted)', display: 'block', marginBottom: '4px' }}>Topic / Chapter</label>
                  <input
                    type="text"
                    value={topic}
                    onChange={(e) => setTopic(e.target.value)}
                    style={{ width: '100%', border: '1px solid var(--r-rule)', borderRadius: '4px', padding: '8px 12px', fontSize: '13px' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--r-ink-muted)', display: 'block', marginBottom: '4px' }}>Question Count</label>
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
                    style={{ width: '100%', border: '1px solid var(--r-rule)', borderRadius: '4px', padding: '8px 12px', fontSize: '13px' }}
                  />
                </div>
              </div>

              <div>
                <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--r-ink-muted)', display: 'block', marginBottom: '4px' }}>Difficulty Breakdown</label>
                <div className="mobile-stack-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
                  <div style={{ padding: '8px', background: 'var(--r-surface)', borderRadius: '4px', border: '1px solid var(--r-rule)' }}>
                    <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--r-right)', display: 'block', marginBottom: '2px' }}>Easy</span>
                    <input
                      type="number"
                      min={0}
                      value={easyCount}
                      onChange={(e) => setEasyCount(Number(e.target.value))}
                      style={{ width: '100%', border: '1px solid var(--r-rule)', padding: '4px', borderRadius: '4px' }}
                    />
                  </div>
                  <div style={{ padding: '8px', background: 'var(--r-surface)', borderRadius: '4px', border: '1px solid var(--r-rule)' }}>
                    <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--r-flag)', display: 'block', marginBottom: '2px' }}>Medium</span>
                    <input
                      type="number"
                      min={0}
                      value={mediumCount}
                      onChange={(e) => setMediumCount(Number(e.target.value))}
                      style={{ width: '100%', border: '1px solid var(--r-rule)', padding: '4px', borderRadius: '4px' }}
                    />
                  </div>
                  <div style={{ padding: '8px', background: 'var(--r-surface)', borderRadius: '4px', border: '1px solid var(--r-rule)' }}>
                    <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--r-wrong)', display: 'block', marginBottom: '2px' }}>Hard</span>
                    <input
                      type="number"
                      min={0}
                      value={hardCount}
                      onChange={(e) => setHardCount(Number(e.target.value))}
                      style={{ width: '100%', border: '1px solid var(--r-rule)', padding: '4px', borderRadius: '4px' }}
                    />
                  </div>
                </div>
              </div>

              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: 'var(--r-ink)', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={includeEquations}
                  onChange={(e) => setIncludeEquations(e.target.checked)}
                  style={{ accentColor: 'var(--r-emerald)' }}
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
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: 'var(--r-ink-muted)' }}>
                <span>Select questions to insert:</span>
                <button onClick={() => setGeneratedList([])} style={{ color: 'var(--r-emerald)', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}>Generate Again</button>
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
                    border: selectedIds.has(idx) ? '2px solid var(--r-emerald)' : '1px solid var(--r-rule)',
                    background: selectedIds.has(idx) ? 'var(--r-emerald-wash)' : 'var(--r-paper)',
                    cursor: 'pointer'
                  }}
                >
                  <p style={{ fontSize: '13px', fontWeight: 600 }}>
                    <MathText text={item.stemText} />
                  </p>
                  <div className="mobile-stack-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px', marginTop: '6px' }}>
                    {(item.options || []).map((opt: any, oIdx: number) => (
                      <div key={oIdx} style={{ fontSize: '11px', color: opt.isCorrect ? 'var(--r-right)' : 'var(--r-ink-muted)', fontWeight: opt.isCorrect ? 700 : 400 }}>
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
  const dialogProps = useDialog(true, 'Import Questions Modal', onClose);
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
      parsed.forEach(item => questionSchema.parse(item));
      const formatted = parsed.map((item, idx) => ({
        ...item, id: `q-imp-${Date.now()}-${idx}`,
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
    <div {...dialogProps} className="gf-modal-backdrop">
      <div className="gf-modal-content">
        <div className="gf-modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Upload size={20} color="var(--r-emerald)" />
            <h3 style={{ fontSize: '16px', fontWeight: 600 }}>Import Questions JSON</h3>
          </div>
          <button aria-label="Close dialog" onClick={onClose} className="gf-icon-btn"><X size={20} /></button>
        </div>
        <div className="gf-modal-body">
          <textarea
            value={jsonText}
            onChange={(e) => setJsonText(e.target.value)}
            rows={10}
            style={{ width: '100%', fontFamily: 'monospace', fontSize: '12px', padding: '12px', border: '1px solid var(--r-rule)', borderRadius: '4px' }}
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
  const dialogProps = useDialog(true, 'Student Preview Modal', onClose);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<number, any>>({});

  return (
    <div {...dialogProps} className="gf-modal-backdrop">
      <div className="gf-modal-content" style={{ maxWidth: '780px', maxHeight: '90vh' }}>
        <div className="gf-modal-header" style={{ background: 'var(--r-surface)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ background: 'var(--r-emerald-wash)', color: 'var(--r-emerald)', fontSize: '11px', fontWeight: 700, padding: '3px 8px', borderRadius: '12px' }}>
              Student Experience Simulation
            </span>
            <span style={{ fontSize: '12px', color: 'var(--r-ink-muted)' }}>Correct answers are hidden</span>
          </div>
          <button onClick={onClose} className="gf-draft-btn">Exit Preview</button>
        </div>

        <div className="gf-modal-body" style={{ background: 'var(--r-surface-sunk)', padding: '20px' }}>
          {/* Header Card */}
          <div className="gf-title-sheet" style={{ marginBottom: '14px' }}>
            <h2 style={{ fontSize: '26px', fontWeight: 500, color: 'var(--r-ink)' }}>{title}</h2>
            {description && <p style={{ fontSize: '14px', color: 'var(--r-ink-muted)', marginTop: '6px' }}>{description}</p>}
            <div style={{ fontSize: '12px', color: 'var(--r-ink-muted)', marginTop: '10px', paddingTop: '10px', borderTop: '1px solid var(--r-rule)' }}>
              {boardId} • Class {classLevel} • {subject} • Time Allowed: {durationMin} minutes
            </div>
          </div>

          {/* Question Cards */}
          {questions.map((q, idx) => (
            <div key={q.id} className="gf-item-sheet" style={{ cursor: 'default', marginBottom: '14px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--r-ink-muted)', textTransform: 'uppercase' }}>
                  Question {idx + 1} ({q.marks} {q.marks === 1 ? 'point' : 'points'})
                </span>
              </div>

              <div style={{ fontSize: '15px', fontWeight: 500, color: 'var(--r-ink)', lineHeight: 1.5 }}>
                <MathText text={q.stemText} />
              </div>

              {q.drawingSvg && (
                <div
                  style={{ padding: '8px', background: 'var(--r-paper)', border: '1px solid var(--r-rule)', borderRadius: '4px', maxWidth: '300px' }}
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
                          border: isChosen ? '2px solid var(--r-emerald)' : '1px solid var(--r-rule)',
                          background: isChosen ? 'var(--r-emerald-wash)' : 'var(--r-paper)',
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
                          border: isChosen ? '2px solid var(--r-emerald)' : '2px solid var(--r-rule-strong)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}>
                          {isChosen && <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--r-emerald)' }} />}
                        </div>
                        <span style={{ fontSize: '14px', color: 'var(--r-ink)' }}>
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
                          border: isChosen ? '2px solid var(--r-emerald)' : '1px solid var(--r-rule)',
                          background: isChosen ? 'var(--r-emerald-wash)' : 'var(--r-paper)',
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
                    style={{ border: 'none', borderBottom: '1px solid var(--r-rule-strong)', padding: '8px 4px', fontSize: '14px', width: '200px', outline: 'none' }}
                  />
                  {q.unit && <span style={{ fontSize: '14px', fontWeight: 600 }}>{q.unit}</span>}
                </div>
              )}

              {q.questionType === 'SHORT_ANSWER' && (
                <div style={{ marginTop: '8px' }}>
                  <input
                    type="text"
                    placeholder="Your answer"
                    style={{ width: '100%', maxWidth: '400px', border: 'none', borderBottom: '1px solid var(--r-rule-strong)', padding: '8px 4px', fontSize: '14px', outline: 'none' }}
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

// -------------------------------------------------------------------------------------
// SHARE QUIZ MODAL
// -------------------------------------------------------------------------------------

function ShareQuizModal({
  code,
  quizId,
  onSaved,
  title,
  onClose
}: {
  code: string;
  quizId: string;
  onSaved: () => void;
  title: string;
  onClose: () => void;
}) {
  const dialogProps = useDialog(true, 'Share Quiz Modal', onClose);
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [copyError,setCopyError]=useState('');
  const shareUrl = `${typeof window==='undefined'?'':window.location.origin}/?code=${encodeURIComponent(code)}`;

  const copy = async (value:string, kind:'code'|'url') => {
    setCopyError('');
    try { await navigator.clipboard.writeText(value); if(kind==='code')setCopiedCode(true);else setCopiedUrl(true);setTimeout(()=>{setCopiedCode(false);setCopiedUrl(false);},2000); }
    catch { setCopyError('Copy is unavailable. Select and copy the code or link manually.'); }
  };
  const copyCode=()=>void copy(code,'code');
  const copyUrl=()=>void copy(shareUrl,'url');

  return (
    <div {...dialogProps} className="gf-modal-backdrop" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="gf-modal-content" style={{ maxWidth: '760px', padding: '28px', borderRadius: '16px', maxHeight:'90dvh', overflowY:'auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: 'var(--r-subject-wash)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--r-subject)' }}>
              <Share2 size={24} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: 'var(--r-ink)' }}>Share Assessment</h3>
              <p style={{ margin: '2px 0 0', fontSize: '12px', color: 'var(--r-ink-muted)' }}>{title} · Code, link and student settings</p>
            </div>
          </div>
          <button aria-label="Close dialog" onClick={onClose} className="gf-icon-btn">
            <X size={20} />
          </button>
        </div>

        <div style={{ marginBottom: '18px' }}>
          <label style={{ display: 'block', fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--r-ink-muted)', marginBottom: '6px' }}>
            Unique Student Quiz Code
          </label>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <div style={{ flex: 1, minWidth:0, overflowWrap:'anywhere', background: 'var(--r-surface)', border: '2px solid var(--r-rule-strong)', borderRadius: '8px', padding: '12px 16px', fontSize: '18px', fontWeight: 800, letterSpacing: '2px', color: 'var(--r-emerald)' }}>
              {code}
            </div>
            <button
              onClick={copyCode}
              style={{ padding: '12px 18px', background: copiedCode ? 'var(--r-emerald)' : 'var(--r-emerald-press)', color: '#ffffff', border: 'none', borderRadius: '8px', fontWeight: 700, fontSize: '13px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              {copiedCode ? <Check size={16} /> : <Copy size={16} />}
              <span>{copiedCode ? 'Copied' : 'Copy Code'}</span>
            </button>
          </div>
        </div>

        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'block', fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--r-ink-muted)', marginBottom: '6px' }}>
            Direct Shareable URL
          </label>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <input
              type="text"
              readOnly
              value={shareUrl}
              style={{ flex: 1, minWidth:0, overflowWrap:'anywhere', background: 'var(--r-surface)', border: '1px solid var(--r-rule)', borderRadius: '8px', padding: '10px 14px', fontSize: '12px', color: 'var(--r-ink)', outline: 'none' }}
            />
            <button
              onClick={copyUrl}
              style={{ padding: '10px 16px', background: copiedUrl ? 'var(--r-emerald)' : 'var(--r-subject)', color: '#ffffff', border: 'none', borderRadius: '8px', fontWeight: 700, fontSize: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              {copiedUrl ? <Check size={14} /> : <Copy size={14} />}
              <span>{copiedUrl ? 'Copied' : 'Copy Link'}</span>
            </button>
          </div>
        </div>

        <div style={{ background: 'var(--r-right-wash)', border: '1px solid var(--r-right)', borderRadius: '10px', padding: '14px', fontSize: '12px', color: 'var(--r-right)', lineHeight: 1.5, marginBottom: '22px' }}>
          💡 <strong>Student Instructions:</strong> Students can open <strong>riselearner.com</strong>, sign in, and click <strong>"Enter Quiz Code"</strong> in the top menu bar to start. Students need an account. Private quizzes also require classroom enrollment. Results and recorded events appear in your Teacher Dashboard.
        </div>

        {copyError && <p role="alert">{copyError}</p>}
        <QuizSharingSettings quizId={quizId} onSaved={onSaved}/>
        <div style={{ display: 'flex', justifyContent: 'flex-end',marginTop:'1rem' }}>
          <button onClick={onClose} className="gf-publish-btn" style={{ padding: '9px 28px' }}>
            Done
          </button>
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
