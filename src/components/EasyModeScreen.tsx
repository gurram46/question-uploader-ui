import React, { useEffect, useMemo, useRef, useState } from 'react';
import { questionApi } from '../services/api';
import { getExpressBase, getPythonBase } from '../utils/apiBase';

type AnswerLetter = 'A' | 'B' | 'C' | 'D';

type DraftOption = {
  letter: string;
  text: string;
  is_correct: boolean;
  image_url?: string;
  image_urls?: string[];
};

type DraftQuestion = {
  question_id: string;
  questionNumber?: number | string;
  question_number?: number | string;
  questionText?: string;
  question_text?: string;
  options?: DraftOption[];
  correct_option_letters?: string | null;
  source_page?: number;
  subject_name?: string;
  chapter_name?: string;
  topic_name?: string;
  exam_type?: string;
  published_year?: number | string | null;
  question_fact?: string;
  verification_state?: string;
  difficulty_type?: string;
  difficulty_level?: number | null;
  questionType?: string;
  question_type?: string;
  image_url?: string;
  image_urls?: string[];
  explanation?: string;
  explanation_text?: string;
  explanation_image?: string;
  explanation_images?: string[];
};

type DraftAsset = {
  filename: string;
  source_page?: number;
  type?: string;
};

type DraftResponse = {
  batch_id?: string;
  status?: string;
  total_questions?: number;
  questions?: DraftQuestion[];
  image_assets?: Record<string, DraftAsset>;
};

type BatchSummary = {
  batch_id: string;
  job_id?: string;
  status: string;
  total_questions?: number;
  total_pages?: number;
  pages_done?: number;
  progress?: number;
  created_at?: string;
  updated_at?: string;
  uploaded_by?: string;
  upload_subject?: string;
  upload_chapter?: string;
  upload_topic?: string;
  file_name?: string;
};

type JobStatus = {
  job_id: string;
  batch_id: string;
  status: string;
  progress?: number;
  pages_done?: number;
  total_pages?: number;
  total_questions?: number;
};

type CommitResponse = {
  insertedCount?: number;
  inserted?: number;
  failedCount?: number;
  failed?: number;
  detail?: string;
};

const PYTHON_API_BASE = getPythonBase().replace(/\/$/, '');
const EXPRESS_API_BASE = getExpressBase().replace(/\/$/, '');
const EASY_ACTIVE_BATCH_KEY = 'dq_easy_mode_active_batch';
const EASY_META_KEY = 'dq_easy_mode_meta';
const REVIEW_INDEX_KEY = 'dq_easy_mode_review_index';
const ANSWER_CHOICES: AnswerLetter[] = ['A', 'B', 'C', 'D'];
const DIFFICULTY_TYPES = [
  'facts',
  'definitions',
  'simple mcqs',
  'direct mcqs',
  'statements',
  'matching',
  'diagramatic',
  'assertion and reason',
  'critical thinking',
  'numericals',
  'unknown',
];

const MATH_COMMAND_MAP = new Map<string, string>([
  ['alpha', 'α'],
  ['beta', 'β'],
  ['gamma', 'γ'],
  ['delta', 'δ'],
  ['theta', 'θ'],
  ['lambda', 'λ'],
  ['mu', 'μ'],
  ['pi', 'π'],
  ['sigma', 'σ'],
  ['phi', 'φ'],
  ['omega', 'ω'],
  ['Alpha', 'Α'],
  ['Beta', 'Β'],
  ['Gamma', 'Γ'],
  ['Delta', 'Δ'],
  ['Theta', 'Θ'],
  ['Lambda', 'Λ'],
  ['Pi', 'Π'],
  ['Sigma', 'Σ'],
  ['Phi', 'Φ'],
  ['Omega', 'Ω'],
  ['sqrt', '√'],
  ['times', '×'],
  ['cdot', '·'],
  ['div', '÷'],
  ['pm', '±'],
  ['mp', '∓'],
  ['leq', '≤'],
  ['geq', '≥'],
  ['neq', '≠'],
  ['approx', '≈'],
  ['infty', '∞'],
  ['degree', '°'],
]);

const SUPERSCRIPT_MAP = new Map<string, string>([
  ['0', '⁰'],
  ['1', '¹'],
  ['2', '²'],
  ['3', '³'],
  ['4', '⁴'],
  ['5', '⁵'],
  ['6', '⁶'],
  ['7', '⁷'],
  ['8', '⁸'],
  ['9', '⁹'],
  ['+', '⁺'],
  ['-', '⁻'],
  ['=', '⁼'],
  ['(', '⁽'],
  [')', '⁾'],
  ['n', 'ⁿ'],
  ['i', 'ⁱ'],
]);

const SUBSCRIPT_MAP = new Map<string, string>([
  ['0', '₀'],
  ['1', '₁'],
  ['2', '₂'],
  ['3', '₃'],
  ['4', '₄'],
  ['5', '₅'],
  ['6', '₆'],
  ['7', '₇'],
  ['8', '₈'],
  ['9', '₉'],
  ['+', '₊'],
  ['-', '₋'],
  ['=', '₌'],
  ['(', '₍'],
  [')', '₎'],
  ['a', 'ₐ'],
  ['e', 'ₑ'],
  ['h', 'ₕ'],
  ['i', 'ᵢ'],
  ['j', 'ⱼ'],
  ['k', 'ₖ'],
  ['l', 'ₗ'],
  ['m', 'ₘ'],
  ['n', 'ₙ'],
  ['o', 'ₒ'],
  ['p', 'ₚ'],
  ['r', 'ᵣ'],
  ['s', 'ₛ'],
  ['t', 'ₜ'],
  ['u', 'ᵤ'],
  ['v', 'ᵥ'],
  ['x', 'ₓ'],
]);

function looksMathHeavy(text: string) {
  return (
    /(\\[a-zA-Z]+)|(\^\{[^}]+\})|(_\{[^}]+\})|([A-Za-z0-9]\^[A-Za-z0-9])|([A-Za-z0-9]_[A-Za-z0-9])/.test(text) ||
    /[√∆ΔπθλμσαβγφωΠΣΩΘΛμ]/.test(text) ||
    /[⁰¹²³⁴⁵⁶⁷⁸⁹⁺⁻⁼⁽⁾ⁿⁱ₀₁₂₃₄₅₆₇₈₉₊₋₌₍₎ₐₑₕᵢⱼₖₗₘₙₒₚᵣₛₜᵤᵥₓ]/.test(text) ||
    /\b[A-Za-z]{1,4}[−-]?\d+\b/.test(text) ||
    /\b(?:sin|cos|tan|cot|sec|cosec|log|ln)\s*\d+/i.test(text) ||
    /[=±×÷≈≠≤≥∝∞∑∫∂]/.test(text)
  );
}

function mapScript(content: string, mapping: Map<string, string>, fallbackPrefix: string) {
  const converted = content
    .split('')
    .map(char => mapping.get(char) || '')
    .join('');

  return converted.length === content.length ? converted : `${fallbackPrefix}(${content})`;
}

function renderMathPreviewText(text: string) {
  return text
    .split(/\r?\n/)
    .map(line =>
      line
        .replace(/\\frac\s*\{([^{}]+)\}\s*\{([^{}]+)\}/g, '($1)/($2)')
        .replace(/\\sqrt\s*\{([^{}]+)\}/g, '√($1)')
        .replace(/\^\{([^}]+)\}/g, (_, content: string) => mapScript(content, SUPERSCRIPT_MAP, '^'))
        .replace(/_\{([^}]+)\}/g, (_, content: string) => mapScript(content, SUBSCRIPT_MAP, '_'))
        .replace(/\^([A-Za-z0-9+\-=()])/g, (_, content: string) => mapScript(content, SUPERSCRIPT_MAP, '^'))
        .replace(/_([A-Za-z0-9+\-=()])/g, (_, content: string) => mapScript(content, SUBSCRIPT_MAP, '_'))
        .replace(/\\([A-Za-z]+)/g, (_, command: string) => MATH_COMMAND_MAP.get(command) || command)
        .replace(/\\([{}])/g, '$1')
        .replace(/\\,/g, ' ')
        .replace(/~/g, ' ')
        .replace(/\\left|\\right/g, '')
        .replace(/[ \t]+/g, ' ')
        .trimEnd()
    )
    .join('\n')
    .trim();
}

function MathPreview({ text }: { text: string }) {
  if (!looksMathHeavy(text)) return null;

  return (
    <div className="easy-math-preview" aria-label="Math preview">
      <span className="easy-math-preview-label">Preview</span>
      <div className="easy-math-preview-body">{renderMathPreviewText(text)}</div>
    </div>
  );
}

type CatalogRow = {
  subject_name?: string;
  subjectName?: string;
  subject?: string;
  chapter_name?: string;
  chapterName?: string;
  chapter?: string;
  topic_name?: string;
  topicName?: string;
  topic?: string;
  exam_type?: string;
  examType?: string;
  exam_type_name?: string;
};

function authHeaders(): Record<string, string> {
  const token = localStorage.getItem('token') || '';
  return token ? { Authorization: `Bearer ${token}` } : {};
}

function apiFetch(input: RequestInfo | URL, init: RequestInit = {}) {
  const headers = init.headers ? { ...(init.headers as Record<string, string>) } : {};
  const token = localStorage.getItem('token') || '';
  if (token && !headers.Authorization) {
    headers.Authorization = `Bearer ${token}`;
  }
  return fetch(input, { ...init, headers });
}

function normalizeQuestionNumber(question: DraftQuestion, fallback: number): number {
  const raw = question.questionNumber ?? question.question_number ?? fallback;
  const parsed = Number(raw);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function normalizeQuestionText(question: DraftQuestion): string {
  return String(question.questionText ?? question.question_text ?? '').trim();
}

function normalizeOptionLetter(letter: string): string {
  const raw = String(letter || '').trim().toUpperCase();
  if (raw === '1') return 'A';
  if (raw === '2') return 'B';
  if (raw === '3') return 'C';
  if (raw === '4') return 'D';
  return raw || 'A';
}

function serializeCorrectAnswer(question: DraftQuestion): string {
  const direct = String(question.correct_option_letters || '').trim().toUpperCase();
  if (ANSWER_CHOICES.includes(direct as AnswerLetter)) {
    return direct;
  }
  if (direct.includes(',')) {
    const first = direct
      .split(',')
      .map(item => item.trim().toUpperCase())
      .find(item => ANSWER_CHOICES.includes(item as AnswerLetter));
    if (first) return first;
  }
  const options = Array.isArray(question.options) ? question.options : [];
  const selected = options.find(option => option.is_correct);
  return selected ? normalizeOptionLetter(selected.letter) : '';
}

function serializeCorrectAnswers(question: DraftQuestion): AnswerLetter[] {
  const direct = String(question.correct_option_letters || '')
    .split(',')
    .map(item => item.trim().toUpperCase())
    .filter(item => ANSWER_CHOICES.includes(item as AnswerLetter)) as AnswerLetter[];
  if (direct.length > 0) {
    return Array.from(new Set(direct));
  }
  const options = Array.isArray(question.options) ? question.options : [];
  return options
    .filter(option => option.is_correct)
    .map(option => normalizeOptionLetter(option.letter))
    .filter(letter => ANSWER_CHOICES.includes(letter as AnswerLetter)) as AnswerLetter[];
}

function patchOptionsWithAnswers(options: DraftOption[], answers: AnswerLetter[]): DraftOption[] {
  const wanted = new Set(answers.map(answer => String(answer || '').trim().toUpperCase()));
  return options.map(option => {
    const normalized = normalizeOptionLetter(option.letter);
    const numeric = String(option.letter || '').trim();
    const matches = wanted.has(normalized) || wanted.has(numeric);
    return { ...option, is_correct: matches };
  });
}

function ensureEditorOptions(options: DraftOption[]): DraftOption[] {
  const byLetter = new Map<string, DraftOption>();
  options.forEach(option => {
    const letter = normalizeOptionLetter(option.letter);
    byLetter.set(letter, { ...option, letter });
  });
  return ANSWER_CHOICES.map(letter => {
    const existing = byLetter.get(letter);
    return existing || { letter, text: '', is_correct: false };
  });
}

function firstImage(listOrSingle?: string[] | string): string {
  if (Array.isArray(listOrSingle)) return listOrSingle.find(Boolean) || '';
  return listOrSingle || '';
}

function toImageList(listOrSingle?: string[] | string): string[] {
  if (Array.isArray(listOrSingle)) return listOrSingle.filter(Boolean);
  return listOrSingle ? [listOrSingle] : [];
}

function normalizeAssetKey(name?: string): string {
  if (!name) return '';
  if (name.startsWith('images/')) return name;
  const activeBatch = localStorage.getItem(EASY_ACTIVE_BATCH_KEY) || '';
  return activeBatch ? `images/${activeBatch}/${name}` : name;
}

function formatDuration(seconds: number): string {
  const whole = Math.max(0, Math.floor(seconds));
  const minutes = Math.floor(whole / 60);
  const remaining = whole % 60;
  if (minutes <= 0) return `${remaining}s`;
  if (minutes < 60) return `${minutes}m ${remaining}s`;
  const hours = Math.floor(minutes / 60);
  return `${hours}h ${minutes % 60}m`;
}

function compactBatchId(value: string): string {
  const text = String(value || '').trim();
  if (text.length <= 8) return text;
  return text.slice(0, 8);
}

function compactFileName(value?: string): string {
  const text = String(value || '').trim();
  if (!text) return 'Untitled batch';
  if (text.length <= 18) return text;
  const dot = text.lastIndexOf('.');
  if (dot > 0 && text.length - dot <= 6) {
    return `${text.slice(0, 10)}...${text.slice(dot)}`;
  }
  return `${text.slice(0, 15)}...`;
}

function readCatalogSubject(row: CatalogRow): string {
  return (row.subject_name || row.subjectName || row.subject || '').trim();
}

function toUniqueSorted(values: string[]): string[] {
  return Array.from(new Set(values.filter(Boolean))).sort((a, b) => a.localeCompare(b));
}

function includeCurrentOption(options: string[], current: string): string[] {
  const trimmed = current.trim();
  if (!trimmed || options.includes(trimmed)) return options;
  return [trimmed, ...options];
}

function getReviewReasons(question: DraftQuestion): string[] {
  const reasons: string[] = [];
  const text = normalizeQuestionText(question);
  const options = Array.isArray(question.options) ? question.options : [];
  const nonEmptyOptions = options.filter(option => String(option.text || '').trim()).length;
  const answer = serializeCorrectAnswer(question);

  if (!question.subject_name || !question.chapter_name || !question.topic_name) reasons.push('Metadata missing');
  if (!text || text.length < 12) reasons.push('Question text needs attention');
  if (!answer) reasons.push('Answer missing');
  if (nonEmptyOptions < 2) reasons.push('Options incomplete');
  return reasons;
}

function buildBulkPayload(batchId: string, questions: DraftQuestion[]) {
  return questions.map(question => ({
    verification_state: question.verification_state || 'edited',
    batchId,
    subjectName: (question.subject_name || '').trim().toLowerCase(),
    chapterName: (question.chapter_name || '').trim().toLowerCase(),
    topicName: (question.topic_name || '').trim().toLowerCase(),
    examType: (question.exam_type || '').trim().toLowerCase(),
    publishedYear: question.published_year ?? null,
    questionFact: (question.question_fact || '').trim(),
    batchTag: '',
    difficultyLevel: question.difficulty_level ?? null,
    difficultyType:
      (question.difficulty_type || '').trim().toLowerCase() === 'unknown'
        ? null
        : (question.difficulty_type || '').trim().toLowerCase() || null,
    questionType: ((question.questionType || question.question_type || 'single_correct') as string)
      .trim()
      .toLowerCase(),
    questionText: normalizeQuestionText(question),
    questionImageKey: normalizeAssetKey(firstImage(question.image_urls || question.image_url)),
    questionImageKeys: toImageList(question.image_urls || question.image_url).map(item => normalizeAssetKey(item)).filter(Boolean),
    explanationText: String(question.explanation_text || question.explanation || '').trim() || null,
    explanationImageKey: normalizeAssetKey(firstImage(question.explanation_images || question.explanation_image)),
    explanationImageKeys: toImageList(question.explanation_images || question.explanation_image).map(item => normalizeAssetKey(item)).filter(Boolean),
    options: (Array.isArray(question.options) ? question.options : [])
      .filter(option => String(option.text || '').trim())
      .map(option => ({
        letter: normalizeOptionLetter(option.letter),
        text: String(option.text || ''),
        isCorrect: Boolean(option.is_correct),
        imageKey: normalizeAssetKey(firstImage(option.image_urls || option.image_url)),
        imageKeys: toImageList(option.image_urls || option.image_url).map(item => normalizeAssetKey(item)).filter(Boolean),
      })),
  }));
}

function compareQuestions(a: DraftQuestion, b: DraftQuestion): number {
  const pageA = Number(a.source_page || 0);
  const pageB = Number(b.source_page || 0);
  if (pageA !== pageB) {
    return pageA - pageB;
  }
  const qA = normalizeQuestionNumber(a, Number.MAX_SAFE_INTEGER);
  const qB = normalizeQuestionNumber(b, Number.MAX_SAFE_INTEGER);
  if (qA !== qB) {
    return qA - qB;
  }
  return String(a.question_id || '').localeCompare(String(b.question_id || ''));
}

const EasyModeScreen: React.FC = () => {
  const [batches, setBatches] = useState<BatchSummary[]>([]);
  const [catalogRows, setCatalogRows] = useState<CatalogRow[]>([]);
  const [selectedBatchId, setSelectedBatchId] = useState(localStorage.getItem(EASY_ACTIVE_BATCH_KEY) || '');
  const [draft, setDraft] = useState<DraftResponse | null>(null);
  const [jobStatus, setJobStatus] = useState<JobStatus | null>(null);
  const [sourceFile, setSourceFile] = useState<File | null>(null);
  const [answerKeyFile, setAnswerKeyFile] = useState<File | null>(null);
  const [appliedAnswerCount, setAppliedAnswerCount] = useState(0);
  const [answerKeyStatus, setAnswerKeyStatus] = useState('Upload an answer key if you have one.');
  const [uiError, setUiError] = useState('');
  const [uiNotice, setUiNotice] = useState('');
  const [commitResult, setCommitResult] = useState('');
  const [uploadingSource, setUploadingSource] = useState(false);
  const [metadataSaving, setMetadataSaving] = useState(false);
  const [validateBusy, setValidateBusy] = useState(false);
  const [commitBusy, setCommitBusy] = useState(false);
  const [savingQuestionId, setSavingQuestionId] = useState('');
  const [reviewIndex, setReviewIndex] = useState(Number(localStorage.getItem(REVIEW_INDEX_KEY) || '0'));
  const [showAllQuestions, setShowAllQuestions] = useState(false);
  const [showAllPage, setShowAllPage] = useState(0);
  const [showMetadataPanel, setShowMetadataPanel] = useState(true);
  const [showAnswerKeyPanel, setShowAnswerKeyPanel] = useState(true);
  const [zoomImage, setZoomImage] = useState<{ src: string; label: string } | null>(null);
  const [nowTs, setNowTs] = useState(Date.now());
  const [parseStartedAt, setParseStartedAt] = useState<number | null>(null);
  const [parseSeconds, setParseSeconds] = useState<number | null>(null);
  const [parseConfig, setParseConfig] = useState({
    startPage: '1',
    maxPages: '1',
    minQuestion: '1',
    maxQuestion: '1200',
  });
  const pollTimerRef = useRef<number | null>(null);
  const autoAppliedMetadataRef = useRef(new Map<string, string>());
  const [metadataDraft, setMetadataDraft] = useState({
    subject: '',
    chapter: '',
    topic: '',
    examType: '',
    publishedYear: '',
  });

  useEffect(() => {
    try {
      const raw = localStorage.getItem(EASY_META_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<typeof metadataDraft>;
        setMetadataDraft(prev => ({
          subject: parsed.subject || prev.subject,
          chapter: parsed.chapter || prev.chapter,
          topic: parsed.topic || prev.topic,
          examType: parsed.examType || prev.examType,
          publishedYear: parsed.publishedYear || prev.publishedYear,
        }));
      }
    } catch {
      // ignore local storage issues
    }
  }, []);

  useEffect(() => {
    const timer = window.setInterval(() => setNowTs(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    localStorage.setItem(EASY_META_KEY, JSON.stringify(metadataDraft));
  }, [metadataDraft]);

  useEffect(() => {
    localStorage.setItem(REVIEW_INDEX_KEY, String(reviewIndex));
  }, [reviewIndex]);

  useEffect(() => {
    void loadBatches();
  }, []);

  useEffect(() => {
    void loadCatalogRows();
  }, []);

  useEffect(() => {
    if (!selectedBatchId) {
      setDraft(null);
      setJobStatus(null);
      return;
    }
    localStorage.setItem(EASY_ACTIVE_BATCH_KEY, selectedBatchId);
    setReviewIndex(0);
    void loadDraft(selectedBatchId);
  }, [selectedBatchId]);

  useEffect(() => {
    if (pollTimerRef.current) {
      window.clearInterval(pollTimerRef.current);
      pollTimerRef.current = null;
    }
    const batch = batches.find(item => item.batch_id === selectedBatchId);
    if (!batch?.job_id || !['queued', 'running', 'paused_no_worker', 'paused_rate_limited'].includes(batch.status)) {
      return;
    }
    pollTimerRef.current = window.setInterval(() => {
      void pollJob(batch.job_id as string, batch.batch_id);
    }, 4000);
    return () => {
      if (pollTimerRef.current) {
        window.clearInterval(pollTimerRef.current);
        pollTimerRef.current = null;
      }
    };
  }, [batches, selectedBatchId]);

  async function loadBatches() {
    const response = await apiFetch(`${PYTHON_API_BASE}/draft/drafts`, { headers: authHeaders() });
    if (!response.ok) return;
    const data = (await response.json()) as BatchSummary[];
    const next = Array.isArray(data) ? data : [];
    setBatches(next);
    if (!selectedBatchId && next.length > 0) {
      setSelectedBatchId(next[0].batch_id);
    }
  }

  async function loadCatalogRows() {
    try {
      const rows = await questionApi.getQuestions();
      setCatalogRows(rows as unknown as CatalogRow[]);
    } catch {
      // Easy Mode still works without dropdown suggestions.
    }
  }

  function buildMetadataPatchFromDraft() {
    const patch: Record<string, unknown> = {};
    if (metadataDraft.subject.trim()) patch.subject_name = metadataDraft.subject.trim();
    if (metadataDraft.chapter.trim()) patch.chapter_name = metadataDraft.chapter.trim();
    if (metadataDraft.topic.trim()) patch.topic_name = metadataDraft.topic.trim();
    if (metadataDraft.examType.trim()) patch.exam_type = metadataDraft.examType.trim();
    if (metadataDraft.publishedYear.trim()) patch.published_year = metadataDraft.publishedYear.trim();
    return patch;
  }

  function metadataNeedsApplying(data: DraftResponse, patch: Record<string, unknown>) {
    if (!Array.isArray(data.questions) || data.questions.length === 0) return false;
    return data.questions.some(question => {
      if (typeof patch.subject_name === 'string' && String(question.subject_name || '').trim() !== patch.subject_name) return true;
      if (typeof patch.chapter_name === 'string' && String(question.chapter_name || '').trim() !== patch.chapter_name) return true;
      if (typeof patch.topic_name === 'string' && String(question.topic_name || '').trim() !== patch.topic_name) return true;
      if (typeof patch.exam_type === 'string' && String(question.exam_type || '').trim() !== patch.exam_type) return true;
      if (patch.published_year !== undefined && String(question.published_year ?? '').trim() !== String(patch.published_year).trim()) return true;
      return false;
    });
  }

  async function applyMetadataPatchToBatch(batchId: string, patch: Record<string, unknown>, silent = false) {
    const response = await apiFetch(`${PYTHON_API_BASE}/draft/${batchId}/bulk-update`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...authHeaders(),
      },
      body: JSON.stringify({ mode: 'all', patch }),
    });
    const data = (await response.json()) as { updated?: number; detail?: string };
    if (!response.ok) {
      if (!silent) {
        setUiError(data.detail || 'Failed to apply metadata.');
      }
      return false;
    }
    if (!silent) {
      setUiNotice(`Applied metadata to ${data.updated || 0} questions.`);
    }
    return true;
  }

  async function loadDraft(batchId: string) {
    const response = await apiFetch(`${PYTHON_API_BASE}/draft/${batchId}?page=1&limit=200`, {
      headers: authHeaders(),
    });
    if (!response.ok) return;
    const data = (await response.json()) as DraftResponse;
    setDraft(data);

    const metadataPatch = buildMetadataPatchFromDraft();
    const metadataSignature = JSON.stringify(metadataPatch);
    const shouldAutoApply =
      Object.keys(metadataPatch).length > 0 &&
      metadataNeedsApplying(data, metadataPatch) &&
      autoAppliedMetadataRef.current.get(batchId) !== metadataSignature;

    if (!shouldAutoApply) return;

    autoAppliedMetadataRef.current.set(batchId, metadataSignature);
    const applied = await applyMetadataPatchToBatch(batchId, metadataPatch, true);
    if (!applied) {
      autoAppliedMetadataRef.current.delete(batchId);
      return;
    }

    const refreshed = await apiFetch(`${PYTHON_API_BASE}/draft/${batchId}?page=1&limit=200`, {
      headers: authHeaders(),
    });
    if (!refreshed.ok) return;
    const refreshedData = (await refreshed.json()) as DraftResponse;
    setDraft(refreshedData);
    setUiNotice('Applied your metadata to the loaded questions.');
  }

  async function pollJob(jobId: string, batchId: string) {
    const response = await apiFetch(`${PYTHON_API_BASE}/draft/jobs/${jobId}`, { headers: authHeaders() });
    if (!response.ok) return;
    const data = (await response.json()) as JobStatus;
    setJobStatus(data);
    setBatches(prev =>
      prev.map(batch =>
        batch.batch_id === batchId
          ? {
              ...batch,
              status: data.status,
              progress: data.progress,
              pages_done: data.pages_done,
              total_pages: data.total_pages,
              total_questions: data.total_questions,
            }
          : batch
      )
    );
    if (selectedBatchId === batchId && ['queued', 'running', 'paused_no_worker', 'paused_rate_limited'].includes(data.status)) {
      await loadDraft(batchId);
    }
    if (data.status === 'done') {
      setUiNotice(`Batch ${batchId} is ready.`);
      await loadDraft(batchId);
      await loadBatches();
    }
  }

  async function uploadAsset(file: File): Promise<string | null> {
    if (!selectedBatchId) return null;
    const form = new FormData();
    form.append('file', file);
    const response = await apiFetch(`${PYTHON_API_BASE}/draft/assets/${selectedBatchId}/upload`, {
      method: 'POST',
      headers: authHeaders(),
      body: form,
    });
    if (!response.ok) {
      setUiError('Image upload failed.');
      return null;
    }
    const data = (await response.json()) as { filename?: string; key?: string };
    return data.filename || data.key || null;
  }

  async function attachImageToTarget(question: DraftQuestion, filename: string, target: 'question' | 'explanation' | 'option', optionLetter?: string) {
    if (target === 'question') {
      await patchQuestion(question.question_id, {
        image_url: filename,
        image_urls: Array.from(new Set([...(currentQuestionImages || []), filename])),
      });
      return;
    }

    if (target === 'explanation') {
      await patchQuestion(question.question_id, {
        explanation_image: filename,
        explanation_images: Array.from(new Set([...(currentExplanationImages || []), filename])),
      });
      return;
    }

    const nextOptions = currentOptions.map(item =>
      item.letter === optionLetter
        ? {
            ...item,
            image_url: filename,
            image_urls: Array.from(new Set([...(item.image_urls || []), filename])),
          }
        : item
    );
    await patchQuestion(question.question_id, { options: nextOptions });
  }

  async function removeImageFromTarget(question: DraftQuestion, filename: string, target: 'question' | 'explanation' | 'option', optionLetter?: string) {
    if (target === 'question') {
      const nextImages = currentQuestionImages.filter(item => item !== filename);
      await patchQuestion(question.question_id, {
        image_url: nextImages[0] || '',
        image_urls: nextImages,
      });
      return;
    }

    if (target === 'explanation') {
      const nextImages = currentExplanationImages.filter(item => item !== filename);
      await patchQuestion(question.question_id, {
        explanation_image: nextImages[0] || '',
        explanation_images: nextImages,
      });
      return;
    }

    const nextOptions = currentOptions.map(item => {
      if (item.letter !== optionLetter) return item;
      const nextImages = toImageList(item.image_urls || item.image_url).filter(image => image !== filename);
      return {
        ...item,
        image_url: nextImages[0] || '',
        image_urls: nextImages,
      };
    });
    await patchQuestion(question.question_id, { options: nextOptions });
  }

  async function uploadSourceBatch() {
    if (!sourceFile) {
      setUiError('Choose a PDF or DOCX first.');
      return;
    }
    setUiError('');
    setUiNotice('');
    setUploadingSource(true);
    const form = new FormData();
    form.append('file', sourceFile);
    const username = localStorage.getItem('username') || '';
    if (username) form.append('uploaded_by', username);
    if (metadataDraft.subject.trim()) form.append('upload_subject', metadataDraft.subject.trim());
    if (metadataDraft.chapter.trim()) form.append('upload_chapter', metadataDraft.chapter.trim());
    if (metadataDraft.topic.trim()) form.append('upload_topic', metadataDraft.topic.trim());
    const response = await apiFetch(`${PYTHON_API_BASE}/draft/upload`, {
      method: 'POST',
      headers: authHeaders(),
      body: form,
    });
    const data = (await response.json()) as { batch_id?: string; job_id?: string; status?: string; detail?: string };
    setUploadingSource(false);
    if (!response.ok || !data.batch_id) {
      setUiError(data.detail || 'Upload failed.');
      return;
    }
    setSelectedBatchId(data.batch_id);
    setJobStatus({
      batch_id: data.batch_id,
      job_id: data.job_id || '',
      status: data.status || 'queued',
      progress: 0,
      pages_done: 0,
    });
    setUiNotice(`Upload started for batch ${data.batch_id}.`);
    await loadBatches();
    if (data.job_id) await pollJob(data.job_id, data.batch_id);
  }

  async function deleteBatch(batchId: string) {
    if (!batchId) return;
    // eslint-disable-next-line no-alert
    const ok = window.confirm(`Delete batch ${batchId}? This will remove the draft and job.`);
    if (!ok) return;
    setUiError('');
    setUiNotice('');
    const response = await apiFetch(`${PYTHON_API_BASE}/draft/${batchId}`, {
      method: 'DELETE',
      headers: authHeaders(),
    });
    if (!response.ok) {
      const message = await response.text();
      setUiError(message || 'Failed to delete this batch.');
      return;
    }
    const remaining = batches.filter(batch => batch.batch_id !== batchId);
    setBatches(remaining);
    if (selectedBatchId === batchId) {
      const nextBatchId = remaining[0]?.batch_id || '';
      setSelectedBatchId(nextBatchId);
      if (!nextBatchId) {
        setDraft(null);
        setJobStatus(null);
      }
    }
    setUiNotice(`Deleted batch ${batchId}.`);
  }

  async function parseAnswerKey() {
    if (!answerKeyFile) {
      setUiError('Choose an answer key file first.');
      return;
    }
    setUiError('');
    setUiNotice('');
    const parseStart = Date.now();
    setParseStartedAt(parseStart);
    setParseSeconds(null);
    setAppliedAnswerCount(0);
    setAnswerKeyStatus('Uploading key...');
    const form = new FormData();
    form.append('file', answerKeyFile);
    const startPage = Math.max(1, Number(parseConfig.startPage) || answerKeyScope.startPage);
    const maxPages = Math.max(1, Number(parseConfig.maxPages) || answerKeyScope.maxPages);
    const minQuestion = Math.max(1, Number(parseConfig.minQuestion) || answerKeyScope.minQuestion);
    const maxQuestion = Math.max(minQuestion, Number(parseConfig.maxQuestion) || answerKeyScope.maxQuestion);
    const params = new URLSearchParams({
      max_pages: String(maxPages),
      start_page: String(startPage),
      min_q: String(minQuestion),
      max_q: String(maxQuestion),
      ocr_dpi: String(answerKeyScope.ocrDpi),
    });
    const parseResponse = await apiFetch(
      `${PYTHON_API_BASE}/draft/answer-key/parse?${params.toString()}`,
      {
        method: 'POST',
        headers: authHeaders(),
        body: form,
      }
    );
    const parseData = (await parseResponse.json()) as { pairs?: Array<{ number: number; answer: string }>; detail?: string };
    setParseSeconds(Math.max(0, Math.floor((Date.now() - parseStart) / 1000)));
    setParseStartedAt(null);
    if (!parseResponse.ok) {
      setUiError(parseData.detail || 'Could not upload the key.');
      setAnswerKeyStatus('Could not upload the key.');
      return;
    }
    const pairs = Array.isArray(parseData.pairs) ? parseData.pairs : [];
    if (!selectedBatchId) {
      setUiError('Choose or create a batch first.');
      setAnswerKeyStatus('Choose or create a batch first.');
      return;
    }
    const validPairs = pairs
      .map(pair => ({
        number: Number(pair.number),
        answer: String(pair.answer || '').trim().toUpperCase(),
      }))
      .filter(pair => Number.isFinite(pair.number) && pair.number > 0 && ANSWER_CHOICES.includes(pair.answer as AnswerLetter));
    if (!validPairs.length) {
      setUiError('No answers were found in the key.');
      setAnswerKeyStatus('No answers found in the key.');
      return;
    }
    setUiError('');
    setAnswerKeyStatus('Applying key to questions...');
    const applyResponse = await apiFetch(`${PYTHON_API_BASE}/draft/${selectedBatchId}/answer-key/apply`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...authHeaders(),
      },
      body: JSON.stringify({
        pairs: validPairs,
        overwrite_existing: true,
        min_q: 1,
        max_q: Math.max(...validPairs.map(pair => pair.number)),
      }),
    });
    const applyData = (await applyResponse.json()) as { applied_count?: number; detail?: string };
    if (!applyResponse.ok) {
      setUiError(applyData.detail || 'Failed to apply the key.');
      setAnswerKeyStatus('Failed to apply the key.');
      return;
    }
    const appliedCount = applyData.applied_count || 0;
    setAppliedAnswerCount(appliedCount);
    setUiNotice(`Keys applied. Applied ${appliedCount} answers. Please fact-check while reviewing.`);
    setAnswerKeyStatus(`Keys applied. Applied ${appliedCount} answers. Please fact-check while reviewing.`);
    await loadDraft(selectedBatchId);
  }

  async function patchQuestion(questionId: string, patch: Record<string, unknown>) {
    if (!selectedBatchId) return false;
    setSavingQuestionId(questionId);
    const response = await apiFetch(`${PYTHON_API_BASE}/draft/${selectedBatchId}/question/${questionId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...authHeaders(),
      },
      body: JSON.stringify({ patch }),
    });
    setSavingQuestionId('');
    if (!response.ok) {
      setUiError('Failed to save this question change.');
      return false;
    }
    setDraft(prev => {
      if (!prev?.questions) return prev;
      return {
        ...prev,
        questions: prev.questions.map(question =>
          question.question_id === questionId ? ({ ...question, ...patch } as DraftQuestion) : question
        ),
      };
    });
    return true;
  }

  async function applyMetadataToAll() {
    if (!selectedBatchId) return;
    const patch = buildMetadataPatchFromDraft();
    if (Object.keys(patch).length === 0) {
      setUiError('Enter metadata before applying it to the batch.');
      return;
    }
    setMetadataSaving(true);
    setUiError('');
    autoAppliedMetadataRef.current.set(selectedBatchId, JSON.stringify(patch));
    const applied = await applyMetadataPatchToBatch(selectedBatchId, patch);
    setMetadataSaving(false);
    if (!applied) {
      autoAppliedMetadataRef.current.delete(selectedBatchId);
      return;
    }
    await loadDraft(selectedBatchId);
  }

  async function validateBatchBeforeCommit() {
    if (!selectedBatchId || !draft?.questions?.length) return;
    setValidateBusy(true);
    setUiError('');
    const payload = buildBulkPayload(selectedBatchId, draft.questions);
    const response = await apiFetch(`${EXPRESS_API_BASE}/api/questions/validate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...authHeaders(),
      },
      body: JSON.stringify({ questions: payload }),
    });
    const data = (await response.json()) as { validCount?: number; failedCount?: number; detail?: string };
    setValidateBusy(false);
    if (!response.ok) {
      setUiError(data.detail || 'Validation failed.');
      return;
    }
    setUiNotice(`Check complete. Valid ${data.validCount || 0}, failed ${data.failedCount || 0}.`);
  }

  async function commitBatch() {
    if (!selectedBatchId || !draft?.questions?.length) return;
    setCommitBusy(true);
    setUiError('');
    setCommitResult('');
    const payload = buildBulkPayload(selectedBatchId, draft.questions);
    const response = await apiFetch(`${EXPRESS_API_BASE}/api/questions/bulk`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...authHeaders(),
      },
      body: JSON.stringify({ questions: payload, chunkSize: 100 }),
    });
    const data = (await response.json()) as CommitResponse;
    setCommitBusy(false);
    if (!response.ok) {
      setUiError(data.detail || 'Commit failed.');
      return;
    }
    const inserted = data.insertedCount ?? data.inserted ?? 0;
    const failed = data.failedCount ?? data.failed ?? 0;
    setCommitResult(`Committed ${inserted} questions.${failed > 0 ? ` ${failed} failed.` : ''}`);
    setUiNotice(`Commit finished. Inserted ${inserted}.`);
  }

  async function commitCurrentQuestion(question: DraftQuestion) {
    if (!selectedBatchId) return;
    setCommitBusy(true);
    setUiError('');
    setCommitResult('');
    const payload = buildBulkPayload(selectedBatchId, [question]);
    const response = await apiFetch(`${EXPRESS_API_BASE}/api/questions/bulk`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...authHeaders(),
      },
      body: JSON.stringify({ questions: payload, chunkSize: 1 }),
    });
    const data = (await response.json()) as CommitResponse;
    setCommitBusy(false);
    if (!response.ok) {
      setUiError(data.detail || 'Question commit failed.');
      return;
    }
    const inserted = data.insertedCount ?? data.inserted ?? 0;
    const failed = data.failedCount ?? data.failed ?? 0;
    if (inserted > 0) {
      setUiNotice(`Question Q${normalizeQuestionNumber(question, 1)} committed.`);
      setCommitResult(`Committed 1 question.${failed > 0 ? ` ${failed} failed.` : ''}`);
      setReviewIndex(prev => prev);
      await loadDraft(selectedBatchId);
      return;
    }
    setUiError(failed > 0 ? 'Question commit failed.' : 'No question was committed.');
  }

  async function commitQuestionFromShowAll(question: DraftQuestion) {
    await commitCurrentQuestion(question);
  }

  async function commitVisibleQuestionsAndNextPage() {
    if (!selectedBatchId || !visibleReviewItems.length) return;
    setCommitBusy(true);
    setUiError('');
    setCommitResult('');
    const payload = buildBulkPayload(
      selectedBatchId,
      visibleReviewItems.map(item => item.question)
    );
    const response = await apiFetch(`${EXPRESS_API_BASE}/api/questions/bulk`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...authHeaders(),
      },
      body: JSON.stringify({ questions: payload, chunkSize: 5 }),
    });
    const data = (await response.json()) as CommitResponse;
    setCommitBusy(false);
    if (!response.ok) {
      setUiError(data.detail || 'Page commit failed.');
      return;
    }
    const inserted = data.insertedCount ?? data.inserted ?? 0;
    const failed = data.failedCount ?? data.failed ?? 0;
    setCommitResult(`Committed ${inserted} questions.${failed > 0 ? ` ${failed} failed.` : ''}`);
    setUiNotice(`Committed ${inserted} questions from this page.`);
    if (selectedBatchId) {
      await loadDraft(selectedBatchId);
    }
    setShowAllPage(prev => Math.min(showAllPageCount - 1, prev + 1));
  }

  function goToNextQuestionToFix() {
    setReviewIndex(prev => Math.min(reviewQueue.length - 1, prev + 1));
  }

  function saveAndNextCurrentQuestion() {
    const active = document.activeElement as HTMLElement | null;
    active?.blur();
    window.setTimeout(() => {
      goToNextQuestionToFix();
    }, 0);
  }

  const questions = useMemo(() => {
    const next = [...(draft?.questions || [])];
    next.sort(compareQuestions);
    return next;
  }, [draft?.questions]);
  const selectedBatch = useMemo(
    () => batches.find(batch => batch.batch_id === selectedBatchId) || null,
    [batches, selectedBatchId]
  );
  const answerKeyScope = useMemo(() => {
    const pageNumbers = questions
      .map(question => Number(question.source_page || 0))
      .filter(page => Number.isFinite(page) && page > 0);
    const questionNumbers = questions
      .map((question, index) => normalizeQuestionNumber(question, index + 1))
      .filter(number => Number.isFinite(number) && number > 0);

    const maxPageFromQuestions = pageNumbers.length ? Math.max(...pageNumbers) : 0;
    const totalPages =
      maxPageFromQuestions ||
      Number(jobStatus?.total_pages || 0) ||
      Number(selectedBatch?.total_pages || 0) ||
      1;

    const minQuestion = questionNumbers.length ? Math.min(...questionNumbers) : 1;
    const maxQuestion =
      questionNumbers.length
        ? Math.max(...questionNumbers)
        : Number(jobStatus?.total_questions || 0) || Number(selectedBatch?.total_questions || 0) || 1200;

    return {
      startPage: 1,
      maxPages: Math.max(1, totalPages),
      minQuestion: Math.max(1, minQuestion),
      maxQuestion: Math.max(1, maxQuestion),
      ocrDpi: 300,
    };
  }, [jobStatus?.total_pages, jobStatus?.total_questions, questions, selectedBatch?.total_pages, selectedBatch?.total_questions]);
  useEffect(() => {
    setParseConfig(prev => ({
      startPage: prev.startPage && prev.startPage !== '1' ? prev.startPage : String(answerKeyScope.startPage),
      maxPages: String(answerKeyScope.maxPages),
      minQuestion: String(answerKeyScope.minQuestion),
      maxQuestion: String(answerKeyScope.maxQuestion),
    }));
  }, [answerKeyScope.maxPages, answerKeyScope.maxQuestion, answerKeyScope.minQuestion, answerKeyScope.startPage]);
  const subjectOptions = useMemo(
    () =>
      includeCurrentOption(
        toUniqueSorted(catalogRows.map(row => readCatalogSubject(row))),
        metadataDraft.subject
      ),
    [catalogRows, metadataDraft.subject]
  );
  const assetEntries = useMemo(
    () => Object.entries(draft?.image_assets || {}).map(([key, asset]) => ({ key, ...asset })),
    [draft]
  );

  const reviewQueue = useMemo(
    () =>
      questions
        .map((question, index) => ({ question, index, reasons: getReviewReasons(question) }))
        .filter(item => item.reasons.length > 0),
    [questions]
  );

  useEffect(() => {
    if (reviewQueue.length === 0) {
      setReviewIndex(0);
      return;
    }
    if (reviewIndex > reviewQueue.length - 1) {
      setReviewIndex(0);
    }
  }, [reviewIndex, reviewQueue.length]);

  useEffect(() => {
    if (reviewQueue.length === 0) {
      setShowAllPage(0);
      return;
    }
    const maxPage = Math.max(0, Math.ceil(reviewQueue.length / 5) - 1);
    if (showAllPage > maxPage) {
      setShowAllPage(maxPage);
    }
  }, [reviewQueue.length, showAllPage]);

  const safeReviewIndex = reviewIndex >= 0 && reviewIndex < reviewQueue.length ? reviewIndex : 0;
  const currentReviewItem = reviewQueue.find((_, index) => index === safeReviewIndex) || null;
  const currentQuestion = currentReviewItem?.question || null;
  const currentQuestionNumber = currentQuestion
    ? normalizeQuestionNumber(currentQuestion, currentReviewItem ? currentReviewItem.index + 1 : 1)
    : 0;
  const currentOptions = currentQuestion && Array.isArray(currentQuestion.options) ? ensureEditorOptions(currentQuestion.options) : ensureEditorOptions([]);
  const currentAnswers = currentQuestion ? serializeCorrectAnswers(currentQuestion) : [];
  const currentQuestionType = currentQuestion?.questionType || currentQuestion?.question_type || 'single_correct';
  const currentDifficultyType = currentQuestion?.difficulty_type || '';
  const currentLevel =
    currentQuestion?.difficulty_level !== null && currentQuestion?.difficulty_level !== undefined
      ? String(currentQuestion.difficulty_level)
      : '';
  const currentExplanation = String(currentQuestion?.explanation_text || currentQuestion?.explanation || '').trim();
  const currentQuestionImages = toImageList(currentQuestion?.image_urls || currentQuestion?.image_url);
  const currentExplanationImages = toImageList(currentQuestion?.explanation_images || currentQuestion?.explanation_image);
  const currentPageAssets = currentQuestion
    ? assetEntries.filter(asset => asset.source_page === currentQuestion.source_page)
    : [];
  const currentContextSubject = String(currentQuestion?.subject_name || metadataDraft.subject || '').trim() || 'No subject';
  const currentContextChapter = String(currentQuestion?.chapter_name || metadataDraft.chapter || '').trim() || 'No chapter';
  const currentContextTopic = String(currentQuestion?.topic_name || metadataDraft.topic || '').trim() || 'No topic';

  const summary = useMemo(() => {
    const unanswered = questions.filter(question => !serializeCorrectAnswer(question)).length;
    const blankText = questions.filter(question => normalizeQuestionText(question).length < 12).length;
    const missingMetadata = questions.filter(question => !question.subject_name || !question.chapter_name || !question.topic_name || !question.exam_type).length;
    return {
      total: questions.length,
      reviewNeeded: reviewQueue.length,
      unanswered,
      blankText,
      missingMetadata,
    };
  }, [questions, reviewQueue.length]);

  const completedCount = Math.max(0, summary.total - summary.reviewNeeded);
  const selectedBatchProgress = useMemo(() => {
    const totalPages = Number(jobStatus?.total_pages || selectedBatch?.total_pages || 0);
    const pagesDone = Number(jobStatus?.pages_done || selectedBatch?.pages_done || 0);
    const explicitProgress = Number(jobStatus?.progress ?? selectedBatch?.progress ?? NaN);

    const percent = Number.isFinite(explicitProgress)
      ? Math.max(0, Math.min(100, explicitProgress))
      : totalPages > 0
        ? Math.max(0, Math.min(100, Math.round((pagesDone / totalPages) * 100)))
        : selectedBatch?.status === 'done'
          ? 100
          : 0;

    const status =
      jobStatus?.status ||
      selectedBatch?.status ||
      (percent >= 100 ? 'done' : 'waiting');

    const message =
      status === 'done'
        ? 'Batch is ready'
        : status === 'queued'
          ? 'Waiting to start'
          : status === 'running'
            ? 'Reading questions'
            : 'Batch progress';

    return {
      percent,
      status,
      message,
      pagesDone,
      totalPages,
    };
  }, [jobStatus?.pages_done, jobStatus?.progress, jobStatus?.status, jobStatus?.total_pages, selectedBatch?.pages_done, selectedBatch?.progress, selectedBatch?.status, selectedBatch?.total_pages]);

  const missingQuestionNumbers = useMemo(() => {
    const presentNumbers = Array.from(
      new Set(
        questions
          .map((question, index) => normalizeQuestionNumber(question, index + 1))
          .filter(number => Number.isFinite(number) && number > 0)
      )
    ).sort((a, b) => a - b);

    if (presentNumbers.length === 0) return [];

    const present = new Set(presentNumbers);
    const missing: number[] = [];
    const firstLoaded = presentNumbers[0] || 1;
    const lastLoaded = presentNumbers[presentNumbers.length - 1] || firstLoaded;
    for (let number = firstLoaded; number <= lastLoaded; number += 1) {
      if (!present.has(number)) {
        missing.push(number);
      }
    }
    return missing;
  }, [questions]);

  const parseElapsed = parseStartedAt ? Math.floor((nowTs - parseStartedAt) / 1000) : null;
  const showAllPageSize = 5;
  const showAllPageCount = Math.max(1, Math.ceil(reviewQueue.length / showAllPageSize));
  const safeShowAllPage = Math.min(Math.max(showAllPage, 0), showAllPageCount - 1);
  const showAllStart = safeShowAllPage * showAllPageSize;
  const visibleReviewItems = reviewQueue.slice(showAllStart, showAllStart + showAllPageSize);

  function assetUrl(filename: string) {
    const token = encodeURIComponent(localStorage.getItem('token') || '');
    return `${PYTHON_API_BASE}/draft/assets/${encodeURIComponent(selectedBatchId)}/${encodeURIComponent(filename)}?token=${token}`;
  }

  function openZoom(filename: string, label: string) {
    setZoomImage({ src: assetUrl(filename), label });
  }

  function renderPagedQuestionCard(item: { question: DraftQuestion; index: number; reasons: string[] }) {
    const question = item.question;
    const questionNumber = normalizeQuestionNumber(question, item.index + 1);
    const options = Array.isArray(question.options) ? ensureEditorOptions(question.options) : ensureEditorOptions([]);
    const questionType = question.questionType || question.question_type || 'single_correct';
    const level =
      question.difficulty_level !== null && question.difficulty_level !== undefined ? String(question.difficulty_level) : '';
    const difficultyType = question.difficulty_type || '';
    const explanationText = String(question.explanation_text || question.explanation || '').trim();
    const questionImages = toImageList(question.image_urls || question.image_url);
    const explanationImages = toImageList(question.explanation_images || question.explanation_image);
    const pageAssets = assetEntries.filter(asset => asset.source_page === question.source_page);
    const contextSubject = String(question.subject_name || metadataDraft.subject || '').trim() || 'No subject';
    const contextChapter = String(question.chapter_name || metadataDraft.chapter || '').trim() || 'No chapter';
    const contextTopic = String(question.topic_name || metadataDraft.topic || '').trim() || 'No topic';

    return (
      <article key={question.question_id} className="easy-batch-question-card easy-batch-question-card--compact">
        <div className="easy-batch-question-head">
          <div>
            <strong>Q{questionNumber}</strong>
            <span>Page {question.source_page || '?'}</span>
          </div>
          <div className="easy-batch-question-tools">
            <div className="easy-focus-tags">
              {item.reasons.map(reason => (
                <span key={`${question.question_id}-${reason}`}>{reason}</span>
              ))}
            </div>
            <div className="easy-batch-question-actions">
              <button
                className="easy-btn subtle"
                type="button"
                onClick={() => {
                  setReviewIndex(item.index);
                  setShowAllQuestions(false);
                }}
              >
                Focus this question
              </button>
            </div>
          </div>
        </div>

        <div className="easy-breadcrumb">
          <span>{contextSubject}</span>
          <span>{contextChapter}</span>
          <span>{contextTopic}</span>
          <span>Q{questionNumber}</span>
        </div>

        <div className="easy-focus-layout">
          <div className="easy-focus-main">
            <label className="easy-focus-field">
              <span>Question text</span>
              <textarea
                className="easy-question-text"
                defaultValue={normalizeQuestionText(question)}
                placeholder="Question text"
                onBlur={e => {
                  const nextText = e.target.value;
                  if (nextText !== normalizeQuestionText(question)) {
                    void patchQuestion(question.question_id, { questionText: nextText });
                  }
                }}
              />
              <MathPreview text={normalizeQuestionText(question)} />
            </label>

            <div className="easy-focus-field">
              <span>Question image</span>
              {questionImages.length > 0 ? (
                <div className="easy-inline-gallery">
                  {questionImages.map(image => (
                    <figure key={`${question.question_id}-question-${image}`}>
                      <button type="button" className="easy-zoom-frame" onClick={() => openZoom(image, 'Question image')}>
                        <img src={assetUrl(image)} alt="question" />
                      </button>
                      <figcaption>Question image. Click to zoom.</figcaption>
                      <button
                        type="button"
                        className="easy-inline-remove"
                        onClick={() => void removeImageFromTarget(question, image, 'question')}
                      >
                        Remove image
                      </button>
                    </figure>
                  ))}
                </div>
              ) : null}
            </div>

            <div className="easy-option-list">
              {options.map(option => (
                <div className="easy-option-block" key={`${question.question_id}-${option.letter}`}>
                  <label className="easy-option-row">
                    <input
                      className="easy-option-check"
                      type="checkbox"
                      checked={Boolean(option.is_correct)}
                      onChange={() => {
                        const choice = normalizeOptionLetter(option.letter) as AnswerLetter;
                        const currentAnswers = serializeCorrectAnswers(question);
                        const nextAnswers = option.is_correct
                          ? currentAnswers.filter(answer => answer !== choice)
                          : (Array.from(new Set([...currentAnswers, choice])) as AnswerLetter[]);
                        const inferredType = nextAnswers.length > 1 ? 'multiple_correct' : 'single_correct';
                        void patchQuestion(question.question_id, {
                          correct_option_letters: nextAnswers.join(','),
                          questionType: inferredType,
                          question_type: inferredType,
                          options: patchOptionsWithAnswers(options, nextAnswers),
                        });
                      }}
                    />
                    <span>{normalizeOptionLetter(option.letter)}</span>
                    <input
                      type="text"
                      defaultValue={option.text}
                      placeholder={`Option ${normalizeOptionLetter(option.letter)}`}
                      onBlur={e => {
                        const nextOptions = options.map(itemOption =>
                          itemOption.letter === option.letter ? { ...itemOption, text: e.target.value } : itemOption
                        );
                        void patchQuestion(question.question_id, { options: nextOptions });
                      }}
                    />
                  </label>
                  <MathPreview text={option.text} />
                  {toImageList(option.image_urls || option.image_url).length > 0 ? (
                    <div className="easy-inline-gallery easy-inline-gallery--compact">
                      {toImageList(option.image_urls || option.image_url).map(image => (
                        <figure key={`${question.question_id}-${option.letter}-${image}`}>
                          <button
                            type="button"
                            className="easy-zoom-frame"
                            onClick={() => openZoom(image, `Option ${normalizeOptionLetter(option.letter)} image`)}
                          >
                            <img src={assetUrl(image)} alt={`option ${normalizeOptionLetter(option.letter)}`} />
                          </button>
                          <figcaption>Option {normalizeOptionLetter(option.letter)} image. Click to zoom.</figcaption>
                          <button
                            type="button"
                            className="easy-inline-remove"
                            onClick={() => void removeImageFromTarget(question, image, 'option', option.letter)}
                          >
                            Remove image
                          </button>
                        </figure>
                      ))}
                    </div>
                  ) : null}
                </div>
              ))}
            </div>

            <label className="easy-focus-field">
              <span>Explanation</span>
              <textarea
                className="easy-question-text"
                defaultValue={explanationText}
                placeholder="Add explanation"
                onBlur={e => {
                  const nextText = e.target.value;
                  if (nextText !== explanationText) {
                    void patchQuestion(question.question_id, {
                      explanation: nextText,
                      explanation_text: nextText,
                    });
                  }
                }}
              />
              <MathPreview text={explanationText} />
            </label>

            {explanationImages.length > 0 ? (
              <div className="easy-inline-gallery">
                {explanationImages.map(image => (
                  <figure key={`${question.question_id}-explanation-${image}`}>
                    <button type="button" className="easy-zoom-frame" onClick={() => openZoom(image, 'Explanation image')}>
                      <img src={assetUrl(image)} alt="explanation" />
                    </button>
                    <figcaption>Explanation image. Click to zoom.</figcaption>
                    <button
                      type="button"
                      className="easy-inline-remove"
                      onClick={() => void removeImageFromTarget(question, image, 'explanation')}
                    >
                      Remove image
                    </button>
                  </figure>
                ))}
              </div>
            ) : null}

            <div className="easy-quick-details">
              <label className="easy-detail-field">
                <span>Type</span>
                <select
                  value={questionType}
                  onChange={e => {
                    void patchQuestion(question.question_id, {
                      questionType: e.target.value,
                      question_type: e.target.value,
                    });
                  }}
                >
                  <option value="single_correct">Single correct</option>
                  <option value="multiple_correct">Multiple correct</option>
                  <option value="numerical">Numerical</option>
                  <option value="matching">Matching</option>
                  <option value="assertion_and_reason">Assertion and reason</option>
                  <option value="statements">Statements</option>
                </select>
              </label>

              <label className="easy-detail-field">
                <span>Level</span>
                <select
                  value={level}
                  onChange={e => {
                    const raw = e.target.value;
                    const parsed = Number(raw);
                    void patchQuestion(question.question_id, {
                      difficulty_level: raw === '' || !Number.isFinite(parsed) ? null : parsed,
                    });
                  }}
                >
                  <option value="">Select level</option>
                  <option value="1">1</option>
                  <option value="2">2</option>
                  <option value="3">3</option>
                </select>
              </label>

              <label className="easy-detail-field">
                <span>Difficulty type</span>
                <select
                  value={difficultyType}
                  onChange={e => {
                    void patchQuestion(question.question_id, {
                      difficulty_type: e.target.value,
                    });
                  }}
                >
                  <option value="">Select</option>
                  {DIFFICULTY_TYPES.map(type => (
                    <option value={type} key={type}>
                      {type}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className="easy-question-footer">
              <div className="easy-answer-pick">
                <span>Answer selection</span>
                <p className="easy-answer-help">Tick every option that should be treated as correct.</p>
              </div>
              <div className="easy-saving-indicator">
                {savingQuestionId === question.question_id ? 'Saving...' : 'Changes auto-save'}
              </div>
            </div>

            <div className="easy-card-actions">
              <button
                className="easy-btn subtle"
                type="button"
                disabled={commitBusy}
                onClick={() => void commitQuestionFromShowAll(question)}
              >
                {commitBusy ? 'Committing...' : `Commit Q${questionNumber}`}
              </button>
            </div>
          </div>

          <aside className="easy-page-assets-rail">
            <div className="easy-rail-head">
              <strong>Images from this page</strong>
              <span>{pageAssets.length > 0 ? "Reference images for this question's source page." : 'No page images found on this page.'}</span>
            </div>
            {(questionImages.length > 0 || explanationImages.length > 0 || options.some(option => toImageList(option.image_urls || option.image_url).length > 0)) ? (
              <div className="easy-rail-upload-tools">
                <p>Attached now</p>
                <div className="easy-page-attach-actions easy-page-attach-actions--status">
                  {questionImages.map(image => (
                    <button
                      key={`remove-question-${question.question_id}-${image}`}
                      type="button"
                      onClick={() => void removeImageFromTarget(question, image, 'question')}
                    >
                      Remove question image
                    </button>
                  ))}
                  {explanationImages.map(image => (
                    <button
                      key={`remove-explanation-${question.question_id}-${image}`}
                      type="button"
                      onClick={() => void removeImageFromTarget(question, image, 'explanation')}
                    >
                      Remove explanation image
                    </button>
                  ))}
                  {options.flatMap(option =>
                    toImageList(option.image_urls || option.image_url).map(image => (
                      <button
                        key={`remove-${question.question_id}-${option.letter}-${image}`}
                        type="button"
                        onClick={() => void removeImageFromTarget(question, image, 'option', option.letter)}
                      >
                        Remove {normalizeOptionLetter(option.letter)} image
                      </button>
                    ))
                  )}
                </div>
              </div>
            ) : null}
            {pageAssets.length > 0 ? (
              <div className="easy-diagram-strip">
                {pageAssets.map(asset => (
                  <figure key={`${question.question_id}-${asset.key}`}>
                    <button
                      type="button"
                      className="easy-zoom-frame"
                      onClick={() => openZoom(asset.filename, asset.type || `Page ${question.source_page} image`)}
                    >
                      <img src={assetUrl(asset.filename)} alt={asset.filename} />
                    </button>
                    <figcaption>{asset.type || `Page ${question.source_page}`}</figcaption>
                    <div className="easy-page-attach-actions">
                      <button type="button" onClick={() => void attachImageToTarget(question, asset.filename, 'question')}>
                        Use for question
                      </button>
                      <button type="button" onClick={() => void attachImageToTarget(question, asset.filename, 'explanation')}>
                        Use for explanation
                      </button>
                      {options.map(option => (
                        <button
                          key={`${question.question_id}-${asset.filename}-${option.letter}`}
                          type="button"
                          onClick={() => void attachImageToTarget(question, asset.filename, 'option', option.letter)}
                        >
                          Use for {normalizeOptionLetter(option.letter)}
                        </button>
                      ))}
                    </div>
                  </figure>
                ))}
              </div>
            ) : (
              <p className="easy-muted">No page images found for this question.</p>
            )}

            <div className="easy-rail-upload-tools">
              <p>Upload your own</p>
              <div className="easy-page-attach-actions easy-page-attach-actions--upload">
                <label className="easy-asset-btn">
                  <span>Question</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={async e => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      const uploaded = await uploadAsset(file);
                      if (uploaded) {
                        await attachImageToTarget(question, uploaded, 'question');
                      }
                      e.currentTarget.value = '';
                    }}
                  />
                </label>
                <label className="easy-asset-btn">
                  <span>Explanation</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={async e => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      const uploaded = await uploadAsset(file);
                      if (uploaded) {
                        await attachImageToTarget(question, uploaded, 'explanation');
                      }
                      e.currentTarget.value = '';
                    }}
                  />
                </label>
                {options.map(option => (
                  <label key={`${question.question_id}-upload-${option.letter}`} className="easy-asset-btn">
                    <span>Option {normalizeOptionLetter(option.letter)}</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={async e => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        const uploaded = await uploadAsset(file);
                        if (uploaded) {
                          await attachImageToTarget(question, uploaded, 'option', option.letter);
                        }
                        e.currentTarget.value = '';
                      }}
                    />
                  </label>
                ))}
              </div>
            </div>
          </aside>
        </div>
      </article>
    );
  }

  return (
    <div className="easy-mode-page">
      <div className="easy-mode-shell easy-mode-shell--focused">
        <header className="easy-mode-hero easy-mode-hero--compact">
          <div>
            <p className="easy-mode-eyebrow">Operator Workflow</p>
            <h2 className="easy-mode-title">Easy Mode</h2>
            <p className="easy-mode-copy">Fill the top context once, then fix one flagged question at a time.</p>
          </div>
          <div className="easy-mode-hero-stats">
            <div>
              <span>Batch</span>
              <strong>{selectedBatchId || 'None'}</strong>
            </div>
            <div>
              <span>Questions</span>
              <strong>{summary.total}</strong>
            </div>
            <div>
              <span>Need Review</span>
              <strong>{summary.reviewNeeded}</strong>
            </div>
          </div>
        </header>

        <section className="easy-card easy-card--metadata-first">
          <div className="easy-card-head">
            <div>
              <p className="easy-card-kicker">Set this before review</p>
              <h3>Important metadata</h3>
            </div>
            <div className="easy-card-actions">
              <button className="easy-btn subtle easy-mobile-toggle" type="button" onClick={() => setShowMetadataPanel(prev => !prev)}>
                {showMetadataPanel ? 'Hide' : 'Show'}
              </button>
              <button className="easy-btn secondary" type="button" disabled={metadataSaving} onClick={() => void applyMetadataToAll()}>
                {metadataSaving ? 'Applying...' : 'Apply to all questions'}
              </button>
            </div>
          </div>
          {showMetadataPanel ? (
            <div className="easy-meta-grid">
              <label>
                <span>Subject</span>
                <select value={metadataDraft.subject} onChange={e => setMetadataDraft(prev => ({ ...prev, subject: e.target.value, chapter: '', topic: '' }))}>
                  <option value="">Select subject</option>
                  {subjectOptions.map(subject => (
                    <option key={subject} value={subject}>
                      {subject}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                <span>Chapter</span>
                <input
                  value={metadataDraft.chapter}
                  onChange={e => setMetadataDraft(prev => ({ ...prev, chapter: e.target.value }))}
                  placeholder="Enter chapter"
                />
              </label>
              <label>
                <span>Topic</span>
                <input
                  value={metadataDraft.topic}
                  onChange={e => setMetadataDraft(prev => ({ ...prev, topic: e.target.value }))}
                  placeholder="Enter topic"
                />
              </label>
              <label>
                <span>Exam type</span>
                <select value={metadataDraft.examType} onChange={e => setMetadataDraft(prev => ({ ...prev, examType: e.target.value }))}>
                  <option value="">Select exam type</option>
                  <option value="JEE">JEE</option>
                  <option value="JEE Advance">JEE Advance</option>
                  <option value="NEET">NEET</option>
                  <option value="JEE/NEET Common">JEE/NEET Common</option>
                </select>
              </label>
              <label>
                <span>Published year</span>
                <input value={metadataDraft.publishedYear} onChange={e => setMetadataDraft(prev => ({ ...prev, publishedYear: e.target.value }))} placeholder="2026" />
              </label>
            </div>
          ) : (
            <p className="easy-muted">Metadata is collapsed. Open it when you need to change subject, chapter, topic, exam type, or year.</p>
          )}
        </section>

        <section className="easy-top-stack">
          <div className="easy-card">
            <div className="easy-card-head">
              <div>
                <p className="easy-card-kicker">First</p>
                <h3>Choose batch or upload source</h3>
              </div>
              <div className="easy-card-actions">
                {selectedBatchId ? (
                  <button className="easy-btn subtle" type="button" onClick={() => void deleteBatch(selectedBatchId)}>
                    Delete batch
                  </button>
                ) : null}
                <button className="easy-btn subtle" type="button" onClick={() => void loadBatches()}>
                  Refresh
                </button>
              </div>
            </div>
            <div className="easy-batch-grid easy-batch-grid--top">
              <div className="easy-batch-create">
                <label className="easy-file-pick">
                  <span>Source PDF or DOCX</span>
                  <div className="easy-file-picker-row">
                    <label className="easy-picker-btn">
                      <span>Choose file</span>
                      <input type="file" accept=".pdf,.doc,.docx" onChange={e => setSourceFile(e.target.files?.[0] || null)} />
                    </label>
                    <div className="easy-file-name" title={sourceFile?.name || 'No file selected'}>
                      {sourceFile ? sourceFile.name : 'No file selected'}
                    </div>
                  </div>
                </label>
                <button className="easy-btn primary" type="button" disabled={uploadingSource} onClick={() => void uploadSourceBatch()}>
                  {uploadingSource ? 'Uploading...' : 'Upload and Start'}
                </button>
                <div className="easy-upload-progress" aria-label="Batch progress">
                  <div className="easy-upload-progress-head">
                    <strong>{selectedBatchProgress.message}</strong>
                    <span>{selectedBatchProgress.percent}%</span>
                  </div>
                  <div className="easy-upload-progress-track">
                    <div className="easy-upload-progress-fill" style={{ width: `${selectedBatchProgress.percent}%` }} />
                  </div>
                  <small>
                    {selectedBatchProgress.totalPages > 0
                      ? `${selectedBatchProgress.pagesDone}/${selectedBatchProgress.totalPages} pages`
                      : 'Choose a batch to see progress'}
                  </small>
                </div>
                <p className="easy-muted">{sourceFile ? 'Ready to upload this file.' : 'No file selected yet.'}</p>
              </div>
              <div className="easy-batch-list easy-batch-list--compact">
                {batches.slice(0, 6).map(batch => (
                  <button
                    type="button"
                    key={batch.batch_id}
                    className={`easy-batch-item ${selectedBatchId === batch.batch_id ? 'active' : ''}`}
                    onClick={() => setSelectedBatchId(batch.batch_id)}
                    title={`${batch.batch_id}\n${batch.file_name || 'Untitled batch'}`}
                  >
                    <strong>{compactBatchId(batch.batch_id)}</strong>
                    <span>{compactFileName(batch.file_name)}</span>
                    <small>{batch.status}{typeof batch.total_questions === 'number' ? ` • ${batch.total_questions} questions` : ''}</small>
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="easy-card">
            <div className="easy-card-head">
              <div>
                <p className="easy-card-kicker">Second</p>
                <h3>Answer key extractor</h3>
              </div>
              <button className="easy-btn subtle easy-mobile-toggle" type="button" onClick={() => setShowAnswerKeyPanel(prev => !prev)}>
                {showAnswerKeyPanel ? 'Hide' : 'Show'}
              </button>
            </div>
            {showAnswerKeyPanel ? (
              <>
                <div className="easy-key-top easy-key-top--compact">
                  <label className="easy-file-pick wide">
                    <span>Answer key file</span>
                    <div className="easy-file-picker-row">
                      <label className="easy-picker-btn">
                        <span>Choose file</span>
                        <input type="file" accept=".pdf,.png,.jpg,.jpeg,.doc,.docx" onChange={e => setAnswerKeyFile(e.target.files?.[0] || null)} />
                      </label>
                      <div className="easy-file-name" title={answerKeyFile?.name || 'No file selected'}>
                        {answerKeyFile ? answerKeyFile.name : 'No file selected'}
                      </div>
                    </div>
                  </label>
                  <div className="easy-key-actions">
                    <button className="easy-btn primary" type="button" onClick={() => void parseAnswerKey()}>
                      Upload key
                    </button>
                  </div>
                </div>
                <div className="easy-scope-grid">
                  <label>
                    <span>Start page</span>
                    <input
                      type="number"
                      min="1"
                      value={parseConfig.startPage}
                      onChange={e => setParseConfig(prev => ({ ...prev, startPage: e.target.value }))}
                    />
                  </label>
                  <label>
                    <span>Pages to parse</span>
                    <input
                      type="number"
                      min="1"
                      value={parseConfig.maxPages}
                      onChange={e => setParseConfig(prev => ({ ...prev, maxPages: e.target.value }))}
                    />
                  </label>
                  <label>
                    <span>First question #</span>
                    <input
                      type="number"
                      min="1"
                      value={parseConfig.minQuestion}
                      onChange={e => setParseConfig(prev => ({ ...prev, minQuestion: e.target.value }))}
                    />
                  </label>
                  <label>
                    <span>Last question #</span>
                    <input
                      type="number"
                      min="1"
                      value={parseConfig.maxQuestion}
                      onChange={e => setParseConfig(prev => ({ ...prev, maxQuestion: e.target.value }))}
                    />
                  </label>
                </div>
                  <p className="easy-muted">
                    Key pages: {parseConfig.startPage} to {Math.max(Number(parseConfig.startPage) || 1, (Number(parseConfig.startPage) || 1) + (Number(parseConfig.maxPages) || 1) - 1)} ,
                    questions {parseConfig.minQuestion} to {parseConfig.maxQuestion}
                  </p>
                <div className="easy-parse-grid easy-parse-grid--compact">
                  <div className="easy-status-card">
                    <span>Status</span>
                    <strong>{answerKeyStatus}</strong>
                  </div>
                  <div className="easy-status-card">
                    <span>Elapsed</span>
                    <strong>{parseElapsed !== null ? formatDuration(parseElapsed) : parseSeconds !== null ? formatDuration(parseSeconds) : 'Not started'}</strong>
                  </div>
                  <div className="easy-status-card">
                    <span>Answers</span>
                    <strong>{appliedAnswerCount}</strong>
                  </div>
                </div>
              </>
            ) : (
              <p className="easy-muted">The answer-key section is hidden right now. Open this to upload a key and apply it automatically.</p>
            )}
          </div>
        </section>

        <section className="easy-card easy-card--review-focus">
          <div className="easy-progress-strip easy-progress-strip--review">
            <div>
              <span>Total questions</span>
              <strong>{summary.total}</strong>
            </div>
            <div>
              <span>Done</span>
              <strong>{completedCount}</strong>
            </div>
            <div>
              <span>Still needs work</span>
              <strong>{summary.reviewNeeded}</strong>
            </div>
              <div>
                <span>Current</span>
                <strong>{currentQuestion ? `Q${currentQuestionNumber}` : 'All done'}</strong>
              </div>
            </div>

            <div className="easy-missed-strip">
              <span>Missed questions</span>
                  {missingQuestionNumbers.length > 0 ? (
                <div className="easy-missed-list">
                  {missingQuestionNumbers.map(number => (
                    <button
                      key={`missed-${number}`}
                      type="button"
                      className={`easy-missed-chip ${number === currentQuestionNumber ? 'active' : ''}`}
                      onClick={() => {
                        const targetIndex = reviewQueue.findIndex(
                          item => normalizeQuestionNumber(item.question, item.index + 1) === number
                        );
                        if (targetIndex >= 0) {
                          setReviewIndex(targetIndex);
                          setShowAllQuestions(false);
                        }
                      }}
                    >
                      Q{number}
                    </button>
                  ))}
                </div>
              ) : (
                <strong>None</strong>
              )}
            </div>

            <div className="easy-card-head">
            <div>
              <p className="easy-card-kicker">Main task</p>
              <h3>Fix one flagged question</h3>
            </div>
            <div className="easy-review-switch">
              <button type="button" className={!showAllQuestions ? 'active' : ''} onClick={() => setShowAllQuestions(false)}>
                Focus mode
              </button>
              <button
                type="button"
                className={showAllQuestions ? 'active' : ''}
                onClick={() => {
                  setShowAllQuestions(true);
                  setShowAllPage(Math.floor(safeReviewIndex / showAllPageSize));
                }}
              >
                Show all
              </button>
            </div>
          </div>

          {!showAllQuestions ? (
            currentQuestion ? (
              <div key={currentQuestion.question_id}>
                <div className="easy-queue-bar">
                  <div>
                    <strong>Question Q{currentQuestionNumber}</strong>
                    <span>
                      Page {currentQuestion.source_page || '?'} • Review queue {reviewIndex + 1} of {reviewQueue.length}
                    </span>
                  </div>
                  <div className="easy-queue-actions">
                    <button className="easy-btn subtle" type="button" disabled={reviewIndex <= 0} onClick={() => setReviewIndex(prev => Math.max(0, prev - 1))}>
                      Previous
                    </button>
                    <button
                      className="easy-btn subtle"
                      type="button"
                      disabled={reviewIndex >= reviewQueue.length - 1}
                      onClick={() => setReviewIndex(prev => Math.min(reviewQueue.length - 1, prev + 1))}
                    >
                      Next
                    </button>
                  </div>
                </div>

                <div className="easy-focus-tags">
                  {currentReviewItem?.reasons.map(reason => (
                    <span key={reason}>{reason}</span>
                  ))}
                </div>

                <div className="easy-breadcrumb">
                  <span>{currentContextSubject}</span>
                  <span>{currentContextChapter}</span>
                  <span>{currentContextTopic}</span>
                  <span>Q{currentQuestionNumber}</span>
                </div>

                <div className="easy-focus-layout">
                  <div className="easy-focus-main">

                <label className="easy-focus-field">
                  <span>Question text</span>
                  <textarea
                    className="easy-question-text"
                    defaultValue={normalizeQuestionText(currentQuestion)}
                    placeholder="Question text"
                    onBlur={e => {
                      const nextText = e.target.value;
                      if (nextText !== normalizeQuestionText(currentQuestion)) {
                        void patchQuestion(currentQuestion.question_id, { questionText: nextText });
                      }
                    }}
                  />
                  <MathPreview text={normalizeQuestionText(currentQuestion)} />
                </label>

                <div className="easy-focus-field">
                  <span>Question image</span>
                  {currentQuestionImages.length > 0 ? (
                    <div className="easy-inline-gallery">
                        {currentQuestionImages.map(image => (
                          <figure key={`${currentQuestion.question_id}-question-${image}`}>
                            <button type="button" className="easy-zoom-frame" onClick={() => openZoom(image, 'Question image')}>
                              <img src={assetUrl(image)} alt="question" />
                            </button>
                            <figcaption>Question image. Click to zoom.</figcaption>
                            <button
                              type="button"
                              className="easy-inline-remove"
                              onClick={() => void removeImageFromTarget(currentQuestion, image, 'question')}
                            >
                              Remove image
                            </button>
                          </figure>
                        ))}
                      </div>
                  ) : null}
                </div>

                <div className="easy-option-list">
                  {currentOptions.map(option => (
                    <div className="easy-option-block" key={`${currentQuestion.question_id}-${option.letter}`}>
                      <label className="easy-option-row">
                        <input
                          className="easy-option-check"
                          type="checkbox"
                          checked={Boolean(option.is_correct)}
                          onChange={() => {
                            const choice = normalizeOptionLetter(option.letter) as AnswerLetter;
                            const nextAnswers = option.is_correct
                              ? currentAnswers.filter(answer => answer !== choice)
                              : (Array.from(new Set([...currentAnswers, choice])) as AnswerLetter[]);
                            const inferredType = nextAnswers.length > 1 ? 'multiple_correct' : 'single_correct';
                            void patchQuestion(currentQuestion.question_id, {
                              correct_option_letters: nextAnswers.join(','),
                              questionType: inferredType,
                              question_type: inferredType,
                              options: patchOptionsWithAnswers(currentOptions, nextAnswers),
                            });
                          }}
                        />
                        <span>{normalizeOptionLetter(option.letter)}</span>
                        <input
                          type="text"
                          defaultValue={option.text}
                          placeholder={`Option ${normalizeOptionLetter(option.letter)}`}
                          onBlur={e => {
                            const nextOptions = currentOptions.map(item =>
                              item.letter === option.letter ? { ...item, text: e.target.value } : item
                            );
                            void patchQuestion(currentQuestion.question_id, { options: nextOptions });
                          }}
                        />
                      </label>
                      <MathPreview text={option.text} />
                      {toImageList(option.image_urls || option.image_url).length > 0 ? (
                        <div className="easy-inline-gallery easy-inline-gallery--compact">
                            {toImageList(option.image_urls || option.image_url).map(image => (
                              <figure key={`${currentQuestion.question_id}-${option.letter}-${image}`}>
                              <button
                                type="button"
                                className="easy-zoom-frame"
                                onClick={() => openZoom(image, `Option ${normalizeOptionLetter(option.letter)} image`)}
                                >
                                  <img src={assetUrl(image)} alt={`option ${normalizeOptionLetter(option.letter)}`} />
                                </button>
                                <figcaption>Option {normalizeOptionLetter(option.letter)} image. Click to zoom.</figcaption>
                                <button
                                  type="button"
                                  className="easy-inline-remove"
                                  onClick={() => void removeImageFromTarget(currentQuestion, image, 'option', option.letter)}
                                >
                                  Remove image
                                </button>
                              </figure>
                            ))}
                          </div>
                      ) : null}
                    </div>
                  ))}
                </div>

                <label className="easy-focus-field">
                  <span>Explanation</span>
                  <textarea
                    className="easy-question-text"
                    defaultValue={currentExplanation}
                    placeholder="Add explanation"
                    onBlur={e => {
                      const nextText = e.target.value;
                      if (!currentQuestion || nextText === currentExplanation) return;
                      void patchQuestion(currentQuestion.question_id, {
                        explanation: nextText,
                        explanation_text: nextText,
                      });
                    }}
                  />
                  <MathPreview text={currentExplanation} />
                </label>

                {currentExplanationImages.length > 0 ? (
                  <div className="easy-inline-gallery">
                      {currentExplanationImages.map(image => (
                        <figure key={`${currentQuestion.question_id}-explanation-${image}`}>
                          <button type="button" className="easy-zoom-frame" onClick={() => openZoom(image, 'Explanation image')}>
                            <img src={assetUrl(image)} alt="explanation" />
                          </button>
                          <figcaption>Explanation image. Click to zoom.</figcaption>
                          <button
                            type="button"
                            className="easy-inline-remove"
                            onClick={() => void removeImageFromTarget(currentQuestion, image, 'explanation')}
                          >
                            Remove image
                          </button>
                        </figure>
                      ))}
                  </div>
                ) : null}

                <div className="easy-quick-details">
                  <label className="easy-detail-field">
                    <span>Type</span>
                    <select
                      value={currentQuestionType}
                      onChange={e => {
                        void patchQuestion(currentQuestion.question_id, {
                          questionType: e.target.value,
                          question_type: e.target.value,
                        });
                      }}
                    >
                      <option value="single_correct">Single correct</option>
                      <option value="multiple_correct">Multiple correct</option>
                      <option value="numerical">Numerical</option>
                      <option value="matching">Matching</option>
                      <option value="assertion_and_reason">Assertion and reason</option>
                      <option value="statements">Statements</option>
                    </select>
                  </label>

                  <label className="easy-detail-field">
                    <span>Level</span>
                    <select
                      value={currentLevel}
                      onChange={e => {
                        const raw = e.target.value;
                        const parsed = Number(raw);
                        void patchQuestion(currentQuestion.question_id, {
                          difficulty_level: raw === '' || !Number.isFinite(parsed) ? null : parsed,
                        });
                      }}
                    >
                      <option value="">Select level</option>
                      <option value="1">1</option>
                      <option value="2">2</option>
                      <option value="3">3</option>
                    </select>
                  </label>

                  <label className="easy-detail-field">
                    <span>Difficulty type</span>
                    <select
                      value={currentDifficultyType}
                      onChange={e => {
                        void patchQuestion(currentQuestion.question_id, {
                          difficulty_type: e.target.value,
                        });
                      }}
                    >
                      <option value="">Select</option>
                      {DIFFICULTY_TYPES.map(type => (
                        <option value={type} key={type}>
                          {type}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>

                <div className="easy-question-footer">
                  <div className="easy-answer-pick">
                    <span>Answer selection</span>
                    <p className="easy-answer-help">Tick every option that should be treated as correct.</p>
                  </div>
                  <div className="easy-saving-indicator">
                    {savingQuestionId === currentQuestion.question_id ? 'Saving...' : 'Changes auto-save'}
                  </div>
                </div>

                <div className="easy-card-actions">
                  <button
                    className="easy-btn primary"
                    type="button"
                    disabled={reviewIndex >= reviewQueue.length - 1}
                    onClick={() => saveAndNextCurrentQuestion()}
                  >
                    Save and next
                  </button>
                  <button
                    className="easy-btn subtle"
                    type="button"
                    disabled={commitBusy}
                    onClick={() => void commitCurrentQuestion(currentQuestion)}
                  >
                    {commitBusy ? 'Committing...' : `Commit Q${currentQuestionNumber}`}
                  </button>
                  <button
                    className="easy-btn secondary"
                    type="button"
                    disabled={reviewIndex >= reviewQueue.length - 1}
                    onClick={() => goToNextQuestionToFix()}
                  >
                    Next question to fix
                  </button>
                </div>
                  </div>

                <aside className="easy-page-assets-rail">
                    <div className="easy-rail-head">
                      <strong>Images from this page</strong>
                      <span>{currentPageAssets.length > 0 ? "Reference images for this question's source page." : 'No page images found on this page.'}</span>
                    </div>
                  {(currentQuestionImages.length > 0 || currentExplanationImages.length > 0 || currentOptions.some(option => toImageList(option.image_urls || option.image_url).length > 0)) ? (
                    <div className="easy-rail-upload-tools">
                      <p>Attached now</p>
                      <div className="easy-page-attach-actions easy-page-attach-actions--status">
                        {currentQuestionImages.map(image => (
                          <button
                            key={`remove-question-${image}`}
                            type="button"
                            onClick={() => void removeImageFromTarget(currentQuestion, image, 'question')}
                          >
                            Remove question image
                          </button>
                        ))}
                        {currentExplanationImages.map(image => (
                          <button
                            key={`remove-explanation-${image}`}
                            type="button"
                            onClick={() => void removeImageFromTarget(currentQuestion, image, 'explanation')}
                          >
                            Remove explanation image
                          </button>
                        ))}
                        {currentOptions.flatMap(option =>
                          toImageList(option.image_urls || option.image_url).map(image => (
                            <button
                              key={`remove-${option.letter}-${image}`}
                              type="button"
                              onClick={() => void removeImageFromTarget(currentQuestion, image, 'option', option.letter)}
                            >
                              Remove {normalizeOptionLetter(option.letter)} image
                            </button>
                          ))
                        )}
                      </div>
                    </div>
                  ) : null}
                  {currentPageAssets.length > 0 ? (
                    <div className="easy-diagram-strip">
                      {currentPageAssets.map(asset => (
                        <figure key={`${currentQuestion.question_id}-${asset.key}`}>
                          <button
                            type="button"
                            className="easy-zoom-frame"
                            onClick={() => openZoom(asset.filename, asset.type || `Page ${currentQuestion.source_page} image`)}
                          >
                            <img src={assetUrl(asset.filename)} alt={asset.filename} />
                          </button>
                          <figcaption>{asset.type || `Page ${currentQuestion.source_page}`}</figcaption>
                          <div className="easy-page-attach-actions">
                            <button
                              type="button"
                              onClick={() => void attachImageToTarget(currentQuestion, asset.filename, 'question')}
                            >
                              Use for question
                            </button>
                            <button
                              type="button"
                              onClick={() => void attachImageToTarget(currentQuestion, asset.filename, 'explanation')}
                            >
                              Use for explanation
                            </button>
                            {currentOptions.map(option => (
                              <button
                                key={`${asset.filename}-${option.letter}`}
                                type="button"
                                onClick={() => void attachImageToTarget(currentQuestion, asset.filename, 'option', option.letter)}
                              >
                                Use for {normalizeOptionLetter(option.letter)}
                              </button>
                            ))}
                          </div>
                        </figure>
                      ))}
                    </div>
                  ) : (
                    <p className="easy-muted">No page images found for this question.</p>
                  )}

                  <div className="easy-rail-upload-tools">
                    <p>Upload your own</p>
                    <div className="easy-page-attach-actions easy-page-attach-actions--upload">
                      <label className="easy-asset-btn">
                        <span>Question</span>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={async e => {
                            const file = e.target.files?.[0];
                            if (!file) return;
                            const uploaded = await uploadAsset(file);
                            if (uploaded) {
                              await attachImageToTarget(currentQuestion, uploaded, 'question');
                            }
                            e.currentTarget.value = '';
                          }}
                        />
                      </label>
                      <label className="easy-asset-btn">
                        <span>Explanation</span>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={async e => {
                            const file = e.target.files?.[0];
                            if (!file) return;
                            const uploaded = await uploadAsset(file);
                            if (uploaded) {
                              await attachImageToTarget(currentQuestion, uploaded, 'explanation');
                            }
                            e.currentTarget.value = '';
                          }}
                        />
                      </label>
                      {currentOptions.map(option => (
                        <label key={`upload-${option.letter}`} className="easy-asset-btn">
                          <span>Option {normalizeOptionLetter(option.letter)}</span>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={async e => {
                              const file = e.target.files?.[0];
                              if (!file) return;
                              const uploaded = await uploadAsset(file);
                              if (uploaded) {
                                await attachImageToTarget(currentQuestion, uploaded, 'option', option.letter);
                              }
                              e.currentTarget.value = '';
                            }}
                          />
                        </label>
                      ))}
                    </div>
                  </div>
                  </aside>
                </div>
              </div>
            ) : (
              <div className="easy-ready-card">
                <strong>No flagged questions right now.</strong>
                <span>This batch is ready for final check and commit.</span>
              </div>
            )
          ) : (
            <div className="easy-showall-page">
              <div className="easy-showall-head">
                <div>
                  <strong>Fix 5 questions at a time</strong>
                  <span>
                    Showing {reviewQueue.length === 0 ? 0 : showAllStart + 1}-
                    {Math.min(showAllStart + visibleReviewItems.length, reviewQueue.length)} of {reviewQueue.length}
                  </span>
                </div>
                <div className="easy-queue-actions">
                  <button
                    className="easy-btn primary"
                    type="button"
                    disabled={commitBusy || visibleReviewItems.length === 0}
                    onClick={() => void commitVisibleQuestionsAndNextPage()}
                  >
                    {commitBusy ? 'Committing...' : 'Commit these 5 and next'}
                  </button>
                  <button
                    className="easy-btn subtle"
                    type="button"
                    disabled={safeShowAllPage <= 0}
                    onClick={() => setShowAllPage(prev => Math.max(0, prev - 1))}
                  >
                    Previous page
                  </button>
                  <span className="easy-showall-page-indicator">
                    Page {showAllPageCount === 0 ? 0 : safeShowAllPage + 1} of {showAllPageCount}
                  </span>
                  <button
                    className="easy-btn subtle"
                    type="button"
                    disabled={safeShowAllPage >= showAllPageCount - 1}
                    onClick={() => setShowAllPage(prev => Math.min(showAllPageCount - 1, prev + 1))}
                  >
                    Next page
                  </button>
                </div>
              </div>

              <div className="easy-batch-question-list easy-batch-question-list--compact">
                {visibleReviewItems.map(item => renderPagedQuestionCard(item))}
              </div>
            </div>
          )}
        </section>

        <section className="easy-card easy-card--commit">
          <div className="easy-card-head">
            <div>
              <p className="easy-card-kicker">Final step</p>
              <h3>Check and commit</h3>
            </div>
            <div className="easy-card-actions">
              <button className="easy-btn subtle" type="button" disabled={validateBusy} onClick={() => void validateBatchBeforeCommit()}>
                {validateBusy ? 'Checking...' : 'Check batch'}
              </button>
              <button className="easy-btn primary" type="button" disabled={commitBusy} onClick={() => void commitBatch()}>
                {commitBusy ? 'Committing...' : 'Commit batch'}
              </button>
            </div>
          </div>
          <div className="easy-summary-grid">
            <div className="easy-summary-card">
              <span>Total questions</span>
              <strong>{summary.total}</strong>
            </div>
            <div className="easy-summary-card warn">
              <span>Need review</span>
              <strong>{summary.reviewNeeded}</strong>
            </div>
            <div className="easy-summary-card warn">
              <span>Missing answer</span>
              <strong>{summary.unanswered}</strong>
            </div>
            <div className="easy-summary-card warn">
              <span>Blank text</span>
              <strong>{summary.blankText}</strong>
            </div>
            <div className="easy-summary-card warn">
              <span>Missing metadata</span>
              <strong>{summary.missingMetadata}</strong>
            </div>
          </div>
          {commitResult ? <p className="easy-success">{commitResult}</p> : null}
        </section>

        {uiNotice ? <div className="easy-banner notice">{uiNotice}</div> : null}
        {uiError ? <div className="easy-banner error">{uiError}</div> : null}

        {zoomImage ? (
          <div className="easy-lightbox" role="dialog" aria-modal="true" onClick={() => setZoomImage(null)}>
            <div className="easy-lightbox-panel" onClick={e => e.stopPropagation()}>
              <div className="easy-lightbox-head">
                <strong>{zoomImage.label}</strong>
                <button type="button" className="easy-btn subtle" onClick={() => setZoomImage(null)}>
                  Close
                </button>
              </div>
              <div className="easy-lightbox-image-wrap">
                <img src={zoomImage.src} alt={zoomImage.label} className="easy-lightbox-image" />
              </div>
            </div>
          </div>
        ) : null}

        <div className="easy-mobile-bar">
          <button
            className="easy-btn subtle"
            type="button"
            disabled={reviewIndex <= 0 || reviewQueue.length === 0}
            onClick={() => setReviewIndex(prev => Math.max(0, prev - 1))}
          >
            Previous
          </button>
          <button
            className="easy-btn subtle"
            type="button"
            disabled={reviewIndex >= reviewQueue.length - 1 || reviewQueue.length === 0}
            onClick={() => setReviewIndex(prev => Math.min(reviewQueue.length - 1, prev + 1))}
          >
            Next
          </button>
          <button className="easy-btn primary" type="button" disabled={commitBusy} onClick={() => void commitBatch()}>
            {commitBusy ? 'Committing...' : 'Commit'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default EasyModeScreen;
