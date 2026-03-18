import React, { useMemo, useState } from 'react';

type OptionKey = 'A' | 'B' | 'C' | 'D';

type QuestionRow = {
  id: number;
  stemPrimary: string;
  stemSecondary: string;
  sourcePage?: number;
  selected: OptionKey;
  options: Record<OptionKey, string>;
};

const OPTION_KEYS: OptionKey[] = ['A', 'B', 'C', 'D'];

function createQuestionRow(id: number): QuestionRow {
  return {
    id,
    stemPrimary: '',
    stemSecondary: '',
    selected: 'B',
    options: {
      A: '',
      B: '',
      C: '',
      D: '',
    },
  };
}

function getOptionText(question: QuestionRow, option: OptionKey): string {
  switch (option) {
    case 'A':
      return question.options.A;
    case 'B':
      return question.options.B;
    case 'C':
      return question.options.C;
    case 'D':
      return question.options.D;
    default:
      return '';
  }
}

type ParsedAnswerPair = {
  number: number;
  answer: OptionKey;
};

type BatchUploadResponse = {
  job_id: string;
  batch_id: string;
  status: string;
};

type AnswerKeyParseResponse = {
  pairs?: ParsedAnswerPair[];
  parser_mode?: string;
  confidence?: number;
  warnings?: string[];
  blocked?: boolean;
};

type AnswerKeyApplyResponse = {
  applied_count?: number;
  matched_count?: number;
  unmatched_qno_count?: number;
};

type DraftAsset = {
  filename: string;
  source_page?: number;
  type?: string;
};

type DraftResponse = {
  questions?: Array<{
    question_id?: string;
    questionNumber?: number | string;
    question_number?: number | string;
    questionText?: string;
    question_text?: string;
    source_page?: number;
    options?: Array<{ letter?: string; text?: string; is_correct?: boolean }>;
  }>;
  image_assets?: Record<string, DraftAsset>;
};

const PYTHON_API_BASE = (process.env.REACT_APP_PYTHON_API_BASE_URL || 'http://localhost:8000').replace(/\/$/, '');

const AISimplifiedAutomation: React.FC = () => {
  const [subject, setSubject] = useState('');
  const [topic, setTopic] = useState('');
  const [subTopic, setSubTopic] = useState('');
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [keyFile, setKeyFile] = useState<File | null>(null);
  const [solutionFile, setSolutionFile] = useState<File | null>(null);
  const [questions, setQuestions] = useState<QuestionRow[]>([createQuestionRow(1), createQuestionRow(2)]);
  const [batchId, setBatchId] = useState('');
  const [jobId, setJobId] = useState('');
  const [parsedPairs, setParsedPairs] = useState<ParsedAnswerPair[]>([]);
  const [editablePairs, setEditablePairs] = useState<ParsedAnswerPair[]>([]);
  const [parseConfidence, setParseConfidence] = useState<number | null>(null);
  const [parseWarnings, setParseWarnings] = useState<string[]>([]);
  const [reviewConfirmed, setReviewConfirmed] = useState(false);
  const [applyBlocked, setApplyBlocked] = useState(false);
  const [solutionAssetName, setSolutionAssetName] = useState('');
  const [diagramAssets, setDiagramAssets] = useState<Array<{ key: string; filename: string; type?: string; sourcePage?: number }>>([]);
  const [statusMessage, setStatusMessage] = useState('Waiting for first upload.');
  const [errorMessage, setErrorMessage] = useState('');
  const [busyAction, setBusyAction] = useState<'upload' | 'parse' | 'apply' | 'solution' | ''>('');

  const summary = useMemo(
    () => ({
      subject: subject.trim() || 'Not set',
      topic: topic.trim() || 'Not set',
      subTopic: subTopic.trim() || 'Not set',
      questions: questions.length,
      batchId: batchId || 'Not created',
    }),
    [subject, topic, subTopic, questions.length, batchId]
  );

  const confidenceTier = useMemo<'high' | 'medium' | 'low' | 'unknown'>(() => {
    if (parseConfidence === null || Number.isNaN(parseConfidence)) {
      return 'unknown';
    }
    if (parseConfidence >= 0.98) {
      return 'high';
    }
    if (parseConfidence >= 0.9) {
      return 'medium';
    }
    return 'low';
  }, [parseConfidence]);

  const reviewStatus = useMemo<'blocked' | 'review' | 'idle'>(() => {
    if (!parsedPairs.length) {
      return 'idle';
    }
    if (applyBlocked) {
      return 'blocked';
    }
    return 'review';
  }, [applyBlocked, parsedPairs.length]);

  const parsedRange = useMemo(() => {
    if (!editablePairs.length) {
      return null;
    }
    const numbers = editablePairs.map(pair => pair.number);
    return {
      min: Math.min(...numbers),
      max: Math.max(...numbers),
    };
  }, [editablePairs]);

  function updateStem(questionId: number, field: 'stemPrimary' | 'stemSecondary', value: string) {
    setQuestions(prev =>
      prev.map(question => (question.id === questionId ? { ...question, [field]: value } : question))
    );
  }

  function updateOption(questionId: number, option: OptionKey, value: string) {
    setQuestions(prev =>
      prev.map(question =>
        question.id === questionId
          ? { ...question, options: { ...question.options, [option]: value } }
          : question
      )
    );
  }

  function updateSelected(questionId: number, value: OptionKey) {
    setQuestions(prev =>
      prev.map(question => (question.id === questionId ? { ...question, selected: value } : question))
    );
  }

  function addQuestion() {
    setQuestions(prev => [...prev, createQuestionRow(prev.length + 1)]);
  }

  function resetQuestions() {
    setQuestions([createQuestionRow(1), createQuestionRow(2)]);
    setParsedPairs([]);
    setEditablePairs([]);
    setParseConfidence(null);
    setParseWarnings([]);
    setReviewConfirmed(false);
    setApplyBlocked(false);
    setBatchId('');
    setJobId('');
    setSolutionAssetName('');
    setStatusMessage('Workspace reset.');
    setErrorMessage('');
  }

  function authHeaders(): Record<string, string> {
    const token = localStorage.getItem('token') || '';
    return token ? { Authorization: `Bearer ${token}` } : {};
  }

  function assetUrl(filename: string): string {
    const token = encodeURIComponent(localStorage.getItem('token') || '');
    return `${PYTHON_API_BASE}/draft/assets/${encodeURIComponent(batchId)}/${encodeURIComponent(filename)}?token=${token}`;
  }

  function diagramsForPage(sourcePage?: number) {
    if (!sourcePage) {
      return [];
    }
    return diagramAssets.filter(asset => asset.sourcePage === sourcePage);
  }

  async function loadDraftAssets(targetBatchId: string) {
    if (!targetBatchId) {
      setDiagramAssets([]);
      return;
    }
    try {
      const response = await fetch(`${PYTHON_API_BASE}/draft/${targetBatchId}?page=1&limit=200`, {
        headers: authHeaders(),
      });
      const data = (await response.json()) as DraftResponse | { detail?: string };
      if (!response.ok) {
        throw new Error((data as { detail?: string }).detail || 'Failed to load draft assets.');
      }
      const draft = data as DraftResponse;
      const assets = Object.entries(draft.image_assets || {}).map(([key, asset]) => ({
        key,
        filename: asset.filename,
        type: asset.type,
        sourcePage: asset.source_page,
      }));
      setDiagramAssets(assets);

      const draftQuestions = Array.isArray(draft.questions) ? draft.questions : [];
      if (draftQuestions.length > 0) {
        const normalizedQuestions = draftQuestions.map((question, index) => {
          const questionNumber = Number(
            question.questionNumber ?? question.question_number ?? index + 1
          );
          const row = createQuestionRow(Number.isFinite(questionNumber) && questionNumber > 0 ? questionNumber : index + 1);
          const prompt = String(question.questionText ?? question.question_text ?? '').trim();
          const optionMap = { ...row.options };
          const selectedOption =
            question.options?.find(option => option.is_correct && OPTION_KEYS.includes((option.letter || '').toUpperCase() as OptionKey))
              ?.letter?.toUpperCase() as OptionKey | undefined;

          for (const option of question.options || []) {
            const letter = String(option.letter || '').toUpperCase() as OptionKey;
            const value = String(option.text || '');
            switch (letter) {
              case 'A':
                optionMap.A = value;
                break;
              case 'B':
                optionMap.B = value;
                break;
              case 'C':
                optionMap.C = value;
                break;
              case 'D':
                optionMap.D = value;
                break;
              default:
                break;
            }
          }

          return {
            ...row,
            stemPrimary: prompt,
            sourcePage: question.source_page,
            selected: selectedOption || row.selected,
            options: optionMap,
          };
        });
        setQuestions(normalizedQuestions);
      }
    } catch {
      setDiagramAssets([]);
    }
  }

  function syncQuestionsWithAnswers(pairs: ParsedAnswerPair[]) {
    if (!pairs.length) {
      return;
    }
    const maxQuestionNo = pairs.reduce((max, pair) => Math.max(max, pair.number), 0);
    const seededRows = Array.from({ length: maxQuestionNo }, (_, index) => createQuestionRow(index + 1));
    const pairMap = new Map<number, OptionKey>(pairs.map(pair => [pair.number, pair.answer]));
    const mergedRows = seededRows.map(row => ({
      ...row,
      selected: pairMap.get(row.id) || row.selected,
    }));
    setQuestions(mergedRows);
  }

  function updateEditablePair(number: number, answer: string) {
    setEditablePairs(prev =>
      prev.map(pair =>
        pair.number === number
          ? {
              ...pair,
              answer: (answer || '') as OptionKey,
            }
          : pair
      )
    );
  }

  async function uploadPdfBatch() {
    if (!pdfFile) {
      setErrorMessage('Choose a PDF file first.');
      return;
    }
    setBusyAction('upload');
    setErrorMessage('');
    setStatusMessage('Uploading PDF and creating a draft batch...');

    const formData = new FormData();
    formData.append('file', pdfFile);
    if (localStorage.getItem('username')) {
      formData.append('uploaded_by', localStorage.getItem('username') || '');
    }
    if (subject.trim()) {
      formData.append('upload_subject', subject.trim());
    }
    if (subTopic.trim()) {
      formData.append('upload_chapter', subTopic.trim());
    }
    if (topic.trim()) {
      formData.append('upload_topic', topic.trim());
    }

    try {
      const response = await fetch(`${PYTHON_API_BASE}/draft/upload`, {
        method: 'POST',
        headers: authHeaders(),
        body: formData,
      });
      const data = (await response.json()) as BatchUploadResponse | { detail?: string };
      if (!response.ok) {
        throw new Error((data as { detail?: string }).detail || 'Failed to upload PDF.');
      }
      const success = data as BatchUploadResponse;
      setBatchId(success.batch_id);
      setJobId(success.job_id);
      setStatusMessage(`Draft batch ${success.batch_id} created. Job ${success.job_id} is ${success.status}.`);
      await loadDraftAssets(success.batch_id);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Failed to upload PDF.');
    } finally {
      setBusyAction('');
    }
  }

  async function parseKeyFile() {
    if (!keyFile) {
      setErrorMessage('Choose a key file first.');
      return;
    }
    setBusyAction('parse');
    setErrorMessage('');
    setStatusMessage('Parsing answer key file...');

    const formData = new FormData();
    formData.append('file', keyFile);

    try {
      const response = await fetch(
        `${PYTHON_API_BASE}/draft/answer-key/parse?max_pages=20&start_page=1&ocr_dpi=300&min_q=1&max_q=1200`,
        {
          method: 'POST',
          headers: authHeaders(),
          body: formData,
        }
      );
      const data = (await response.json()) as AnswerKeyParseResponse | { detail?: string };
      if (!response.ok) {
        throw new Error((data as { detail?: string }).detail || 'Failed to parse answer key.');
      }
      const success = data as AnswerKeyParseResponse;
      const pairs = Array.isArray(success.pairs) ? success.pairs : [];
      const nextConfidence =
        typeof success.confidence === 'number' && Number.isFinite(success.confidence)
          ? success.confidence
          : null;
      const derivedWarnings = Array.isArray(success.warnings) ? success.warnings.filter(Boolean) : [];
      if (!pairs.length) {
        derivedWarnings.push('No parsed answers returned.');
      }
      if (nextConfidence !== null && nextConfidence < 0.9) {
        derivedWarnings.push('Confidence is below the reviewer-assisted apply threshold.');
      }
      const nextBlocked = Boolean(success.blocked) || !pairs.length || (nextConfidence !== null && nextConfidence < 0.9);
      setParsedPairs(pairs);
      setEditablePairs(
        pairs.map(pair => ({
          number: pair.number,
          answer: pair.answer,
        }))
      );
      setParseConfidence(nextConfidence);
      setParseWarnings(Array.from(new Set(derivedWarnings)));
      setReviewConfirmed(false);
      setApplyBlocked(nextBlocked);
      setStatusMessage(
        nextBlocked
          ? `Parsed ${pairs.length} answers using ${success.parser_mode || 'hybrid'} mode. Review is blocked until the key is rechecked.`
          : `Parsed ${pairs.length} answers using ${success.parser_mode || 'hybrid'} mode. Review and edit before apply.`
      );
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Failed to parse answer key.');
    } finally {
      setBusyAction('');
    }
  }

  async function applyParsedAnswers() {
    if (!batchId) {
      setErrorMessage('Create a draft batch before applying answers.');
      return;
    }
    if (!parsedPairs.length) {
      setErrorMessage('Parse a key file before applying answers.');
      return;
    }
    const reviewedPairs = editablePairs.filter(
      pair => pair.number > 0 && OPTION_KEYS.includes(pair.answer)
    );
    if (!reviewedPairs.length) {
      setErrorMessage('No reviewed answers are ready to apply.');
      return;
    }
    if (applyBlocked) {
      setErrorMessage('This parsed key is blocked for apply. Recheck the key file before continuing.');
      return;
    }
    if (!reviewConfirmed) {
      setErrorMessage('Confirm review before applying parsed answers.');
      return;
    }

    setBusyAction('apply');
    setErrorMessage('');
    setStatusMessage(`Applying ${reviewedPairs.length} reviewed answers to batch ${batchId}...`);

    try {
      const response = await fetch(`${PYTHON_API_BASE}/draft/${batchId}/answer-key/apply`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...authHeaders(),
        },
        body: JSON.stringify({
          pairs: reviewedPairs,
          overwrite_existing: true,
          min_q: 1,
          max_q: Math.max(...reviewedPairs.map(pair => pair.number)),
        }),
      });
      const data = (await response.json()) as AnswerKeyApplyResponse | { detail?: string };
      if (!response.ok) {
        throw new Error((data as { detail?: string }).detail || 'Failed to apply answer key.');
      }
      const success = data as AnswerKeyApplyResponse;
      setParsedPairs(reviewedPairs);
      syncQuestionsWithAnswers(reviewedPairs);
      setStatusMessage(
        `Applied ${success.applied_count || 0} reviewed answers. Matched ${success.matched_count || 0}, unmatched ${success.unmatched_qno_count || 0}.`
      );
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Failed to apply answer key.');
    } finally {
      setBusyAction('');
    }
  }

  async function uploadSolutionAsset() {
    if (!batchId) {
      setErrorMessage('Create a draft batch before uploading the solution file.');
      return;
    }
    if (!solutionFile) {
      setErrorMessage('Choose a solution file first.');
      return;
    }

    setBusyAction('solution');
    setErrorMessage('');
    setStatusMessage(`Uploading solution file into batch ${batchId}...`);

    const formData = new FormData();
    formData.append('file', solutionFile);

    try {
      const response = await fetch(`${PYTHON_API_BASE}/draft/assets/${batchId}/upload`, {
        method: 'POST',
        headers: authHeaders(),
        body: formData,
      });
      const data = (await response.json()) as { filename?: string; detail?: string };
      if (!response.ok) {
        throw new Error(data.detail || 'Failed to upload solution file.');
      }
      setSolutionAssetName(data.filename || solutionFile.name);
      setStatusMessage(`Solution file uploaded as ${data.filename || solutionFile.name}.`);
      await loadDraftAssets(batchId);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Failed to upload solution file.');
    } finally {
      setBusyAction('');
    }
  }

  function fileLabel(event: React.ChangeEvent<HTMLInputElement>, setter: (value: File | null) => void) {
    setter(event.target.files?.[0] || null);
  }

  return (
    <div className="max-w-7xl mx-auto px-4">
      <section className="simplified-automation-shell">
        <div className="simplified-automation-header">
          <div>
            <p className="simplified-automation-eyebrow">New Page</p>
            <h2 className="simplified-automation-title">AI Simplified Automation</h2>
            <p className="simplified-automation-copy">
              A reduced automation workspace for PDF upload, key review, and explicit reviewer-assisted answer apply.
            </p>
          </div>
          <div className="simplified-automation-actions">
            <button type="button" className="simplified-btn secondary" onClick={resetQuestions}>
              Reset Questions
            </button>
            <button type="button" className="simplified-btn primary" onClick={addQuestion}>
              Add Question
            </button>
          </div>
        </div>

        <div className="simplified-automation-grid">
          <section className="simplified-panel simplified-form-panel">
            <div className="simplified-panel-title">Form Fields</div>
            <div className="simplified-field-grid">
              <label className="simplified-label">
                <span>Subject</span>
                <input value={subject} onChange={e => setSubject(e.target.value)} placeholder="Biology" />
              </label>
              <label className="simplified-label">
                <span>Topic</span>
                <input value={topic} onChange={e => setTopic(e.target.value)} placeholder="Plant Physiology" />
              </label>
              <label className="simplified-label">
                <span>Sub Topic</span>
                <input value={subTopic} onChange={e => setSubTopic(e.target.value)} placeholder="Transpiration" />
              </label>
            </div>
          </section>

          <section className="simplified-panel simplified-upload-panel">
            <div className="simplified-panel-title">Options and File Upload</div>
            <div className="simplified-upload-list">
              <label className="simplified-upload-row">
                <span>UPLOAD Pdf</span>
                <div className="simplified-upload-action">
                  <input type="file" accept=".pdf,.docx" onChange={e => fileLabel(e, setPdfFile)} />
                  <span className="simplified-upload-pill">Browse</span>
                </div>
                <small>{pdfFile?.name || 'No file selected'}</small>
              </label>
              <label className="simplified-upload-row">
                <span>Key</span>
                <div className="simplified-upload-action">
                  <input type="file" accept=".pdf,.png,.jpg,.jpeg,.doc,.docx" onChange={e => fileLabel(e, setKeyFile)} />
                  <span className="simplified-upload-pill">Browse</span>
                </div>
                <small>{keyFile?.name || 'No file selected'}</small>
              </label>
              <label className="simplified-upload-row">
                <span>Solution</span>
                <div className="simplified-upload-action">
                  <input type="file" accept=".pdf,.png,.jpg,.jpeg,.doc,.docx" onChange={e => fileLabel(e, setSolutionFile)} />
                  <span className="simplified-upload-pill">Browse</span>
                </div>
                <small>{solutionFile?.name || 'Optional file'}</small>
              </label>
              <div className="simplified-backend-actions">
                <button type="button" className="simplified-btn primary" onClick={uploadPdfBatch} disabled={busyAction !== ''}>
                  {busyAction === 'upload' ? 'Uploading PDF...' : 'Create Draft Batch'}
                </button>
                <button type="button" className="simplified-btn secondary" onClick={parseKeyFile} disabled={busyAction !== ''}>
                  {busyAction === 'parse' ? 'Parsing Answer Sheet...' : 'Upload Answer Sheet For Review'}
                </button>
                <button
                  type="button"
                  className="simplified-btn secondary"
                  onClick={applyParsedAnswers}
                  disabled={busyAction !== '' || !batchId || !parsedPairs.length || applyBlocked || !reviewConfirmed}
                >
                  {busyAction === 'apply' ? 'Applying Reviewed Key...' : 'Apply Reviewed Answers'}
                </button>
                <button type="button" className="simplified-btn secondary" onClick={uploadSolutionAsset} disabled={busyAction !== '' || !batchId}>
                  {busyAction === 'solution' ? 'Uploading Solution...' : 'Upload Solution'}
                </button>
              </div>
            </div>
          </section>

          <aside className="simplified-panel simplified-diagram-panel">
            <div className="simplified-panel-title">Diagram Area</div>
            <div className="simplified-diagram-card">
              <div className="simplified-diagram-heading">Diagram</div>
              <div className="simplified-diagram-body">
                {diagramAssets.length > 0 ? (
                  <div className="simplified-diagram-gallery">
                    {diagramAssets.map(asset => (
                      <figure className="simplified-diagram-item" key={asset.key}>
                        <img src={assetUrl(asset.filename)} alt={asset.filename} />
                        <figcaption>
                          <strong>{asset.type || 'diagram'}</strong>
                          <span>{asset.sourcePage ? `Page ${asset.sourcePage}` : asset.filename}</span>
                        </figcaption>
                      </figure>
                    ))}
                  </div>
                ) : (
                  <>
                    <div className="simplified-diagram-compass" />
                    <p>Upload a PDF batch to load extracted diagrams and attached solution assets here.</p>
                  </>
                )}
              </div>
            </div>
          </aside>
        </div>

        <div className="simplified-question-board">
          {questions.map(question => (
            <div className="simplified-question-row" key={question.id}>
              <div className="simplified-question-marker">
                <span className="simplified-question-number">Q. No. {question.id}</span>
                {question.sourcePage ? (
                  <span className="simplified-page-tag">Page {question.sourcePage}</span>
                ) : null}
                <div className="simplified-flow">
                  <input
                    className="simplified-flow-input"
                    value={question.stemPrimary}
                    onChange={e => updateStem(question.id, 'stemPrimary', e.target.value)}
                    placeholder="Question text"
                  />
                  <span className="simplified-flow-arrow">-&gt;</span>
                  <input
                    className="simplified-flow-input"
                    value={question.stemSecondary}
                    onChange={e => updateStem(question.id, 'stemSecondary', e.target.value)}
                    placeholder="Question continuation"
                  />
                  <span className="simplified-flow-arrow">-&gt;</span>
                </div>
                <div className="simplified-question-diagrams">
                  {diagramsForPage(question.sourcePage).length > 0 ? (
                    <>
                      <p className="simplified-question-diagrams-title">
                        This page has these images
                      </p>
                      <div className="simplified-question-diagram-strip">
                        {diagramsForPage(question.sourcePage).map(asset => (
                          <figure className="simplified-question-diagram" key={`${question.id}-${asset.key}`}>
                            <img src={assetUrl(asset.filename)} alt={asset.filename} />
                            <figcaption>{asset.type || asset.filename}</figcaption>
                          </figure>
                        ))}
                      </div>
                    </>
                  ) : (
                    <p className="simplified-question-diagrams-empty">
                      No page-linked diagrams found for this question yet.
                    </p>
                  )}
                </div>
              </div>

              <div className="simplified-options-grid">
                {OPTION_KEYS.map(option => (
                  <label className="simplified-option-row" key={`${question.id}-${option}`}>
                    <div className="simplified-option-select">
                      <span>{option}</span>
                      <input
                        type="radio"
                        name={`question-${question.id}`}
                        checked={question.selected === option}
                        onChange={() => updateSelected(question.id, option)}
                      />
                    </div>
                    <input
                      value={getOptionText(question, option)}
                      onChange={e => updateOption(question.id, option, e.target.value)}
                      placeholder={`Option ${option}`}
                    />
                  </label>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="simplified-summary-strip">
          <div>
            <span>Subject</span>
            <strong>{summary.subject}</strong>
          </div>
          <div>
            <span>Topic</span>
            <strong>{summary.topic}</strong>
          </div>
          <div>
            <span>Sub Topic</span>
            <strong>{summary.subTopic}</strong>
          </div>
          <div>
            <span>Questions</span>
            <strong>{summary.questions}</strong>
          </div>
          <div>
            <span>Batch</span>
            <strong>{summary.batchId}</strong>
          </div>
        </div>

        <div className={`simplified-key-review-panel simplified-key-review-panel--${reviewStatus}`}>
          <div className="simplified-key-review-header">
            <div>
              <span className="simplified-key-review-label">Answer Key Review</span>
              <strong>
                {reviewStatus === 'blocked'
                  ? 'Blocked for apply'
                  : reviewStatus === 'review'
                  ? 'Review required before apply'
                  : 'No parsed key yet'}
              </strong>
            </div>
            <div className={`simplified-confidence-pill simplified-confidence-pill--${confidenceTier}`}>
              Confidence {confidenceTier === 'unknown' ? 'Unknown' : confidenceTier.toUpperCase()}
              {parseConfidence !== null ? ` (${Math.round(parseConfidence * 100)}%)` : ''}
            </div>
          </div>
          <div className="simplified-key-review-meta">
            <div>
              <span>Parsed Count</span>
              <strong>{editablePairs.length}</strong>
            </div>
            <div>
              <span>Detected Range</span>
              <strong>{parsedRange ? `Q${parsedRange.min}-Q${parsedRange.max}` : 'Not available'}</strong>
            </div>
            <div>
              <span>Review Mode</span>
              <strong>{reviewStatus === 'blocked' ? 'Blocked' : parsedPairs.length ? 'Editable before apply' : 'Waiting for parse'}</strong>
            </div>
          </div>
          {parseWarnings.length > 0 ? (
            <ul className="simplified-key-warning-list">
              {parseWarnings.map(warning => (
                <li key={warning}>{warning}</li>
              ))}
            </ul>
          ) : (
            <p className="simplified-key-review-copy">
              {parsedPairs.length
                ? 'Review and edit the parsed key before applying it to the draft batch.'
                : 'Parse a key file to load confidence and warning details.'}
            </p>
          )}
          {editablePairs.length > 0 ? (
            <div className="simplified-key-table">
              <div className="simplified-key-table-head">
                <span>Q No.</span>
                <span>Parsed</span>
                <span>Reviewed Answer</span>
              </div>
              <div className="simplified-key-table-body">
                {editablePairs.map(pair => (
                  <div className="simplified-key-table-row" key={pair.number}>
                    <span className="simplified-key-qno">{pair.number}</span>
                    <span className="simplified-key-parsed">{pair.answer}</span>
                    <select
                      className="simplified-key-select"
                      value={pair.answer}
                      onChange={e => updateEditablePair(pair.number, e.target.value)}
                      disabled={applyBlocked}
                    >
                      <option value="">Blank</option>
                      {OPTION_KEYS.map(option => (
                        <option key={`${pair.number}-${option}`} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
          <label className="simplified-review-confirm">
            <input
              type="checkbox"
              checked={reviewConfirmed}
              onChange={e => setReviewConfirmed(e.target.checked)}
              disabled={applyBlocked || !parsedPairs.length}
            />
            <span>I reviewed the parsed key and want to apply only after this explicit confirmation.</span>
          </label>
        </div>

        <div className="simplified-status-board">
          <div className="simplified-status-card">
            <span>Status</span>
            <strong>{statusMessage}</strong>
          </div>
          <div className="simplified-status-card">
            <span>Job</span>
            <strong>{jobId || 'Not created'}</strong>
          </div>
          <div className="simplified-status-card">
            <span>Parsed Answers</span>
            <strong>{parsedPairs.length}</strong>
          </div>
          <div className="simplified-status-card">
            <span>Key Review</span>
            <strong>{reviewStatus === 'blocked' ? 'Blocked' : reviewStatus === 'review' ? 'Required' : 'Pending'}</strong>
          </div>
          <div className="simplified-status-card">
            <span>Solution Asset</span>
            <strong>{solutionAssetName || 'Not uploaded'}</strong>
          </div>
        </div>
        {errorMessage && <p className="simplified-error-banner">{errorMessage}</p>}
      </section>
    </div>
  );
};

export default AISimplifiedAutomation;
