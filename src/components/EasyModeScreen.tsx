import React, { useEffect, useMemo, useRef, useState } from 'react';
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
  image_url?: string;
  image_urls?: string[];
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
  error?: string | null;
};

type ParsedPair = {
  number: number;
  answer: string;
};

type CommitResponse = {
  insertedCount?: number;
  inserted?: number;
  failedCount?: number;
  failed?: number;
  errors?: Array<{ index?: number; question_id?: string; message?: string; reason?: string }>;
};

const PYTHON_API_BASE = getPythonBase().replace(/\/$/, '');
const EXPRESS_API_BASE = getExpressBase().replace(/\/$/, '');
const EASY_ACTIVE_BATCH_KEY = 'dq_easy_mode_active_batch';
const EASY_META_KEY = 'dq_easy_mode_meta';
const ANSWER_CHOICES: AnswerLetter[] = ['A', 'B', 'C', 'D'];

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
  const options = Array.isArray(question.options) ? question.options : [];
  const selected = options.find(option => option.is_correct);
  return selected ? normalizeOptionLetter(selected.letter) : '';
}

function patchOptionsWithAnswer(options: DraftOption[], answer: string): DraftOption[] {
  const wanted = String(answer || '').trim().toUpperCase();
  return options.map(option => {
    const normalized = normalizeOptionLetter(option.letter);
    const numeric = option.letter;
    const matches = normalized === wanted || numeric === wanted;
    return { ...option, is_correct: matches };
  });
}

function firstImage(listOrSingle?: string[] | string): string {
  if (Array.isArray(listOrSingle)) {
    return listOrSingle.find(Boolean) || '';
  }
  return listOrSingle || '';
}

function toImageList(listOrSingle?: string[] | string): string[] {
  if (Array.isArray(listOrSingle)) {
    return listOrSingle.filter(Boolean);
  }
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

function estimateQuestionIssue(question: DraftQuestion): { review: boolean; reasons: string[] } {
  const reasons: string[] = [];
  const text = normalizeQuestionText(question);
  const options = Array.isArray(question.options) ? question.options : [];
  const nonEmptyOptions = options.filter(option => String(option.text || '').trim()).length;
  const answer = serializeCorrectAnswer(question);

  if (!text || text.length < 12) {
    reasons.push('Question text needs attention');
  }
  if (!answer) {
    reasons.push('Answer missing');
  }
  if (nonEmptyOptions < 2) {
    reasons.push('Options incomplete');
  }

  return { review: reasons.length > 0, reasons };
}

function buildBulkPayload(batchId: string, questions: DraftQuestion[], batchTag = '') {
  return questions.map(question => ({
    verification_state: question.verification_state || 'edited',
    batchId,
    subjectName: (question.subject_name || '').trim().toLowerCase(),
    chapterName: (question.chapter_name || '').trim().toLowerCase(),
    topicName: (question.topic_name || '').trim().toLowerCase(),
    examType: (question.exam_type || '').trim().toLowerCase(),
    publishedYear: question.published_year ?? null,
    questionFact: (question.question_fact || '').trim(),
    batchTag: batchTag.trim(),
    difficultyLevel: null,
    difficultyType: null,
    questionType: 'single_correct',
    questionText: normalizeQuestionText(question),
    questionImageKey: normalizeAssetKey(firstImage(question.image_urls || question.image_url)),
    questionImageKeys: toImageList(question.image_urls || question.image_url)
      .map(item => normalizeAssetKey(item))
      .filter(Boolean),
    explanationText: null,
    explanationImageKey: '',
    explanationImageKeys: [],
    options: (Array.isArray(question.options) ? question.options : [])
      .filter(option => String(option.text || '').trim())
      .map(option => ({
        letter: normalizeOptionLetter(option.letter),
        text: String(option.text || ''),
        isCorrect: Boolean(option.is_correct),
        imageKey: normalizeAssetKey(firstImage(option.image_urls || option.image_url)),
        imageKeys: toImageList(option.image_urls || option.image_url)
          .map(item => normalizeAssetKey(item))
          .filter(Boolean),
      })),
  }));
}

const EasyModeScreen: React.FC = () => {
  const [batches, setBatches] = useState<BatchSummary[]>([]);
  const [selectedBatchId, setSelectedBatchId] = useState(localStorage.getItem(EASY_ACTIVE_BATCH_KEY) || '');
  const [selectedBatch, setSelectedBatch] = useState<BatchSummary | null>(null);
  const [draft, setDraft] = useState<DraftResponse | null>(null);
  const [sourceFile, setSourceFile] = useState<File | null>(null);
  const [answerKeyFile, setAnswerKeyFile] = useState<File | null>(null);
  const [nowTs, setNowTs] = useState(Date.now());
  const [uploadingSource, setUploadingSource] = useState(false);
  const [jobStatus, setJobStatus] = useState<JobStatus | null>(null);
  const [sourceStartedAt, setSourceStartedAt] = useState<number | null>(null);
  const [parseStartedAt, setParseStartedAt] = useState<number | null>(null);
  const [parseSeconds, setParseSeconds] = useState<number | null>(null);
  const [reviewedPairs, setReviewedPairs] = useState<ParsedPair[]>([]);
  const [reviewConfirmed, setReviewConfirmed] = useState(false);
  const [answerKeyStatus, setAnswerKeyStatus] = useState('Upload an answer key if you have one.');
  const [savingQuestionId, setSavingQuestionId] = useState('');
  const [metadataSaving, setMetadataSaving] = useState(false);
  const [commitBusy, setCommitBusy] = useState(false);
  const [validateBusy, setValidateBusy] = useState(false);
  const [commitResult, setCommitResult] = useState('');
  const [uiError, setUiError] = useState('');
  const [uiNotice, setUiNotice] = useState('');
  const [questionFilter, setQuestionFilter] = useState<'review' | 'all'>('review');
  const pollTimerRef = useRef<number | null>(null);
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
      // ignore bad local storage
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
    void loadBatches();
  }, []);

  useEffect(() => {
    const match = batches.find(batch => batch.batch_id === selectedBatchId) || null;
    setSelectedBatch(match);
  }, [batches, selectedBatchId]);

  useEffect(() => {
    if (!selectedBatchId) {
      setDraft(null);
      setJobStatus(null);
      return;
    }
    localStorage.setItem(EASY_ACTIVE_BATCH_KEY, selectedBatchId);
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
    if (!response.ok) {
      return;
    }
    const data = (await response.json()) as BatchSummary[];
    const next = Array.isArray(data) ? data : [];
    setBatches(next);
    if (!selectedBatchId && next.length > 0) {
      setSelectedBatchId(next[0].batch_id);
    }
  }

  async function loadDraft(batchId: string) {
    const response = await apiFetch(`${PYTHON_API_BASE}/draft/${batchId}?page=1&limit=200`, {
      headers: authHeaders(),
    });
    if (!response.ok) {
      return;
    }
    const data = (await response.json()) as DraftResponse;
    setDraft(data);
  }

  async function pollJob(jobId: string, batchId: string) {
    const response = await apiFetch(`${PYTHON_API_BASE}/draft/jobs/${jobId}`, { headers: authHeaders() });
    if (!response.ok) {
      return;
    }
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
    if (data.status === 'done') {
      setUiNotice(`Batch ${batchId} is ready.`);
      await loadDraft(batchId);
      await loadBatches();
    }
  }

  async function uploadSourceBatch() {
    if (!sourceFile) {
      setUiError('Choose a PDF or DOCX first.');
      return;
    }
    setUiError('');
    setUiNotice('');
    setUploadingSource(true);
    setSourceStartedAt(Date.now());
    const form = new FormData();
    form.append('file', sourceFile);
    const username = localStorage.getItem('username') || '';
    if (username) {
      form.append('uploaded_by', username);
    }
    if (metadataDraft.subject.trim()) {
      form.append('upload_subject', metadataDraft.subject.trim());
    }
    if (metadataDraft.chapter.trim()) {
      form.append('upload_chapter', metadataDraft.chapter.trim());
    }
    if (metadataDraft.topic.trim()) {
      form.append('upload_topic', metadataDraft.topic.trim());
    }
    const response = await apiFetch(`${PYTHON_API_BASE}/draft/upload`, {
      method: 'POST',
      headers: authHeaders(),
      body: form,
    });
    const data = (await response.json()) as { batch_id?: string; job_id?: string; detail?: string; status?: string };
    if (!response.ok || !data.batch_id) {
      setUploadingSource(false);
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
    setUploadingSource(false);
    setUiNotice(`Upload started for batch ${data.batch_id}.`);
    await loadBatches();
    if (data.job_id) {
      await pollJob(data.job_id, data.batch_id);
    }
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
    setAnswerKeyStatus('Parsing answer key...');
    setReviewedPairs([]);
    setReviewConfirmed(false);
    const form = new FormData();
    form.append('file', answerKeyFile);
    const response = await apiFetch(
      `${PYTHON_API_BASE}/draft/answer-key/parse?max_pages=20&start_page=1&min_q=1&max_q=1200&ocr_dpi=300`,
      {
        method: 'POST',
        headers: authHeaders(),
        body: form,
      }
    );
    const data = (await response.json()) as { pairs?: ParsedPair[]; detail?: string };
    const elapsed = Math.max(0, Math.floor((Date.now() - parseStart) / 1000));
    setParseSeconds(elapsed);
    setParseStartedAt(null);
    if (!response.ok) {
      setUiError(data.detail || 'Answer key parse failed.');
      setAnswerKeyStatus('Answer key parse failed.');
      return;
    }
    const pairs = Array.isArray(data.pairs) ? data.pairs : [];
    setReviewedPairs(pairs.map(pair => ({ number: pair.number, answer: String(pair.answer || '').toUpperCase() })));
    setAnswerKeyStatus(
      pairs.length ? `Parsed ${pairs.length} answers. Review them, then apply.` : 'No answers found in the key.'
    );
  }

  async function applyReviewedAnswers() {
    if (!selectedBatchId) {
      setUiError('Choose or create a batch first.');
      return;
    }
    const validPairs = reviewedPairs
      .map(pair => ({
        number: Number(pair.number),
        answer: String(pair.answer || '').trim().toUpperCase(),
      }))
      .filter(pair => Number.isFinite(pair.number) && pair.number > 0 && ANSWER_CHOICES.includes(pair.answer as AnswerLetter));
    if (!validPairs.length) {
      setUiError('No reviewed answers are ready to apply.');
      return;
    }
    if (!reviewConfirmed) {
      setUiError('Confirm the review before applying the answer key.');
      return;
    }
    setUiError('');
    setAnswerKeyStatus(`Applying ${validPairs.length} reviewed answers...`);
    const response = await apiFetch(`${PYTHON_API_BASE}/draft/${selectedBatchId}/answer-key/apply`, {
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
    const data = (await response.json()) as { applied_count?: number; detail?: string };
    if (!response.ok) {
      setUiError(data.detail || 'Failed to apply reviewed answers.');
      return;
    }
    setAnswerKeyStatus(`Applied ${data.applied_count || 0} answers from the reviewed key.`);
    setUiNotice(`Applied ${data.applied_count || 0} reviewed answers.`);
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
    const patch: Record<string, unknown> = {};
    if (metadataDraft.subject.trim()) patch.subject_name = metadataDraft.subject.trim();
    if (metadataDraft.chapter.trim()) patch.chapter_name = metadataDraft.chapter.trim();
    if (metadataDraft.topic.trim()) patch.topic_name = metadataDraft.topic.trim();
    if (metadataDraft.examType.trim()) patch.exam_type = metadataDraft.examType.trim();
    if (metadataDraft.publishedYear.trim()) patch.published_year = metadataDraft.publishedYear.trim();
    if (Object.keys(patch).length === 0) {
      setUiError('Enter metadata before applying it to the batch.');
      return;
    }
    setMetadataSaving(true);
    setUiError('');
    const response = await apiFetch(`${PYTHON_API_BASE}/draft/${selectedBatchId}/bulk-update`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...authHeaders(),
      },
      body: JSON.stringify({ mode: 'all', patch }),
    });
    const data = (await response.json()) as { updated?: number; detail?: string };
    setMetadataSaving(false);
    if (!response.ok) {
      setUiError(data.detail || 'Failed to apply metadata.');
      return;
    }
    setUiNotice(`Applied metadata to ${data.updated || 0} questions.`);
    await loadDraft(selectedBatchId);
  }

  async function validateBatchBeforeCommit() {
    if (!draft?.questions?.length || !selectedBatchId) return;
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
    const raw = (await response.json()) as { validCount?: number; failedCount?: number; detail?: string };
    setValidateBusy(false);
    if (!response.ok) {
      setUiError(raw.detail || 'Validation failed.');
      return;
    }
    setUiNotice(`Check complete. Valid ${raw.validCount || 0}, failed ${raw.failedCount || 0}.`);
  }

  async function commitBatch() {
    if (!draft?.questions?.length || !selectedBatchId) return;
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
    const data = (await response.json()) as CommitResponse & { detail?: string };
    setCommitBusy(false);
    if (!response.ok) {
      setUiError(data.detail || 'Commit failed.');
      return;
    }
    const inserted = data.insertedCount ?? data.inserted ?? 0;
    const failed = data.failedCount ?? data.failed ?? 0;
    setCommitResult(`Committed ${inserted} questions. ${failed > 0 ? `${failed} failed.` : 'No failures reported.'}`);
    setUiNotice(`Commit finished. Inserted ${inserted}.`);
  }

  const questions = useMemo(() => draft?.questions || [], [draft?.questions]);
  const assetEntries = useMemo(
    () =>
      Object.entries(draft?.image_assets || {}).map(([key, asset]) => ({
        key,
        ...asset,
      })),
    [draft]
  );

  const reviewQuestions = useMemo(() => questions.filter(question => estimateQuestionIssue(question).review), [questions]);

  const visibleQuestions = questionFilter === 'review' ? reviewQuestions : questions;

  const summary = useMemo(() => {
    const unanswered = questions.filter(question => !serializeCorrectAnswer(question)).length;
    const blankText = questions.filter(question => normalizeQuestionText(question).length < 12).length;
    const missingMetadata = questions.filter(question => {
      return !question.subject_name || !question.chapter_name || !question.topic_name || !question.exam_type;
    }).length;
    const withDiagrams = questions.filter(question => assetEntries.some(asset => asset.source_page === question.source_page)).length;
    return {
      total: questions.length,
      reviewNeeded: reviewQuestions.length,
      unanswered,
      blankText,
      missingMetadata,
      withDiagrams,
    };
  }, [assetEntries, questions, reviewQuestions.length]);

  const parseEstimate = useMemo(() => {
    if (!parseStartedAt) return null;
    return Math.max(8, 20 * 4);
  }, [parseStartedAt]);

  const sourceElapsed = sourceStartedAt ? Math.floor((nowTs - sourceStartedAt) / 1000) : null;
  const parseElapsed = parseStartedAt ? Math.floor((nowTs - parseStartedAt) / 1000) : null;

  function diagramsForQuestion(question: DraftQuestion) {
    return assetEntries.filter(asset => asset.source_page === question.source_page);
  }

  function assetUrl(filename: string) {
    const token = encodeURIComponent(localStorage.getItem('token') || '');
    return `${PYTHON_API_BASE}/draft/assets/${encodeURIComponent(selectedBatchId)}/${encodeURIComponent(filename)}?token=${token}`;
  }

  function updateReviewedPair(index: number, field: 'number' | 'answer', value: string) {
    setReviewedPairs(prev =>
      prev.map((pair, pairIndex) => {
        if (pairIndex !== index) return pair;
        if (field === 'number') {
          const next = Number(value);
          return { ...pair, number: Number.isFinite(next) ? next : pair.number };
        }
        return { ...pair, answer: value.toUpperCase() };
      })
    );
  }

  return (
    <div className="easy-mode-page">
      <div className="easy-mode-shell">
        <header className="easy-mode-hero">
          <div>
            <p className="easy-mode-eyebrow">New Workflow</p>
            <h2 className="easy-mode-title">Easy Mode</h2>
            <p className="easy-mode-copy">
              Fast upload, fast answer-key review, and only the questions that actually need attention.
            </p>
          </div>
          <div className="easy-mode-hero-stats">
            <div>
              <span>Total</span>
              <strong>{summary.total}</strong>
            </div>
            <div>
              <span>Needs Review</span>
              <strong>{summary.reviewNeeded}</strong>
            </div>
            <div>
              <span>Ready</span>
              <strong>{Math.max(0, summary.total - summary.reviewNeeded)}</strong>
            </div>
          </div>
        </header>

        <div className="easy-mode-stepper">
          {['Batch', 'Source', 'Answer Key', 'Review', 'Metadata', 'Commit'].map(step => (
            <div className="easy-mode-step" key={step}>
              <span>{step}</span>
            </div>
          ))}
        </div>

        <section className="easy-card">
          <div className="easy-card-head">
            <div>
              <p className="easy-card-kicker">Step 0</p>
              <h3>Choose or create a batch</h3>
            </div>
            <button className="easy-btn subtle" type="button" onClick={() => void loadBatches()}>
              Refresh batches
            </button>
          </div>
          <div className="easy-batch-grid">
            <div className="easy-batch-create">
              <label className="easy-file-pick">
                <span>Source PDF or DOCX</span>
                <input type="file" accept=".pdf,.doc,.docx" onChange={e => setSourceFile(e.target.files?.[0] || null)} />
              </label>
              <button className="easy-btn primary" type="button" disabled={uploadingSource} onClick={() => void uploadSourceBatch()}>
                {uploadingSource ? 'Uploading...' : 'Upload and Start'}
              </button>
              <p className="easy-muted">{sourceFile ? sourceFile.name : 'No file selected yet.'}</p>
            </div>
            <div className="easy-batch-list">
              {batches.slice(0, 8).map(batch => (
                <button
                  type="button"
                  key={batch.batch_id}
                  className={`easy-batch-item ${selectedBatchId === batch.batch_id ? 'active' : ''}`}
                  onClick={() => setSelectedBatchId(batch.batch_id)}
                >
                  <strong>{batch.batch_id}</strong>
                  <span>{batch.file_name || 'Untitled batch'}</span>
                  <small>{batch.status}{typeof batch.total_questions === 'number' ? ` • ${batch.total_questions} questions` : ''}</small>
                </button>
              ))}
            </div>
          </div>
        </section>

        <section className="easy-card">
          <div className="easy-card-head">
            <div>
              <p className="easy-card-kicker">Step 1</p>
              <h3>Source processing</h3>
            </div>
          </div>
          <div className="easy-status-grid">
            <div className="easy-status-card">
              <span>Selected batch</span>
              <strong>{selectedBatchId || 'None'}</strong>
            </div>
            <div className="easy-status-card">
              <span>Status</span>
              <strong>{jobStatus?.status || selectedBatch?.status || draft?.status || 'Waiting'}</strong>
            </div>
            <div className="easy-status-card">
              <span>Progress</span>
              <strong>{typeof jobStatus?.progress === 'number' ? `${jobStatus.progress}%` : typeof selectedBatch?.progress === 'number' ? `${selectedBatch.progress}%` : 'Not started'}</strong>
            </div>
            <div className="easy-status-card">
              <span>Pages</span>
              <strong>
                {typeof jobStatus?.pages_done === 'number'
                  ? `${jobStatus.pages_done}/${jobStatus.total_pages || '?'}`
                  : typeof selectedBatch?.pages_done === 'number'
                  ? `${selectedBatch.pages_done}/${selectedBatch.total_pages || '?'}`
                  : 'Unknown'}
              </strong>
            </div>
            <div className="easy-status-card">
              <span>Elapsed</span>
              <strong>{sourceElapsed !== null ? formatDuration(sourceElapsed) : 'Not running'}</strong>
            </div>
          </div>
        </section>

        <section className="easy-card">
          <div className="easy-card-head">
            <div>
              <p className="easy-card-kicker">Step 2</p>
              <h3>Upload answer key</h3>
            </div>
          </div>
          <div className="easy-key-top">
            <label className="easy-file-pick wide">
              <span>Answer key file</span>
              <input type="file" accept=".pdf,.png,.jpg,.jpeg,.doc,.docx" onChange={e => setAnswerKeyFile(e.target.files?.[0] || null)} />
            </label>
            <button className="easy-btn primary" type="button" onClick={() => void parseAnswerKey()}>
              Parse Answer Key
            </button>
            <button
              className="easy-btn secondary"
              type="button"
              onClick={() => void applyReviewedAnswers()}
              disabled={!reviewedPairs.length || !reviewConfirmed}
            >
              Apply Reviewed Answers
            </button>
          </div>
          <div className="easy-parse-grid">
            <div className="easy-status-card">
              <span>Status</span>
              <strong>{answerKeyStatus}</strong>
            </div>
            <div className="easy-status-card">
              <span>Elapsed</span>
              <strong>{parseElapsed !== null ? formatDuration(parseElapsed) : parseSeconds !== null ? formatDuration(parseSeconds) : 'Not started'}</strong>
            </div>
            <div className="easy-status-card">
              <span>Estimated total</span>
              <strong>{parseEstimate !== null ? formatDuration(parseEstimate) : parseSeconds !== null ? formatDuration(parseSeconds) : 'Waiting'}</strong>
            </div>
            <div className="easy-status-card">
              <span>Answers done</span>
              <strong>{reviewedPairs.length}</strong>
            </div>
          </div>
          {reviewedPairs.length > 0 ? (
            <div className="easy-answer-review">
              <div className="easy-answer-review-head">
                <strong>Review answers before apply</strong>
                <span>{reviewedPairs.length} parsed answers</span>
              </div>
              <div className="easy-answer-table">
                {reviewedPairs.map((pair, index) => (
                  <div className="easy-answer-row" key={`${pair.number}-${index}`}>
                    <input type="number" value={pair.number} onChange={e => updateReviewedPair(index, 'number', e.target.value)} />
                    <select value={pair.answer} onChange={e => updateReviewedPair(index, 'answer', e.target.value)}>
                      <option value="">Blank</option>
                      {ANSWER_CHOICES.map(choice => (
                        <option value={choice} key={`${pair.number}-${choice}`}>
                          {choice}
                        </option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>
              <label className="easy-checkbox">
                <input type="checkbox" checked={reviewConfirmed} onChange={e => setReviewConfirmed(e.target.checked)} />
                <span>I reviewed these answers and want to apply them now.</span>
              </label>
            </div>
          ) : null}
        </section>

        <section className="easy-card">
          <div className="easy-card-head">
            <div>
              <p className="easy-card-kicker">Step 3</p>
              <h3>Fix only what needs review</h3>
            </div>
            <div className="easy-segment">
              <button type="button" className={questionFilter === 'review' ? 'active' : ''} onClick={() => setQuestionFilter('review')}>
                Needs Review
              </button>
              <button type="button" className={questionFilter === 'all' ? 'active' : ''} onClick={() => setQuestionFilter('all')}>
                All Questions
              </button>
            </div>
          </div>
          {visibleQuestions.length === 0 ? (
            <p className="easy-empty">No questions in this view yet.</p>
          ) : (
            <div className="easy-review-list">
              {visibleQuestions.map((question, index) => {
                const questionNumber = normalizeQuestionNumber(question, index + 1);
                const issue = estimateQuestionIssue(question);
                const answer = serializeCorrectAnswer(question);
                const options = Array.isArray(question.options) ? question.options : [];
                const pageAssets = diagramsForQuestion(question);
                return (
                  <article className="easy-question-card" key={question.question_id}>
                    <div className="easy-question-head">
                      <div>
                        <strong>Q{questionNumber}</strong>
                        <span>Page {question.source_page || '?'}</span>
                      </div>
                      <div className="easy-question-tags">
                        {issue.reasons.map(reason => (
                          <span key={reason}>{reason}</span>
                        ))}
                      </div>
                    </div>
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
                    <div className="easy-option-list">
                      {options.map(option => (
                        <label className="easy-option-row" key={`${question.question_id}-${option.letter}`}>
                          <span>{normalizeOptionLetter(option.letter)}</span>
                          <input
                            type="text"
                            defaultValue={option.text}
                            placeholder={`Option ${normalizeOptionLetter(option.letter)}`}
                            onBlur={e => {
                              const nextOptions = options.map(item => (item.letter === option.letter ? { ...item, text: e.target.value } : item));
                              void patchQuestion(question.question_id, { options: nextOptions });
                            }}
                          />
                        </label>
                      ))}
                    </div>
                    <div className="easy-question-footer">
                      <label className="easy-answer-pick">
                        <span>Correct answer</span>
                        <select
                          value={answer}
                          onChange={e => {
                            const nextAnswer = e.target.value.toUpperCase();
                            void patchQuestion(question.question_id, {
                              correct_option_letters: nextAnswer,
                              options: patchOptionsWithAnswer(options, nextAnswer),
                            });
                          }}
                        >
                          <option value="">Select</option>
                          {ANSWER_CHOICES.map(choice => (
                            <option value={choice} key={`${question.question_id}-${choice}`}>
                              {choice}
                            </option>
                          ))}
                        </select>
                      </label>
                      <div className="easy-saving-indicator">{savingQuestionId === question.question_id ? 'Saving...' : 'Auto-saves on blur'}</div>
                    </div>
                    {pageAssets.length > 0 ? (
                      <div className="easy-diagram-strip">
                        {pageAssets.map(asset => (
                          <figure key={`${question.question_id}-${asset.key}`}>
                            <img src={assetUrl(asset.filename)} alt={asset.filename} />
                            <figcaption>{asset.type || `Page ${question.source_page}`}</figcaption>
                          </figure>
                        ))}
                      </div>
                    ) : null}
                  </article>
                );
              })}
            </div>
          )}
        </section>

        <section className="easy-card">
          <div className="easy-card-head">
            <div>
              <p className="easy-card-kicker">Step 4</p>
              <h3>Important metadata only</h3>
            </div>
            <button className="easy-btn secondary" type="button" disabled={metadataSaving} onClick={() => void applyMetadataToAll()}>
              {metadataSaving ? 'Applying...' : 'Apply to all questions'}
            </button>
          </div>
          <div className="easy-meta-grid">
            <label>
              <span>Subject</span>
              <input value={metadataDraft.subject} onChange={e => setMetadataDraft(prev => ({ ...prev, subject: e.target.value }))} placeholder="Biology" />
            </label>
            <label>
              <span>Chapter</span>
              <input value={metadataDraft.chapter} onChange={e => setMetadataDraft(prev => ({ ...prev, chapter: e.target.value }))} placeholder="Plant Physiology" />
            </label>
            <label>
              <span>Topic</span>
              <input value={metadataDraft.topic} onChange={e => setMetadataDraft(prev => ({ ...prev, topic: e.target.value }))} placeholder="Transpiration" />
            </label>
            <label>
              <span>Exam type</span>
              <input value={metadataDraft.examType} onChange={e => setMetadataDraft(prev => ({ ...prev, examType: e.target.value }))} placeholder="NEET" />
            </label>
            <label>
              <span>Published year</span>
              <input value={metadataDraft.publishedYear} onChange={e => setMetadataDraft(prev => ({ ...prev, publishedYear: e.target.value }))} placeholder="2026" />
            </label>
          </div>
        </section>

        <section className="easy-card">
          <div className="easy-card-head">
            <div>
              <p className="easy-card-kicker">Step 5</p>
              <h3>Final check and commit</h3>
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
            <div className="easy-summary-card">
              <span>With diagrams</span>
              <strong>{summary.withDiagrams}</strong>
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
      </div>
    </div>
  );
};

export default EasyModeScreen;
