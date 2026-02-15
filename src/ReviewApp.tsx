/* eslint-disable no-alert, no-restricted-globals, security/detect-object-injection, @typescript-eslint/no-unused-vars, @typescript-eslint/no-explicit-any, import/no-anonymous-default-export */
import { useEffect, useRef, useState } from 'react'
import './ReviewApp.css'
import { getExpressBase, getPythonBase } from './utils/apiBase'

interface Option {
  letter: string
  text: string
  is_correct: boolean
  image_url?: string
  image_urls?: string[]
  imageKey?: string
  image_key?: string
}

interface Question {
  question_id: string
  questionNumber?: number | string
  questionText: string
  options: Option[]
  difficulty_type: string
  difficulty_level: number | null
  verification_state: string
  source_page: number
  questionType?: string
  question_type?: string
  image_url?: string
  image_urls?: string[]
  explanation?: string
  explanation_image?: string
  explanation_images?: string[]
  correct_option_letters?: string | null
  subject_name?: string
  chapter_name?: string
  topic_name?: string
  exam_type?: string
  published_year?: number | string | null
  question_fact?: string
}

interface Draft {
  batch_id: string
  questions: Question[]
  image_assets: Record<string, { filename: string; source_page?: number; bbox?: number[]; type?: string }>
  total_questions?: number
  page?: number
  limit?: number
  page_count?: number
}

interface BatchSummary {
  batch_id: string
  job_id?: string
  status: string
  total_questions?: number
  total_pages?: number
  pages_done?: number
  progress?: number
  stage_timings_seconds?: Record<string, number> | null
  created_at?: string
  updated_at?: string
  uploaded_by?: string
  upload_subject?: string
  upload_chapter?: string
  upload_topic?: string
  file_name?: string
}

interface ValidationResult {
  valid?: number
  failed?: number
  skipped_not_verified?: number
  inserted?: number
  status?: string
  validCount: number
  failedCount: number
  skippedCount: number
  errors: { index: number; message: string }[]
  insertedCount?: number
}

interface CommittedQuestion {
  id?: number
  question_id?: string
  question_text?: string
  subject_name?: string
  chapter_name?: string
  topic_name?: string
  exam_type?: string
  published_year?: number | string | null
  question_fact?: string
  batch_tag?: string
  difficulty_level?: number
  difficulty_type?: string
  question_type?: string
  question_image_key?: string
  explanation_image_key?: string
  explanation_text?: string
  options?: Option[] | string
}

const API_URL = getPythonBase()
const EXPRESS_URL = getExpressBase()

type ReviewAppProps = {
  bootToken?: string
  bootUser?: string
  showTitle?: boolean
  onLogout?: () => void
}

type BulkPreset = {
  name: string
  subject: string
  chapter: string
  topic: string
  examType: string
  publishedYear: string
  questionFact: string
  tag: string
}

const BULK_META_KEY = 'dq_bulk_meta_v1'
const BULK_PRESETS_KEY = 'dq_bulk_presets_v1'

function ReviewApp({ bootToken, bootUser, showTitle = true, onLogout }: ReviewAppProps) {
  const [batches, setBatches] = useState<BatchSummary[]>([])
  const [currentBatch, setCurrentBatch] = useState<string | null>(null)
  const [draft, setDraft] = useState<Draft | null>(null)
  const [filter, setFilter] = useState<string>('all')
  const [filterExamType, setFilterExamType] = useState('')
  const [filterMissingAssets, setFilterMissingAssets] = useState(false)
  const [nowTs, setNowTs] = useState(Date.now())
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState('')
  const [expressUrl, setExpressUrl] = useState(getExpressBase())
  const [difficultyTypes, setDifficultyTypes] = useState<string[]>([])
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null)
  const [showValidation, setShowValidation] = useState(false)
  const [lastValidationQuestions, setLastValidationQuestions] = useState<Question[]>([])
  const [validationFilter, setValidationFilter] = useState<'all' | 'failed' | 'valid'>('all')
  const [validationFailedIds, setValidationFailedIds] = useState<Set<string>>(new Set())
  const [validationValidIds, setValidationValidIds] = useState<Set<string>>(new Set())
  const [validationErrors, setValidationErrors] = useState<any[]>([])
  const [committed, setCommitted] = useState<CommittedQuestion[]>([])
  const [committedBatch, setCommittedBatch] = useState('')
  const [committedFilterExam, setCommittedFilterExam] = useState('')
  const [committedFilterTag, setCommittedFilterTag] = useState('')
  const [viewMode, setViewMode] = useState<'review' | 'committed'>('review')
  const [committedEditId, setCommittedEditId] = useState<number | null>(null)
  const [committedEdit, setCommittedEdit] = useState<CommittedQuestion | null>(null)
  const [committedError, setCommittedError] = useState('')
  const [bulkSubject, setBulkSubject] = useState('')
  const [bulkChapter, setBulkChapter] = useState('')
  const [bulkTopic, setBulkTopic] = useState('')
  const [bulkExamType, setBulkExamType] = useState('')
  const [bulkPublishedYear, setBulkPublishedYear] = useState('')
  const [bulkQuestionFact, setBulkQuestionFact] = useState('')
  const [bulkTag, setBulkTag] = useState('')
  const [bulkRangeStart, setBulkRangeStart] = useState('')
  const [bulkRangeEnd, setBulkRangeEnd] = useState('')
  const [bulkPageStart, setBulkPageStart] = useState('')
  const [bulkPageEnd, setBulkPageEnd] = useState('')
  const [bulkBusy, setBulkBusy] = useState(false)
  const [bulkPresetName, setBulkPresetName] = useState('')
  const [bulkPresets, setBulkPresets] = useState<BulkPreset[]>([])
  const [committedBulkSubject, setCommittedBulkSubject] = useState('')
  const [committedBulkChapter, setCommittedBulkChapter] = useState('')
  const [committedBulkTopic, setCommittedBulkTopic] = useState('')
  const [committedBulkBusy, setCommittedBulkBusy] = useState(false)
  const [bulkAnswerKey, setBulkAnswerKey] = useState('')
  const [bulkLevel, setBulkLevel] = useState('')
  const [bulkDifficultyType, setBulkDifficultyType] = useState('')
  const [bulkQuestionType, setBulkQuestionType] = useState('single_correct')
  const [bulkAnswerPage, setBulkAnswerPage] = useState('')
  const [answerKeyPairs, setAnswerKeyPairs] = useState<{ number: number; answer: string }[]>([])
  const [answerKeyStatus, setAnswerKeyStatus] = useState('')
  const [answerKeyDetected, setAnswerKeyDetected] = useState<{ count: number; min: number | null; max: number | null }>({ count: 0, min: null, max: null })
  const [answerKeyMaxPages, setAnswerKeyMaxPages] = useState('20')
  const [answerKeyMaxQ, setAnswerKeyMaxQ] = useState('1200')
  const [answerKeyMinQ, setAnswerKeyMinQ] = useState('1')
  const [answerKeyStartPage, setAnswerKeyStartPage] = useState('1')
  const [answerKeyOcrDpi, setAnswerKeyOcrDpi] = useState('300')
  const [uiError, setUiError] = useState('')
  const [uiNotice, setUiNotice] = useState('')
  const [actionStatus, setActionStatus] = useState<{ state: 'idle' | 'working' | 'success' | 'error', message: string }>({ state: 'idle', message: '' })
  const [actionSticky, setActionSticky] = useState(false)
  const [autoMarkDuplicates, setAutoMarkDuplicates] = useState(true)
  const [tourOpen, setTourOpen] = useState(false)
  const [tourStep, setTourStep] = useState(0)
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(200)
  const [sourcePage, setSourcePage] = useState<number | null>(null)
  const [allQuestions, setAllQuestions] = useState<Question[] | null>(null)
  const [allLoading, setAllLoading] = useState(false)
  const refreshTimer = useRef<number | null>(null)
  const autoRefreshTimer = useRef<number | null>(null)
  const userSetPageRef = useRef(false)
  const lastAutoPageRef = useRef<number | null>(null)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [startingBatchId, setStartingBatchId] = useState<string | null>(null)
  const questionsAnchorRef = useRef<HTMLDivElement | null>(null)
  const prevQuestionsCountRef = useRef(0)
  const autoLoadAllRef = useRef(false)

  // Auth state
  const [token, setToken] = useState(localStorage.getItem('token') || '')
  const [username, setUsername] = useState(localStorage.getItem('username') || '')
  const [isLoggedIn, setIsLoggedIn] = useState(!!(token || username))

  useEffect(() => {
    if (bootToken) {
      localStorage.setItem('token', bootToken)
      setToken(bootToken)
    }
    if (bootUser) {
      localStorage.setItem('username', bootUser)
      setUsername(bootUser)
    }
    if (bootToken || bootUser) {
      setIsLoggedIn(true)
    }
  }, [bootToken, bootUser])

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const tokenParam = params.get('token')
    const userParam = params.get('username') || params.get('user')
    if (tokenParam) {
      localStorage.setItem('token', tokenParam)
      setToken(tokenParam)
      if (userParam) {
        localStorage.setItem('username', userParam)
        setUsername(userParam)
      }
      setIsLoggedIn(true)
      const cleanUrl = `${window.location.origin}${window.location.pathname}`
      window.history.replaceState({}, '', cleanUrl)
    }
  }, [])

  useEffect(() => {
    const storedToken = localStorage.getItem('token') || ''
    const storedUser = localStorage.getItem('username') || ''
    if (storedToken && storedToken !== token) setToken(storedToken)
    if (storedUser && storedUser !== username) setUsername(storedUser)
    setIsLoggedIn(Boolean(storedToken || storedUser))
  }, [])

  useEffect(() => {
    try {
      const raw = localStorage.getItem(BULK_META_KEY)
      if (raw) {
        const parsed = JSON.parse(raw)
        if (typeof parsed?.subject === 'string') setBulkSubject(parsed.subject)
        if (typeof parsed?.chapter === 'string') setBulkChapter(parsed.chapter)
        if (typeof parsed?.topic === 'string') setBulkTopic(parsed.topic)
        if (typeof parsed?.examType === 'string') setBulkExamType(parsed.examType)
        if (typeof parsed?.publishedYear === 'string') setBulkPublishedYear(parsed.publishedYear)
        if (typeof parsed?.questionFact === 'string') setBulkQuestionFact(parsed.questionFact)
        if (typeof parsed?.tag === 'string') setBulkTag(parsed.tag)
      }
      const presetsRaw = localStorage.getItem(BULK_PRESETS_KEY)
      if (presetsRaw) {
        const parsedPresets = JSON.parse(presetsRaw)
        if (Array.isArray(parsedPresets)) {
          setBulkPresets(parsedPresets)
        }
      }
    } catch {
      // ignore storage errors
    }
  }, [])

  useEffect(() => {
    const payload = {
      subject: bulkSubject,
      chapter: bulkChapter,
      topic: bulkTopic,
      examType: bulkExamType,
      publishedYear: bulkPublishedYear,
      questionFact: bulkQuestionFact,
      tag: bulkTag
    }
    try {
      localStorage.setItem(BULK_META_KEY, JSON.stringify(payload))
    } catch {
      // ignore storage errors
    }
  }, [bulkSubject, bulkChapter, bulkTopic, bulkExamType, bulkPublishedYear, bulkQuestionFact, bulkTag])

  useEffect(() => {
    if (!allQuestions) return
    if (answerKeyMaxQ && answerKeyMaxQ !== '1200') return
    let maxNum = 0
    for (const q of allQuestions) {
      const num = Number((q as any).questionNumber || (q as any).question_number)
      if (Number.isFinite(num) && num > maxNum) maxNum = num
    }
    if (maxNum > 0) setAnswerKeyMaxQ(String(maxNum))
  }, [allQuestions, answerKeyMaxQ])

  useEffect(() => {
    const timer = window.setInterval(() => setNowTs(Date.now()), 1000)
    return () => window.clearInterval(timer)
  }, [])

  useEffect(() => {
    const key = 'dq_review_tour_done'
    if (!localStorage.getItem(key)) {
      setTourOpen(true)
      setTourStep(0)
    }
  }, [])

  function authHeaders(): Record<string, string> {
    const value = token || localStorage.getItem('token') || ''
    return value ? { Authorization: `Bearer ${value}` } : {}
  }

  function apiFetch(input: RequestInfo | URL, init: RequestInit = {}) {
    const headers = init.headers ? { ...(init.headers as Record<string, string>) } : {}
    const value = token || localStorage.getItem('token') || ''
    if (value && !headers.Authorization) {
      headers.Authorization = `Bearer ${value}`
    }
    return fetch(input, { ...init, headers })
  }

  useEffect(() => {
    let canceled = false
    async function loadDifficultyTypes() {
      try {
        const res = await apiFetch(`${expressUrl}/difficulties`, { headers: authHeaders() })
        if (!res.ok) return
        const data = await res.json()
        const raw = Array.isArray(data) ? data : []
        const mapped = raw
          .map((item: any) => {
            if (typeof item === 'string') return item
            return (
              item?.difficulty_type ||
              item?.difficulty_name ||
              item?.name ||
              item?.label ||
              ''
            )
          })
          .map((v: string) => String(v || '').trim())
          .filter(Boolean)
        const unique = Array.from(new Set(mapped))
        if (!canceled) setDifficultyTypes(unique)
      } catch {
        // ignore errors
      }
    }
    if (expressUrl) loadDifficultyTypes()
    return () => {
      canceled = true
    }
  }, [expressUrl, token])

  function applyPreset(preset: BulkPreset) {
    setBulkSubject(preset.subject || '')
    setBulkChapter(preset.chapter || '')
    setBulkTopic(preset.topic || '')
    setBulkExamType(preset.examType || '')
    setBulkPublishedYear(preset.publishedYear || '')
    setBulkQuestionFact(preset.questionFact || '')
    setBulkTag(preset.tag || '')
    setUiNotice(`Applied preset: ${preset.name}`)
  }

  function savePreset() {
    const name = bulkPresetName.trim()
    if (!name) {
      alert('Enter a preset name.')
      return
    }
    const next: BulkPreset = {
      name,
      subject: bulkSubject.trim(),
      chapter: bulkChapter.trim(),
      topic: bulkTopic.trim(),
      examType: bulkExamType.trim(),
      publishedYear: bulkPublishedYear.trim(),
      questionFact: bulkQuestionFact.trim(),
      tag: bulkTag.trim()
    }
    const updated = [...bulkPresets.filter(p => p.name !== name), next]
    setBulkPresets(updated)
    setBulkPresetName('')
    try {
      localStorage.setItem(BULK_PRESETS_KEY, JSON.stringify(updated))
    } catch {
      // ignore storage errors
    }
  }

  function removePreset(name: string) {
    const updated = bulkPresets.filter(p => p.name !== name)
    setBulkPresets(updated)
    try {
      localStorage.setItem(BULK_PRESETS_KEY, JSON.stringify(updated))
    } catch {
      // ignore storage errors
    }
  }

  function handleLogout() {
    localStorage.removeItem('token')
    localStorage.removeItem('username')
    setToken('')
    setUsername('')
    setIsLoggedIn(false)
  }

  useEffect(() => {
    if (isLoggedIn && token) {
      loadBatches()
    }
  }, [isLoggedIn, token])

    useEffect(() => {
      setSelectedIds(new Set())
    }, [currentBatch])

    useEffect(() => {
      if (!currentBatch) return
      const hasDraft = draft && (draft as any).batch_id === currentBatch
      if (!hasDraft) {
        loadDraft(currentBatch, 1, pageSize)
          .catch(() => undefined)
      }
    }, [currentBatch, pageSize])

  useEffect(() => {
    const base = allQuestions || (draft?.questions || [])
    const pages = Array.from(
      new Set(base.map(q => q.source_page).filter(n => Number.isFinite(n)))
    ).sort((a, b) => a - b)
    if (!pages.length) {
      setSourcePage(null)
      lastAutoPageRef.current = null
      return
    }
    const latest = pages[pages.length - 1]
    if (sourcePage === null || !pages.includes(sourcePage)) {
      setSourcePage(latest)
      lastAutoPageRef.current = latest
      return
    }
    if (!userSetPageRef.current && sourcePage !== latest) {
      setSourcePage(latest)
      lastAutoPageRef.current = latest
    }
  }, [allQuestions, draft?.questions, sourcePage])

  useEffect(() => {
    if (autoRefreshTimer.current) {
      window.clearInterval(autoRefreshTimer.current)
      autoRefreshTimer.current = null
    }
    if (!currentBatch) return
    const batch = batches.find(b => b.batch_id === currentBatch)
    if (!batch || (batch.status !== 'running' && batch.status !== 'queued')) return
    autoRefreshTimer.current = window.setInterval(() => {
      loadDraft(currentBatch, currentPage, pageSize)
    }, 5000)
    return () => {
      if (autoRefreshTimer.current) {
        window.clearInterval(autoRefreshTimer.current)
        autoRefreshTimer.current = null
      }
    }
  }, [currentBatch, batches, currentPage, pageSize])

  async function loadBatches() {
    const res = await apiFetch(`${API_URL}/draft/drafts`, { headers: authHeaders() })
    if (!res.ok) return
    const data = await res.json()
    setBatches(Array.isArray(data) ? data : [])
  }

  function formatBatchMeta(batch: BatchSummary) {
    const total = batch.total_questions ?? '?'
    const progress = typeof batch.progress === 'number' ? `${batch.progress}%` : null
    const pages = batch.total_pages ? `${batch.pages_done ?? 0}/${batch.total_pages} pages` : null
    const status = batch.status || 'queued'
    const created = batch.created_at ? new Date(batch.created_at).toLocaleString() : null
    const topic = batch.upload_topic || batch.upload_chapter || batch.upload_subject
    const by = batch.uploaded_by ? `by ${batch.uploaded_by}` : null
    const file = batch.file_name ? `file: ${batch.file_name}` : null
    const parts = [file, total ? `${total} questions` : null, status, topic, by, created]
    if (progress) parts.push(progress)
    if (pages) parts.push(pages)
    if (batch.status === 'running' || batch.status === 'queued') {
      const startTs = batch.updated_at || batch.created_at
      const elapsed = formatElapsed(startTs)
      if (elapsed) parts.push(`Running ${elapsed}`)
      const ist = formatIstTime(startTs)
      if (ist) parts.push(`IST ${ist}`)
      const t = parseTimestamp(startTs)
      if (t) {
        const elapsedSec = Math.max(0, Math.floor((nowTs - t) / 1000))
        const eta = formatEta(elapsedSec, batch.pages_done, batch.total_pages)
        if (eta) parts.push(`ETA ${eta}`)
      }
    }
    if (batch.status === 'done') {
      const startTs = batch.created_at
      const endTs = batch.updated_at
      if (startTs && endTs) {
        const start = parseTimestamp(startTs)
        const end = parseTimestamp(endTs)
        if (start && end) {
          const totalSec = Math.max(0, Math.floor((end - start) / 1000))
          const total = formatDuration(totalSec)
          if (total) parts.push(`Total ${total}`)
        }
      }
      const endIst = formatIstTime(batch.updated_at || batch.created_at)
      if (endIst) parts.push(`IST ${endIst}`)
    }
    return parts.filter(Boolean).join(' - ')
  }

  function formatStageTimings(timings?: Record<string, number> | null) {
    if (!timings) return ''
    const entries = Object.entries(timings).filter(([, v]) => typeof v === 'number' && v > 0)
    if (!entries.length) return ''
    const parts = entries
      .sort((a, b) => b[1] - a[1])
      .map(([k, v]) => `${k}:${Math.round(v)}s`)
    return parts.join(' · ')
  }

  function isPausedStatus(status?: string) {
    return String(status || '').toLowerCase().startsWith('paused')
  }

  async function pollJobAndLoad(batch: BatchSummary) {
    if (!batch.job_id) {
      setUiNotice(`Batch ${batch.batch_id} is queued. Please wait for processing to start.`)
      return
    }
    setUiNotice(`Processing batch ${batch.batch_id}...`)
    while (true) {
      const pollRes = await apiFetch(`${API_URL}/draft/jobs/${batch.job_id}`, { headers: authHeaders() })
      if (!pollRes.ok) {
        setUiError('Failed to fetch job status.')
        return
      }
      const job = await pollRes.json()
      setBatches(prev =>
        prev.map(b =>
          b.batch_id === batch.batch_id
            ? {
                ...b,
                status: job.status,
                total_pages: job.total_pages,
                total_questions: job.total_questions,
                pages_done: job.pages_done,
                progress: job.progress,
                job_id: job.job_id,
                stage_timings_seconds: job.stage_timings_seconds ?? b.stage_timings_seconds
              }
            : b
        )
      )
      if (job.status === 'done') {
        setUiNotice('')
        await loadDraft(batch.batch_id, 1, pageSize)
        await loadAllQuestions(batch.batch_id)
        return
      }
      if (isPausedStatus(job.status)) {
        setUiNotice(`Batch ${batch.batch_id} paused. Click Resume to continue.`)
        setUiError('')
        return
      }
      if (job.status === 'error') {
        setUiError(`Batch ${batch.batch_id} failed: ${job.error || 'Unknown error'}`)
        return
      }
      await new Promise(r => setTimeout(r, 2000))
    }
  }

  async function loadDraft(batchId: string, page = currentPage, limit = pageSize) {
    const safeLimit = Math.min(200, Math.max(1, limit))
    const res = await apiFetch(`${API_URL}/draft/${batchId}?page=${page}&limit=${safeLimit}`, { headers: authHeaders() })
    if (res.ok) {
      const data = await res.json()
      setDraft(data)
      if (batchId !== currentBatch) {
        setValidationFilter('all')
        setValidationFailedIds(new Set())
        setValidationValidIds(new Set())
        setValidationErrors([])
        setShowValidation(false)
      }
      setCurrentBatch(batchId)
      setCurrentPage(data.page || page)
      if ((answerKeyMaxQ === '1200' || !answerKeyMaxQ) && data.total_questions) {
        setAnswerKeyMaxQ(String(data.total_questions))
      }
    }
  }

  async function uploadFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    setUploading(true)
    setUploadProgress('Uploading...')

    const formData = new FormData()
    formData.append('file', file)
    if (username) formData.append('uploaded_by', username)
    if (bulkSubject) formData.append('upload_subject', bulkSubject)
    if (bulkChapter) formData.append('upload_chapter', bulkChapter)
    if (bulkTopic) formData.append('upload_topic', bulkTopic)

    const res = await apiFetch(`${API_URL}/draft/upload`, {
      method: 'POST',
      headers: authHeaders(),
      body: formData
    })
    if (!res.ok) {
      const msg = await res.text()
      setUploadProgress(msg || 'Upload failed')
      setUploading(false)
      return
    }
      const data = await res.json()
      const jobId = data.job_id
      const batchId = data.batch_id
      if (!jobId || !batchId) {
        setUploadProgress('Upload failed: missing job id')
        setUploading(false)
        return
      }
      setCurrentBatch(batchId)
      await loadBatches()
      try {
        await dispatchBatch({ ...data, job_id: jobId, batch_id: batchId, status: 'queued' })
      } catch {
        // if dispatch fails, the Start button is still available
      }

    let lastProgress = -1
    while (true) {
      const pollRes = await apiFetch(`${API_URL}/draft/jobs/${jobId}`, { headers: authHeaders() })
      const job = await pollRes.json()
      setUploadProgress(`Processing... ${job.progress || 0}%`)
      setBatches(prev =>
        prev.map(b =>
          b.batch_id === batchId
            ? {
                ...b,
                status: job.status,
                total_pages: job.total_pages,
                total_questions: job.total_questions,
                pages_done: job.pages_done,
                progress: job.progress,
                stage_timings_seconds: job.stage_timings_seconds ?? b.stage_timings_seconds
              }
            : b
        )
      )

      if (job.progress !== lastProgress) {
        lastProgress = job.progress
        try {
          await loadDraft(batchId)
        } catch {
          // ignore
        }
      }

      if (job.status === 'done') {
        setUploadProgress('')
        setUploading(false)
        await loadBatches()
        setCurrentPage(1)
        await loadDraft(batchId, 1, pageSize)
        await loadAllQuestions(batchId)
        break
      }
      if (isPausedStatus(job.status)) {
        setUploadProgress(`Paused: ${job.error || 'Worker offline'}`)
        setUploading(false)
        await loadBatches()
        break
      }
      if (job.status === 'error') {
        setUploadProgress(`Error: ${job.error}`)
        setUploading(false)
        break
      }
      await new Promise(r => setTimeout(r, 2000))
    }
  }

  async function verifyQuestion(qid: string, refresh = true) {
    console.info('[verify] start', { qid, batch: currentBatch })
    const res = await apiFetch(`${API_URL}/draft/${currentBatch}/verify/${qid}`, {
      method: 'POST',
      headers: authHeaders()
    })
    console.info('[verify] response', { qid, status: res.status })
    updateLocalQuestion(qid, { verification_state: 'verified' } as any)
    if (refresh) {
      scheduleDraftRefresh(currentBatch!)
    }
  }

  async function verifyBulk(mode: 'all' | 'selected' | 'range' = 'all') {
    if (!draft?.questions || !currentBatch) return
    const targets =
      mode === 'selected' ? getQuestionsForSelected() :
      mode === 'range' ? await getQuestionsForRange() :
      await ensureAllQuestions()
    if (!targets.length) {
      alert('No questions to verify')
      return
    }
    console.info('[verify-bulk] start', { mode, count: targets.length, batch: currentBatch })
    setActionStatus({ state: 'working', message: 'Verifying...' })
    const body: any = { patch: { verification_state: 'verified' }, mode }
    if (mode === 'selected' || mode === 'range') {
      body.mode = 'selected'
      body.ids = targets.map(t => t.question_id)
    }
    await bulkUpdateRequest(body)
    scheduleDraftRefresh(currentBatch)
    await refreshAllIfLoaded()
    setActionStatus({ state: 'success', message: `Verified ${targets.length} question(s).` })
    console.info('[verify-bulk] done', { mode, count: targets.length, batch: currentBatch })
  }

  async function deleteBatch(batchId: string) {
    if (!batchId) return
    const ok = window.confirm(`Delete batch ${batchId}? This will remove the draft and job.`)
    if (!ok) return
    try {
      const res = await apiFetch(`${API_URL}/draft/${batchId}`, {
        method: 'DELETE',
        headers: authHeaders()
      })
      if (!res.ok) {
        const msg = await res.text()
        setUiError(msg || 'Failed to delete batch')
        return
      }
      setBatches(prev => prev.filter(b => b.batch_id !== batchId))
      if (currentBatch === batchId) {
        setCurrentBatch(null)
        setDraft(null)
        setAllQuestions(null)
      }
      setUiNotice(`Deleted batch ${batchId}`)
      setUiError('')
    } catch (err: any) {
      setUiError(err?.message || 'Failed to delete batch')
    }
  }

  async function deleteDraftQuestion(questionId: string) {
    if (!currentBatch || !questionId) return
    const ok = window.confirm(`Delete question ${questionId}? This cannot be undone.`)
    if (!ok) return
    try {
      const res = await apiFetch(`${API_URL}/draft/${currentBatch}/question/${questionId}`, {
        method: 'DELETE',
        headers: authHeaders()
      })
      if (!res.ok) {
        const msg = await res.text()
        setUiError(msg || 'Failed to delete question')
        return
      }
      setDraft(prev => {
        if (!prev) return prev
        const nextQuestions = (prev.questions || []).filter(q => q.question_id !== questionId)
        const nextTotal = typeof prev.total_questions === 'number' ? Math.max(0, prev.total_questions - 1) : prev.total_questions
        return { ...prev, questions: nextQuestions, total_questions: nextTotal }
      })
      setAllQuestions(prev => (prev ? prev.filter(q => q.question_id !== questionId) : prev))
      setSelectedIds(prev => {
        const next = new Set(prev)
        next.delete(questionId)
        return next
      })
      setBatches(prev =>
        prev.map(b =>
          b.batch_id === currentBatch
            ? {
                ...b,
                total_questions: typeof b.total_questions === 'number' ? Math.max(0, b.total_questions - 1) : b.total_questions
              }
            : b
        )
      )
      setUiNotice('Question deleted.')
      setUiError('')
    } catch (err: any) {
      setUiError(err?.message || 'Failed to delete question')
    }
  }

  async function dispatchBatch(batch: BatchSummary) {
    if (!batch.job_id) {
      setUiError('Cannot start: missing job_id')
      return
    }
    try {
      setUiNotice(`${isPausedStatus(batch.status) ? 'Resuming' : 'Starting'} batch ${batch.batch_id}...`)
      const res = await apiFetch(`${API_URL}/draft/jobs/${batch.job_id}/dispatch`, {
        method: 'POST',
        headers: authHeaders()
      })
      if (!res.ok) {
        const msg = await res.text()
        setUiError(msg || 'Failed to start batch')
        setUiNotice('')
        return
      }
      setUiError('')
      await loadBatches()
      setUiNotice(`Batch ${batch.batch_id} dispatched. Waiting for worker...`)
      pollJobAndLoad({ ...batch, job_id: batch.job_id })
    } catch (err: any) {
      setUiError(err?.message || 'Failed to start batch')
      setUiNotice('')
    }
  }

    async function rejectQuestion(qid: string) {
      if (!currentBatch) return
      const reason = window.prompt('Why are you rejecting this question? (required)')?.trim()
      if (!reason) {
        alert('Reject reason is required.')
        return
      }
      const ok = await updateQuestion(qid, { verification_state: 'rejected', reject_reason: reason } as any, false)
      if (ok) {
        updateLocalQuestion(qid, { verification_state: 'rejected', reject_reason: reason } as any)
        scheduleDraftRefresh(currentBatch)
        setUiNotice('Question rejected with reason.')
      }
    }

  function scheduleDraftRefresh(batchId: string) {
    if (refreshTimer.current) {
      window.clearTimeout(refreshTimer.current)
    }
    refreshTimer.current = window.setTimeout(() => {
      loadDraft(batchId)
    }, 2500)
  }

  function updateLocalQuestion(qid: string, patch: Partial<Question>) {
    setDraft(prev => {
      if (!prev) return prev
      const nextQuestions = (prev.questions || []).map(q => {
        if (q.question_id !== qid) return q
        return { ...q, ...patch }
      })
      return { ...prev, questions: nextQuestions }
    })
    setAllQuestions(prev => {
      if (!prev) return prev
      return prev.map(q => {
        if (q.question_id !== qid) return q
        return { ...q, ...patch }
      })
    })
  }

  async function updateQuestion(qid: string, patch: Partial<Question>, refresh = true) {
    try {
      const res = await apiFetch(`${API_URL}/draft/${currentBatch}/question/${qid}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify({ patch })
      })
      if (!res.ok) {
        const msg = await res.text()
        setUiError(msg || 'Failed to update question')
        setUiNotice('')
        return false
      }
      updateLocalQuestion(qid, patch)
      if (refresh) {
        scheduleDraftRefresh(currentBatch!)
      }
      setUiError('')
      return true
    } catch (err: any) {
      setUiError(err?.message || 'Failed to update question')
      setUiNotice('')
      return false
    }
  }

  async function uploadAsset(file: File): Promise<string | null> {
    if (!currentBatch) return null
    const formData = new FormData()
    formData.append('file', file)
    const res = await apiFetch(`${API_URL}/draft/assets/${currentBatch}/upload`, {
      method: 'POST',
      headers: authHeaders(),
      body: formData
    })
    if (!res.ok) {
      alert('Image upload failed.')
      return null
    }
    const data = await res.json()
    return data.filename || null
  }

  async function uploadCommittedAsset(questionId: number, file: File): Promise<string | null> {
    const formData = new FormData()
    formData.append('file', file)
    const res = await apiFetch(`${API_URL}/draft/assets/committed/${questionId}/upload`, {
      method: 'POST',
      headers: authHeaders(),
      body: formData
    })
    if (!res.ok) {
      alert('Image upload failed.')
      return null
    }
    const data = await res.json()
    return data.key || null
  }

  function buildDefaultOptions(existing: Question[]): Option[] {
    const letters = (existing || []).flatMap(q => (q.options || []).map(o => String(o.letter)))
    const numeric = letters.length > 0 && letters.every(l => ['1', '2', '3', '4'].includes(l))
    if (numeric) {
      return [
        { letter: '1', text: '', is_correct: false },
        { letter: '2', text: '', is_correct: false },
        { letter: '3', text: '', is_correct: false },
        { letter: '4', text: '', is_correct: false }
      ]
    }
    return [
      { letter: 'A', text: '', is_correct: false },
      { letter: 'B', text: '', is_correct: false },
      { letter: 'C', text: '', is_correct: false },
      { letter: 'D', text: '', is_correct: false }
    ]
  }

  async function addQuestion() {
    if (!currentBatch) return
    const all = draft?.questions || []
    const newQuestionYear = Number(bulkPublishedYear.trim())
    const maxQ = all.reduce((acc, q) => {
      const raw = (q as any).questionNumber ?? (q as any).question_number
      const num = Number(raw)
      return Number.isFinite(num) && num > acc ? num : acc
    }, 0)
    const payload = {
      questionText: '',
      questionNumber: maxQ + 1,
      source_page: sourcePage || 1,
      options: buildDefaultOptions(all),
      questionType: 'single_correct',
      difficulty_type: null,
      difficulty_level: null,
      explanation: null,
      correct_option_letters: null,
      verification_state: 'edited',
      subject_name: (bulkSubject || '').trim(),
      chapter_name: (bulkChapter || '').trim(),
      topic_name: (bulkTopic || '').trim(),
      exam_type: (bulkExamType || '').trim(),
      published_year: bulkPublishedYear.trim() && Number.isFinite(newQuestionYear) ? Math.trunc(newQuestionYear) : null,
      question_fact: (bulkQuestionFact || '').trim()
    }
    const res = await apiFetch(`${API_URL}/draft/${currentBatch}/question`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify({ question: payload })
    })
    if (!res.ok) {
      const msg = await res.text()
      alert(msg || 'Failed to add question')
      return
    }
    await loadDraft(currentBatch, currentPage, pageSize)
    await loadAllQuestions(currentBatch)
  }

  async function toggleCorrect(qid: string, letter: string) {
    const q = draft?.questions.find(x => x.question_id === qid)
    if (!q) return
    const options = q.options.map(o => ({
      ...o,
      is_correct: o.letter === letter ? !o.is_correct : o.is_correct
    }))
    setDraft(prev => {
      if (!prev) return prev
      const nextQuestions = (prev.questions || []).map(item => {
        if (item.question_id !== qid) return item
        return { ...item, options }
      })
      return { ...prev, questions: nextQuestions }
    })
    updateQuestion(qid, { options } as any)
  }

  function assetUrl(name?: string) {
    if (!name) return ''
    if (name.startsWith('http') || name.startsWith('gs://')) return name
    const t = encodeURIComponent(token || '')
    return `${API_URL}/draft/assets/${currentBatch}/${name}?token=${t}`
  }

  function committedAssetUrl(key?: string) {
    if (!key) return ''
    if (key.startsWith('http') || key.startsWith('gs://')) return key
    if (!key.includes('/')) return ''
    const t = encodeURIComponent(token || '')
    return `${API_URL}/draft/assets/by-key?key=${encodeURIComponent(key)}&token=${t}`
  }

  function normalizeAssetKey(name?: string) {
    if (!name) return null
    if (name.startsWith('http') || name.startsWith('gs://') || name.includes('/')) return name
    if (!currentBatch) return name
    return `images/${currentBatch}/${name}`
  }

  function hasMissingAssets(q: Question) {
    const assets = draft?.image_assets || {}
    const candidates: string[] = []
    const pushAsset = (value?: string | string[]) => {
      if (!value) return
      const list = Array.isArray(value) ? value : [value]
      for (const item of list) {
        const raw = String(item || '').trim()
        if (!raw) continue
        if (raw.startsWith('http') || raw.startsWith('gs://')) continue
        const name = raw.includes('/') ? raw.split('/').pop() || raw : raw
        if (name) candidates.push(name)
      }
    }
    pushAsset(q.image_urls || q.image_url)
    pushAsset(q.explanation_images || q.explanation_image)
    for (const opt of q.options || []) {
      pushAsset(opt.image_urls || opt.image_url)
    }
    if (candidates.length === 0) return false
    return candidates.some(name => !assets[name])
  }

  function toImageList(value?: string | string[]) {
    if (Array.isArray(value)) return value.filter(Boolean)
    if (typeof value === 'string' && value) return [value]
    return []
  }

  function firstImage(value?: string | string[], fallback?: string) {
    const list = toImageList(value)
    if (list.length > 0) return list[0]
    return fallback
  }

  function normalizeOptionsForPayload(q: Question): Option[] {
    const options = q.options || []
    if (options.some(o => o.is_correct)) {
      return options
    }
    const rawLetters = Array.isArray(q.correct_option_letters)
      ? q.correct_option_letters.map(item => String(item)).join(',')
      : (q.correct_option_letters ? String(q.correct_option_letters) : '')
    const correctLetters = (typeof rawLetters === 'string' ? rawLetters : '')
      .split(',')
      .map(l => l.trim().toUpperCase())
      .filter(Boolean)
    if (!correctLetters.length) return options
    const optionLetters = options.map(o => String(o.letter).toUpperCase())
    const numericOptions = optionLetters.length > 0 && optionLetters.every(l => ['1', '2', '3', '4'].includes(l))
    const correctSet = new Set<string>(correctLetters)
    if (numericOptions) {
      const mapToNum: Record<string, string> = { A: '1', B: '2', C: '3', D: '4' }
      for (const c of correctLetters) {
        const mapped = mapToNum[c]
        if (mapped) correctSet.add(mapped)
      }
    }
    return options.map(o => ({
      ...o,
      is_correct: correctSet.has(String(o.letter).toUpperCase())
    }))
  }

  function buildBulkPayload(questions: Question[]) {
    const batchId = currentBatch || undefined
    return questions
      .filter(q => q.verification_state === 'verified')
      .map(q => ({
        verification_state: 'verified',
        batchId,
        subjectName: ((q as any).subject_name || '')?.trim().toLowerCase(),
        chapterName: ((q as any).chapter_name || '')?.trim().toLowerCase(),
        topicName: ((q as any).topic_name || '')?.trim().toLowerCase(),
        examType: (q.exam_type || bulkExamType).trim().toLowerCase(),
        publishedYear: (q as any).published_year ?? null,
        questionFact: ((q as any).question_fact || '').trim(),
        batchTag: bulkTag.trim(),
        difficultyLevel: q.difficulty_level,
        difficultyType: (q.difficulty_type || '')?.trim().toLowerCase() === 'unknown' ? null : (q.difficulty_type || '')?.trim().toLowerCase(),
        questionType: ((q as any).questionType || (q as any).question_type || 'single_correct')?.trim().toLowerCase(),
        questionText: q.questionText,
        questionImageKey: normalizeAssetKey(firstImage(q.image_urls, q.image_url)),
        questionImageKeys: toImageList(q.image_urls || q.image_url)
          .map(name => normalizeAssetKey(name))
          .filter(Boolean),
        explanationText: q.explanation || null,
        explanationImageKey: normalizeAssetKey(firstImage(q.explanation_images, q.explanation_image)),
        explanationImageKeys: toImageList(q.explanation_images || q.explanation_image)
          .map(name => normalizeAssetKey(name))
          .filter(Boolean),
        options: normalizeOptionsForPayload(q)
          .filter(o => o.text)
          .map(o => ({
            letter: o.letter,
            text: o.text || '',
            isCorrect: o.is_correct,
            imageKey: normalizeAssetKey(firstImage(o.image_urls, o.image_url)),
            imageKeys: toImageList(o.image_urls || o.image_url)
              .map(name => normalizeAssetKey(name))
              .filter(Boolean)
          }))
      }))
  }

  function startEditCommitted(q: CommittedQuestion) {
    if (!q.id) return
    setCommittedEditId(q.id)
    setCommittedEdit({ ...q })
    setCommittedError('')
  }

  function cancelEditCommitted() {
    setCommittedEditId(null)
    setCommittedEdit(null)
    setCommittedError('')
  }

  async function saveCommittedEdit() {
    if (!committedEditId || !committedEdit) return
    try {
      const payload = {
        question_text: committedEdit.question_text || '',
        subject_name: committedEdit.subject_name || '',
        chapter_name: committedEdit.chapter_name || '',
        topic_name: committedEdit.topic_name || '',
        difficulty_type: committedEdit.difficulty_type || '',
        difficulty_level: committedEdit.difficulty_level || null,
        question_type: committedEdit.question_type || 'single_correct',
        options: committedEdit.options || [],
        explanation_text: committedEdit.explanation_text || ''
      }
      const res = await fetch(`${expressUrl}/api/questions/${committedEditId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify(payload)
      })
      if (!res.ok) {
        const msg = await res.text()
        setCommittedError(msg || 'Failed to update question')
        return
      }
      const data = await res.json()
      setCommitted(committed.map(q => (q.id === committedEditId ? data.question : q)))
      cancelEditCommitted()
    } catch (err: any) {
      setCommittedError(err?.message || 'Failed to update question')
    }
  }

  async function verifyAllValid() {
    if (!draft?.questions || !currentBatch) return
    const validQuestions = draft.questions.filter(q =>
      q.verification_state !== 'verified' &&
      q.verification_state !== 'rejected' &&
      q.options.some(o => o.is_correct) &&
      q.difficulty_level &&
      q.difficulty_type
    )

    if (validQuestions.length === 0) {
      alert('No valid questions to verify.')
      return
    }

    if (!confirm(`Verify ${validQuestions.length} valid questions?`)) return

    for (const q of validQuestions) {
      await verifyQuestion(q.question_id, false)
    }
    await loadDraft(currentBatch)
    alert(`Verified ${validQuestions.length} questions.`)
  }

  async function applyBulkMetadata(mode: 'all' | 'missing' | 'range') {
    if (!draft?.questions || !currentBatch) return
    const subject = bulkSubject.trim()
    const chapter = bulkChapter.trim()
    const topic = bulkTopic.trim()
    const examType = bulkExamType.trim()
    const questionFact = bulkQuestionFact.trim()
    const publishedYearRaw = bulkPublishedYear.trim()
    const hasPublishedYear = publishedYearRaw.length > 0
    const publishedYear = Number(publishedYearRaw)

    if (hasPublishedYear && (!Number.isFinite(publishedYear) || publishedYear < 1900 || publishedYear > 2100)) {
      alert('Enter a valid publication year (1900-2100).')
      return
    }

    if (!subject && !chapter && !topic && !examType && !questionFact && !hasPublishedYear) {
      alert('Enter metadata fields to apply.')
      return
    }

    const start = Number(bulkRangeStart)
    const end = Number(bulkRangeEnd)
    const hasRange = Number.isFinite(start) && Number.isFinite(end) && start > 0 && end >= start
    const patch: any = {}
    if (subject) patch.subject_name = subject
    if (chapter) patch.chapter_name = chapter
    if (topic) patch.topic_name = topic
    if (examType) patch.exam_type = examType
    if (questionFact) patch.question_fact = questionFact
    if (hasPublishedYear && Number.isFinite(publishedYear)) patch.published_year = Math.trunc(publishedYear)

    setBulkBusy(true)
    const body: any = { mode, patch }
    if (mode === 'range') {
      if (!hasRange) {
        setBulkBusy(false)
        alert('Enter a valid range')
        return
      }
      body.range_start = start
      body.range_end = end
    }
    const result = await bulkUpdateRequest(body)
    setBulkBusy(false)
    await loadDraft(currentBatch)
    await refreshAllIfLoaded()
    if (result?.updated !== undefined) {
      setUiNotice(`Updated ${result.updated} question(s).`)
    }
  }

  async function applyBulkMetadataByPageRange() {
    if (!draft?.questions || !currentBatch) return
    const subject = bulkSubject.trim()
    const chapter = bulkChapter.trim()
    const topic = bulkTopic.trim()
    const examType = bulkExamType.trim()
    const questionFact = bulkQuestionFact.trim()
    const publishedYearRaw = bulkPublishedYear.trim()
    const hasPublishedYear = publishedYearRaw.length > 0
    const publishedYear = Number(publishedYearRaw)
    if (hasPublishedYear && (!Number.isFinite(publishedYear) || publishedYear < 1900 || publishedYear > 2100)) {
      alert('Enter a valid publication year (1900-2100).')
      return
    }
    if (!subject && !chapter && !topic && !examType && !questionFact && !hasPublishedYear) {
      alert('Enter metadata fields to apply.')
      return
    }

    const start = Number(bulkPageStart)
    const end = Number(bulkPageEnd)
    const hasRange = Number.isFinite(start) && Number.isFinite(end) && start > 0 && end >= start
    if (!hasRange) {
      alert('Enter a valid source page range')
      return
    }

    const patch: any = {}
    if (subject) patch.subject_name = subject
    if (chapter) patch.chapter_name = chapter
    if (topic) patch.topic_name = topic
    if (examType) patch.exam_type = examType
    if (questionFact) patch.question_fact = questionFact
    if (hasPublishedYear && Number.isFinite(publishedYear)) patch.published_year = Math.trunc(publishedYear)

    const targets = (draft.questions || []).filter(q => {
      const sp = Number(q.source_page || 0)
      return Number.isFinite(sp) && sp >= start && sp <= end
    })
    if (!targets.length) {
      alert('No questions found in this source page range.')
      return
    }

    setBulkBusy(true)
    let updated = 0
    for (const q of targets) {
      const ok = await updateQuestion(q.question_id, patch, false)
      if (ok) updated += 1
    }
    setBulkBusy(false)
    await loadDraft(currentBatch)
    await refreshAllIfLoaded()
    setUiNotice(`Updated ${updated} question(s) for source pages ${start}-${end}.`)
  }

  function parseAnswerKey(text: string): Record<number, string> {
    const out: Record<number, string> = {}
    const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean)

    const push = (num: number, ans: string) => {
      if (!Number.isFinite(num) || !ans) return
      if (out[num] !== undefined) return
      out[num] = ans.toUpperCase()
    }

    for (const line of lines) {
      const col = line.match(/^\s*([A-Da-d])\s*[:\-]?\s*(.+)$/)
      if (col) {
        const ans = col[1].toUpperCase()
        const nums = (col[2].match(/\d+/g) || []).map(n => Number(n)).filter(n => Number.isFinite(n))
        for (const n of nums) push(n, ans)
        continue
      }
      const tokens = line.match(/[A-Da-d]|\d{1,4}/g) || []
      if (tokens.length < 2) continue
      const types = tokens.map(t => (/[A-Da-d]/.test(t) ? 'L' : 'N'))
      if (types.every((t, i) => i === types.length - 1 || t !== types[i + 1])) {
        for (let i = 0; i < tokens.length - 1; i += 2) {
          if (types[i] === 'N' && types[i + 1] === 'L') {
            push(Number(tokens[i]), tokens[i + 1])
          }
        }
        continue
      }
      const firstL = types.indexOf('L')
      if (firstL > 0 && types.slice(0, firstL).every(t => t === 'N') && types.slice(firstL).every(t => t === 'L')) {
        const nums = tokens.slice(0, firstL).map(n => Number(n))
        const letters = tokens.slice(firstL)
        if (nums.length === letters.length) {
          nums.forEach((n, i) => push(n, letters[i]))
        }
      }
    }

    const cleaned = text.replace(/\n/g, ' ').trim()
    if (!cleaned) return out

    const letterRegex = /(\d+)\s*[\.\-:)\]]*\s*([A-Da-d])/g
    let match: RegExpExecArray | null
    while ((match = letterRegex.exec(cleaned)) !== null) {
      push(Number(match[1]), match[2])
    }

    if (Object.keys(out).length === 0) {
      const numericRegex = /(\d+)\s*[\.\-:)\]]+\s*([1-4])/g
      while ((match = numericRegex.exec(cleaned)) !== null) {
        const mapped = match[2] === '1' ? 'A' : match[2] === '2' ? 'B' : match[2] === '3' ? 'C' : 'D'
        push(Number(match[1]), mapped)
      }
    }
    return out
  }

  function applyAnswerToOptions(options: Option[], answer: string): Option[] {
    if (!options || options.length === 0) return options
    const letters = options.map(o => String(o.letter).toUpperCase())
    const numeric = letters.length > 0 && letters.every(l => ['1', '2', '3', '4'].includes(l))
    const parts = answer
      .split(',')
      .map(s => s.trim().toUpperCase())
      .filter(Boolean)
    const mapped = new Set<string>()
    const mapToNum: Record<string, string> = { A: '1', B: '2', C: '3', D: '4' }
    for (const p of parts) {
      mapped.add(p)
      if (numeric && mapToNum[p]) {
        mapped.add(mapToNum[p])
      }
    }
    return options.map(o => ({
      ...o,
      is_correct: mapped.has(String(o.letter).toUpperCase())
    }))
  }

  async function applyBulkAnswers(mode: 'all' | 'missing' | 'range') {
    if (!draft?.questions || !currentBatch) return
    const key = parseAnswerKey(bulkAnswerKey)
    const single = bulkAnswerKey.trim().toUpperCase()
    const singleMapped = single === '1' ? 'A' : single === '2' ? 'B' : single === '3' ? 'C' : single === '4' ? 'D' : single
    const hasSingle = ['A', 'B', 'C', 'D'].includes(singleMapped)
    if (!Object.keys(key).length && !hasSingle) {
      alert('Paste a valid answer key like: 1.A 2.B 3.C or a single letter like A')
      return
    }

    const start = Number(bulkRangeStart)
    const end = Number(bulkRangeEnd)
    const hasRange = Number.isFinite(start) && Number.isFinite(end) && start > 0 && end >= start

    let targets: Question[] = []
    if (mode === 'range') {
      targets = hasRange ? await getQuestionsForRange() : []
    } else {
      targets = await ensureAllQuestions()
    }

    setUiError('')
    setUiNotice('')
    setBulkBusy(true)
    const updates: any[] = []
    for (const q of targets) {
      const qnum = Number((q as any).questionNumber || (q as any).question_number)
      if (!Number.isFinite(qnum) && !hasSingle) continue
      const answer = hasSingle ? singleMapped : key[qnum]
      if (!answer) continue
      if (mode === 'missing' && q.correct_option_letters) continue
      const updatedOptions = applyAnswerToOptions(q.options || [], answer)
      updates.push({
        question_id: q.question_id,
        patch: { correct_option_letters: answer, options: updatedOptions }
      })
    }
    if (!updates.length) {
      setBulkBusy(false)
      setUiError('No answers applied. Check question numbers and key format.')
      return
    }
    const result = await bulkUpdateRequest({ updates })
    setBulkBusy(false)
    await loadDraft(currentBatch)
    await refreshAllIfLoaded()
    if (!result) return
    setUiNotice(`Applied ${result.updated} answers.`)
  }

  async function uploadAnswerKeyFile(file: File) {
    if (!file) return
    if (!currentBatch) return
    setAnswerKeyStatus('Parsing answer key...')
    setAnswerKeyPairs([])
    const form = new FormData()
    form.append('file', file)
    const maxPages = Math.max(1, Math.min(20, Number(answerKeyMaxPages) || 6))
    const maxQ = Math.max(1, Number(answerKeyMaxQ) || 1200)
    const minQ = Math.max(1, Number(answerKeyMinQ) || 1)
    const startPage = Math.max(1, Number(answerKeyStartPage) || 1)
    const ocrDpi = Math.max(150, Math.min(450, Number(answerKeyOcrDpi) || 300))
    const res = await apiFetch(`${API_URL}/draft/answer-key/parse?max_pages=${maxPages}&start_page=${startPage}&min_q=${minQ}&max_q=${maxQ}&ocr_dpi=${ocrDpi}`, {
      method: 'POST',
      headers: authHeaders(),
      body: form
    })
    if (!res.ok) {
      const msg = await res.text()
      setAnswerKeyStatus(msg || 'Failed to parse answer key')
      return
    }
    const data = await res.json()
    const pairs = Array.isArray(data.pairs) ? data.pairs : []
    setAnswerKeyPairs(pairs)
    if (pairs.length > 0) {
      const nums = pairs.map((p: any) => Number(p.number)).filter((n: any) => Number.isFinite(n))
      const min = nums.length ? Math.min(...nums) : null
      const max = nums.length ? Math.max(...nums) : null
      setAnswerKeyDetected({ count: nums.length, min, max })
    } else {
      setAnswerKeyDetected({ count: 0, min: null, max: null })
    }
    if (pairs.length > 0) {
      const keyText = pairs.map((p: any) => `${p.number}.${p.answer}`).join(' ')
      setBulkAnswerKey(keyText)
      setAnswerKeyStatus(`Parsed ${pairs.length} answers.`)
    } else {
      setAnswerKeyStatus('No answers parsed.')
    }
  }

  async function applyAnswersToPage() {
    if (!draft?.questions || !currentBatch) return
    const pageNum = Number(bulkAnswerPage)
    if (!Number.isFinite(pageNum) || pageNum <= 0) {
      alert('Enter a valid page number')
      return
    }
    const key = parseAnswerKey(bulkAnswerKey)
    const single = bulkAnswerKey.trim().toUpperCase()
    const singleMapped = single === '1' ? 'A' : single === '2' ? 'B' : single === '3' ? 'C' : single === '4' ? 'D' : single
    const hasSingle = ['A', 'B', 'C', 'D'].includes(singleMapped)
    if (!Object.keys(key).length && !hasSingle) {
      alert('Paste a valid answer key like: 1.A 2.B 3.C or a single letter like A')
      return
    }

    setUiError('')
    setUiNotice('')
    setBulkBusy(true)
    let applied = 0
    for (const q of draft.questions) {
      if ((q.source_page || 0) !== pageNum) continue
      const qnum = Number((q as any).questionNumber || (q as any).question_number)
      if (!Number.isFinite(qnum) && !hasSingle) continue
      const answer = hasSingle ? singleMapped : key[qnum]
      if (answer) {
        const updatedOptions = applyAnswerToOptions(q.options || [], answer)
        const ok = await updateQuestion(q.question_id, { correct_option_letters: answer, options: updatedOptions } as any, false)
        if (ok) applied += 1
      }
    }
    setBulkBusy(false)
    await loadDraft(currentBatch)
    if (applied === 0) {
      setUiError(`No answers applied for page ${pageNum}.`)
    } else {
      setUiNotice(`Applied ${applied} answers on page ${pageNum}.`)
    }
  }

  async function applyAnswerToQuestion(q: Question) {
    if (!currentBatch) return
    const key = parseAnswerKey(bulkAnswerKey)
    if (!Object.keys(key).length) {
      alert('Paste a valid answer key like: 1.A 2.B 3.C')
      return
    }
    const qnum = Number((q as any).questionNumber || (q as any).question_number)
    if (!Number.isFinite(qnum)) {
      alert('Question number not found for this question')
      return
    }
    const answer = key[qnum]
    if (!answer) {
      alert('No answer found for this question number in the key')
      return
    }
    setUiError('')
    setUiNotice('')
    const updatedOptions = applyAnswerToOptions(q.options || [], answer)
    const ok = await updateQuestion(q.question_id, { correct_option_letters: answer, options: updatedOptions } as any, false)
    await loadDraft(currentBatch)
    if (ok) {
      setUiNotice(`Applied answer ${answer} to question ${qnum}.`)
    }
  }

  async function applyBulkLevel(mode: 'all' | 'missing' | 'range') {
    if (!draft?.questions || !currentBatch) return
    const level = Number(bulkLevel)
    if (!Number.isFinite(level)) {
      alert('Enter a numeric level (1-3)')
      return
    }

    const start = Number(bulkRangeStart)
    const end = Number(bulkRangeEnd)
    const hasRange = Number.isFinite(start) && Number.isFinite(end) && start > 0 && end >= start

    setUiError('')
    setUiNotice('')
    setBulkBusy(true)
    const body: any = { mode, patch: { difficulty_level: level } }
    if (mode === 'range') {
      if (!hasRange) {
        setBulkBusy(false)
        alert('Enter a valid range')
        return
      }
      body.range_start = start
      body.range_end = end
    }
    const result = await bulkUpdateRequest(body)
    setBulkBusy(false)
    await loadDraft(currentBatch)
    await refreshAllIfLoaded()
    if (result?.updated !== undefined) {
      setUiNotice('Difficulty level updated.')
    }
  }

  async function applyBulkDifficultyType(mode: 'all' | 'missing' | 'range') {
    if (!draft?.questions || !currentBatch) return
    const rawType = bulkDifficultyType.trim()
    const diffType = rawType && rawType.toLowerCase() !== 'unknown' ? rawType : null
    if (!diffType) {
      alert('Enter a difficulty type')
      return
    }

    const start = Number(bulkRangeStart)
    const end = Number(bulkRangeEnd)
    const hasRange = Number.isFinite(start) && Number.isFinite(end) && start > 0 && end >= start

    setUiError('')
    setUiNotice('')
    setBulkBusy(true)
    const body: any = { mode, patch: { difficulty_type: diffType } }
    if (mode === 'range') {
      if (!hasRange) {
        setBulkBusy(false)
        alert('Enter a valid range')
        return
      }
      body.range_start = start
      body.range_end = end
    }
    const result = await bulkUpdateRequest(body)
    setBulkBusy(false)
    await loadDraft(currentBatch)
    await refreshAllIfLoaded()
    if (result?.updated !== undefined) {
      setUiNotice('Difficulty type updated.')
    }
  }

  async function applyBulkQuestionType(mode: 'all' | 'range') {
    if (!draft?.questions || !currentBatch) return
    const qt = bulkQuestionType.trim().toLowerCase()
    if (!qt) {
      alert('Enter a question type')
      return
    }

    const start = Number(bulkRangeStart)
    const end = Number(bulkRangeEnd)
    const hasRange = Number.isFinite(start) && Number.isFinite(end) && start > 0 && end >= start

    setUiError('')
    setUiNotice('')
    setBulkBusy(true)
    const body: any = { mode, patch: { questionType: qt } }
    if (mode === 'range') {
      if (!hasRange) {
        setBulkBusy(false)
        alert('Enter a valid range')
        return
      }
      body.range_start = start
      body.range_end = end
    }
    const result = await bulkUpdateRequest(body)
    setBulkBusy(false)
    await loadDraft(currentBatch)
    await refreshAllIfLoaded()
    if (result?.updated !== undefined) {
      setUiNotice('Question type updated.')
    }
  }

  async function applyBulkLevelAndType(mode: 'all' | 'missing' | 'range') {
    if (!draft?.questions || !currentBatch) return
    const level = Number(bulkLevel)
    const rawType = bulkDifficultyType.trim()
    const diffType = rawType && rawType.toLowerCase() !== 'unknown' ? rawType : null
    if (!Number.isFinite(level) || !diffType) {
      alert('Enter both difficulty level and type')
      return
    }

    const start = Number(bulkRangeStart)
    const end = Number(bulkRangeEnd)
    const hasRange = Number.isFinite(start) && Number.isFinite(end) && start > 0 && end >= start

    setUiError('')
    setUiNotice('')
    setBulkBusy(true)
    const body: any = { mode, patch: { difficulty_level: level, difficulty_type: diffType } }
    if (mode === 'range') {
      if (!hasRange) {
        setBulkBusy(false)
        alert('Enter a valid range')
        return
      }
      body.range_start = start
      body.range_end = end
    }
    const result = await bulkUpdateRequest(body)
    setBulkBusy(false)
    await loadDraft(currentBatch)
    await refreshAllIfLoaded()
    if (result?.updated !== undefined) {
      setUiNotice('Difficulty level + type updated.')
    }
  }

  async function applyBulkLevelTypeAndQuestionType(mode: 'all' | 'missing' | 'range') {
    if (!draft?.questions || !currentBatch) return
    const level = Number(bulkLevel)
    const rawType = bulkDifficultyType.trim()
    const diffType = rawType && rawType.toLowerCase() !== 'unknown' ? rawType : null
    const qtype = bulkQuestionType.trim().toLowerCase()
    if (!Number.isFinite(level) || !diffType || !qtype) {
      alert('Enter difficulty level, difficulty type, and question type')
      return
    }

    const start = Number(bulkRangeStart)
    const end = Number(bulkRangeEnd)
    const hasRange = Number.isFinite(start) && Number.isFinite(end) && start > 0 && end >= start

    setUiError('')
    setUiNotice('')
    setBulkBusy(true)
    const body: any = { mode, patch: { difficulty_level: level, difficulty_type: diffType, questionType: qtype } }
    if (mode === 'range') {
      if (!hasRange) {
        setBulkBusy(false)
        alert('Enter a valid range')
        return
      }
      body.range_start = start
      body.range_end = end
    }
    const result = await bulkUpdateRequest(body)
    setBulkBusy(false)
    await loadDraft(currentBatch)
    await refreshAllIfLoaded()
    if (result?.updated !== undefined) {
      setUiNotice('Level + type + question type updated.')
    }
  }

  async function applyCommittedMetadata(mode: 'all' | 'missing') {
    if (!committed.length) return
    const subject = committedBulkSubject.trim()
    const chapter = committedBulkChapter.trim()
    const topic = committedBulkTopic.trim()

    if (!subject && !chapter && !topic) {
      alert('Enter subject, chapter, or topic to apply.')
      return
    }

    setCommittedBulkBusy(true)
    for (const q of committed) {
      if (!q.id) continue
      const patch: any = {}
      const currentSubject = q.subject_name || ''
      const currentChapter = q.chapter_name || ''
      const currentTopic = q.topic_name || ''

      if (subject && (mode === 'all' || (mode === 'missing' && !currentSubject))) {
        patch.subject_name = subject
      }
      if (chapter && (mode === 'all' || (mode === 'missing' && !currentChapter))) {
        patch.chapter_name = chapter
      }
      if (topic && (mode === 'all' || (mode === 'missing' && !currentTopic))) {
        patch.topic_name = topic
      }

      if (Object.keys(patch).length > 0) {
        await fetch(`${expressUrl}/api/questions/${q.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', ...authHeaders() },
          body: JSON.stringify(patch)
        })
      }
    }

    setCommittedBulkBusy(false)
    await loadCommitted()
  }

  async function fetchAllQuestions(batchId: string): Promise<Question[]> {
    const out: Question[] = []
    let page = 1
    const limit = 200
    while (true) {
    const res = await apiFetch(`${API_URL}/draft/${batchId}?page=${page}&limit=${limit}`, { headers: authHeaders() })
      if (!res.ok) break
      const data = await res.json()
      const qs = Array.isArray(data.questions) ? data.questions : []
      out.push(...qs)
      if (!data.page_count || page >= data.page_count) break
      page += 1
    }
    return out
  }

  async function ensureAllQuestions(): Promise<Question[]> {
    if (!currentBatch) return []
    if (allQuestions) return allQuestions
    const fetched = await fetchAllQuestions(currentBatch)
    setAllQuestions(fetched)
    return fetched
  }

  async function loadAllQuestions(batchId: string) {
    try {
      setAllLoading(true)
      const all = await fetchAllQuestions(batchId)
      setAllQuestions(all)
    } finally {
      setAllLoading(false)
    }
  }

  async function bulkUpdateRequest(body: any) {
    if (!currentBatch) return null
    const res = await apiFetch(`${API_URL}/draft/${currentBatch}/bulk-update`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify(body)
    })
    if (!res.ok) {
      const msg = await res.text()
      setUiError(msg || 'Bulk update failed')
      setUiNotice('')
      return null
    }
    setUiError('')
    return res.json()
  }

  async function refreshAllIfLoaded() {
    if (currentBatch && allQuestions) {
      await loadAllQuestions(currentBatch)
    }
  }

  function parseQuestionNumber(q: Question): number | null {
    const raw = (q as any).questionNumber ?? (q as any).question_number
    const num = Number(raw)
    return Number.isFinite(num) ? num : null
  }

  function filterQuestionsByRange(questions: Question[], start: number, end: number): Question[] {
    return questions.filter((q, idx) => {
      const parsed = parseQuestionNumber(q)
      const num = parsed !== null ? parsed : (idx + 1)
      return num >= start && num <= end
    })
  }

  async function getQuestionsForRange(): Promise<Question[]> {
    if (!currentBatch) return []
    const start = Number(bulkRangeStart)
    const end = Number(bulkRangeEnd)
    if (!Number.isFinite(start) || !Number.isFinite(end) || start <= 0 || end < start) return []
    const all = await fetchAllQuestions(currentBatch)
    return filterQuestionsByRange(all, start, end)
  }

  function getQuestionsForSelected(): Question[] {
    if (!questionsForView.length) return []
    return questionsForView.filter((q: Question) => selectedIds.has(q.question_id))
  }

  function getQuestionsForFailed(): Question[] {
    if (!questionsForView.length) return []
    return questionsForView.filter((q: Question) => validationFailedIds.has(q.question_id))
  }

  function selectFailedAndRun(action: 'validate' | 'commit') {
    if (validationFailedIds.size === 0) {
      alert('No failed questions to retry.')
      return
    }
    setSelectedIds(new Set(validationFailedIds))
    window.setTimeout(() => {
      if (action === 'validate') {
        validateBulk('selected')
      } else {
        commitBulk('selected')
      }
    }, 0)
  }

  async function validateBulk(mode: 'all' | 'selected' | 'range' = 'all') {
    if (!draft?.questions) return
    let sticky = false
    if (!bulkExamType.trim()) {
      alert('Select exam type (NEET/JEE/JEE Advanced) before validation.')
      return
    }
    const source =
      mode === 'selected' ? getQuestionsForSelected() :
      mode === 'range' ? await getQuestionsForRange() :
      await ensureAllQuestions()
      const payload = buildBulkPayload(source)
      if (!payload.length || !currentBatch) {
        alert('No verified questions to validate')
        return
      }
      const verifiedSource = source.filter(q => q.verification_state === 'verified')
      setLastValidationQuestions(verifiedSource)
        const questionIds = verifiedSource.map(q => q.question_id).filter(Boolean)
        const controller = new AbortController()
        const timeoutId = window.setTimeout(() => controller.abort(), 60000)
        try {
          console.info('[validate] start', { mode, count: payload.length, url: EXPRESS_URL })
          setActionStatus({ state: 'working', message: 'Validating...' })
          const res = await apiFetch(`${EXPRESS_URL}/api/questions/validate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', ...authHeaders() },
            body: JSON.stringify({ questions: payload }),
            signal: controller.signal
          })
      console.info('[validate] response', { status: res.status })
      if (!res.ok) {
        const msg = await res.text()
        setActionStatus({ state: 'error', message: msg || 'Validation failed.' })
        setUiError(msg || 'Validation failed.')
        return
      }
      const data = await res.json()
      const normalized = {
        ...data,
        validCount: data.validCount ?? data.valid ?? 0,
        failedCount: data.failedCount ?? data.failed ?? 0,
        skippedCount: data.skippedCount ?? data.skipped_not_verified ?? 0
      } as ValidationResult
      setValidationResult(normalized)
      const errors = Array.isArray(normalized.errors) ? normalized.errors : []
      setValidationErrors(errors)
        const failedIds = new Set<string>()
        const duplicateIds = new Set<string>()
        for (const err of errors) {
          const directId = (err as any)?.question_id || (err as any)?.questionId
          const idx = typeof (err as any)?.index === 'number' ? (err as any).index : -1
          const q = idx >= 0 ? source[idx] : null
          const targetId = directId || q?.question_id
          if (!targetId) continue
          if ((err as any)?.reason === 'DUPLICATE_IN_DB') {
            duplicateIds.add(targetId)
          } else {
            failedIds.add(targetId)
          }
        }
      const validIds = new Set<string>()
      for (const q of source) {
        if (q?.question_id && !failedIds.has(q.question_id) && !duplicateIds.has(q.question_id)) {
          validIds.add(q.question_id)
        }
      }
      setValidationFailedIds(failedIds)
      setValidationValidIds(validIds)
      setShowValidation(true)
      const nonDuplicateFailed = failedIds.size
      if (nonDuplicateFailed > 0) {
        setActionStatus({ state: 'error', message: `Validation failed for ${nonDuplicateFailed} question(s).` })
        setActionSticky(true)
        sticky = true
        setValidationFilter('failed')
        setFilter('all')
        setSourcePage(null)
        setUiNotice('Showing failed questions.')
      } else {
        setActionStatus({ state: 'success', message: `Validation passed (${normalized.validCount || 0}).` })
        setActionSticky(false)
        sticky = false
        setValidationFilter('all')
        setFilter('all')
      }
      if (autoMarkDuplicates && duplicateIds.size > 0 && currentBatch) {
        const updates = Array.from(duplicateIds).map(id => ({
          question_id: id,
          patch: { verification_state: 'committed' }
        }))
        await bulkUpdateRequest({ updates })
        if (currentBatch) {
          await loadDraft(currentBatch)
        }
        await refreshAllIfLoaded()
        setUiNotice(`Skipped ${duplicateIds.size} duplicate question(s) already in DB.`)
      }
      console.info('[validate] done', { valid: normalized.validCount, failed: normalized.failedCount, skipped: normalized.skippedCount })
    } catch (err: any) {
      const msg = err?.name === 'AbortError' ? 'Validation timed out.' : 'Validation error.'
      setActionStatus({ state: 'error', message: msg })
      setActionSticky(true)
      sticky = true
    } finally {
      window.clearTimeout(timeoutId)
      if (!sticky) {
        window.setTimeout(() => setActionStatus({ state: 'idle', message: '' }), 3000)
      }
    }
  }

  function summarizeCommit(questions: Question[]) {
    const verified = questions.filter(q => q.verification_state === 'verified')
    const missingSubject = verified.filter(q => !String((q.subject_name || '')).trim()).length
    const missingChapter = verified.filter(q => !String((q.chapter_name || '')).trim()).length
    const missingTopic = verified.filter(q => !String((q.topic_name || '')).trim()).length
    const missingExam = verified.filter(q => !String((q.exam_type || bulkExamType || '')).trim()).length
    const missingDifficulty = verified.filter(q => !q.difficulty_level).length
    const missingType = verified.filter(q => !String((q.questionType || q.question_type || '')).trim()).length
    const missingOptions = verified.filter(q => !(q.options || []).some(o => o.text && String(o.text).trim())).length
    const missingCorrect = verified.filter(q => {
      const hasCorrect = (q.options || []).some(o => o.is_correct)
      if (hasCorrect) return false
      const raw = q.correct_option_letters ? String(q.correct_option_letters).trim() : ''
      return !raw
    }).length
    return {
      verifiedCount: verified.length,
      missingSubject,
      missingChapter,
      missingTopic,
      missingExam,
      missingDifficulty,
      missingType,
      missingOptions,
      missingCorrect
    }
  }

  function commitSummaryText(summary: ReturnType<typeof summarizeCommit>) {
    const parts = [
      `Verified: ${summary.verifiedCount}`,
      `Missing subject: ${summary.missingSubject}`,
      `Missing chapter: ${summary.missingChapter}`,
      `Missing topic: ${summary.missingTopic}`,
      `Missing exam: ${summary.missingExam}`,
      `Missing difficulty: ${summary.missingDifficulty}`,
      `Missing type: ${summary.missingType}`,
      `Missing options: ${summary.missingOptions}`,
      `Missing correct: ${summary.missingCorrect}`
    ]
    return parts.join('\n')
  }

  async function commitBulk(mode: 'all' | 'selected' | 'range' = 'all') {
    if (!draft?.questions) return
    let sticky = false
    if (!bulkExamType.trim()) {
      alert('Select exam type (NEET/JEE/JEE Advanced) before commit.')
      return
    }
    const source =
      mode === 'selected' ? getQuestionsForSelected() :
      mode === 'range' ? await getQuestionsForRange() :
      await ensureAllQuestions()
    const summary = summarizeCommit(source)
    if (summary.verifiedCount === 0) {
      alert('No verified questions to commit.')
      return
    }
    if (
      summary.missingSubject ||
      summary.missingChapter ||
      summary.missingTopic ||
      summary.missingExam ||
      summary.missingDifficulty ||
      summary.missingType ||
      summary.missingOptions
    ) {
      alert(`Fix missing data before commit:\n${commitSummaryText(summary)}`)
      return
    }
    if (!confirm(`Commit verified questions to database?\n\n${commitSummaryText(summary)}`)) return
      const payload = buildBulkPayload(source)
      if (!payload.length || !currentBatch) {
        alert('No verified questions to commit')
        return
      }
      const verifiedSource = source.filter(q => q.verification_state === 'verified')
      setLastValidationQuestions(verifiedSource)
      const questionIds = verifiedSource.map(q => q.question_id).filter(Boolean)
      const controller = new AbortController()
      const timeoutId = window.setTimeout(() => controller.abort(), 120000)
      try {
        console.info('[commit] start', { mode, count: payload.length, url: EXPRESS_URL })
        setActionStatus({ state: 'working', message: 'Committing...' })
        const res = await apiFetch(`${EXPRESS_URL}/api/questions/bulk`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...authHeaders() },
          body: JSON.stringify({ questions: payload, chunkSize: 100 }),
          signal: controller.signal
        })
      console.info('[commit] response', { status: res.status })
      if (!res.ok) {
        const msg = await res.text()
        setActionStatus({ state: 'error', message: msg || 'Commit failed.' })
        setUiError(msg || 'Commit failed.')
        return
      }
      const data = await res.json()
      const normalized = {
        ...data,
        insertedCount: data.insertedCount ?? data.inserted ?? 0,
        failedCount: data.failedCount ?? data.failed ?? 0,
        skippedCount: data.skippedCount ?? data.skipped_not_verified ?? 0,
        validCount: data.validCount ?? data.valid ?? 0
      } as ValidationResult
      setValidationResult(normalized)
      const errors = Array.isArray(normalized.errors) ? normalized.errors : []
      setValidationErrors(errors)
        const sourceQuestions = verifiedSource
        const failedIds = new Set<string>()
        const duplicateIds = new Set<string>()
        for (const err of errors) {
          const directId = (err as any)?.question_id || (err as any)?.questionId
          const idx = typeof (err as any)?.index === 'number' ? (err as any).index : -1
          const q = idx >= 0 ? sourceQuestions[idx] : null
          const targetId = directId || q?.question_id
          if (!targetId) continue
          if ((err as any)?.reason === 'DUPLICATE_IN_DB') {
            duplicateIds.add(targetId)
          } else {
            failedIds.add(targetId)
          }
        }
      const validIds = new Set<string>()
      for (const q of sourceQuestions) {
        if (q?.question_id && !failedIds.has(q.question_id) && !duplicateIds.has(q.question_id)) {
          validIds.add(q.question_id)
        }
      }
      setValidationFailedIds(failedIds)
      setValidationValidIds(validIds)
      setShowValidation(true)
      const duplicateCount = duplicateIds.size
      if (duplicateCount > 0) {
        const updates = Array.from(duplicateIds).map(id => ({
          question_id: id,
          patch: { verification_state: 'committed' }
        }))
        await bulkUpdateRequest({ updates })
        if (currentBatch) {
          await loadDraft(currentBatch)
        }
        await refreshAllIfLoaded()
        setUiNotice(`Skipped ${duplicateCount} duplicate question(s) already in DB.`)
      }
      if (normalized.insertedCount && normalized.insertedCount > 0) {
        setActionStatus({ state: 'success', message: `Inserted ${normalized.insertedCount} question(s).` })
        setActionSticky(false)
        sticky = false
        setValidationFilter(normalized.failedCount && normalized.failedCount > 0 ? 'failed' : 'all')
        setFilter('all')
        if (validIds.size > 0) {
          const updates = Array.from(validIds).map(id => ({
            question_id: id,
            patch: { verification_state: 'committed' }
          }))
          await bulkUpdateRequest({ updates })
          if (currentBatch) {
            await loadDraft(currentBatch)
          }
          await refreshAllIfLoaded()
        }
        if (normalized.failedCount && normalized.failedCount > 0) {
          setSourcePage(null)
          setShowValidation(true)
          setUiNotice('Showing failed questions.')
        }
      } else {
        setActionStatus({ state: 'error', message: 'No questions inserted.' })
        setActionSticky(true)
        sticky = true
        setValidationFilter('failed')
        setFilter('all')
        setSourcePage(null)
        setShowValidation(true)
        setUiNotice('Showing failed questions.')
      }
      console.info('[commit] done', { inserted: normalized.insertedCount, failed: normalized.failedCount, skipped: normalized.skippedCount })
    } catch (err: any) {
      const msg = err?.name === 'AbortError' ? 'Commit timed out.' : 'Commit error.'
      setActionStatus({ state: 'error', message: msg })
      setActionSticky(true)
      sticky = true
    } finally {
      window.clearTimeout(timeoutId)
      if (!sticky) {
        window.setTimeout(() => setActionStatus({ state: 'idle', message: '' }), 3000)
      }
    }
  }

  async function loadCommitted(batchIdOverride?: string) {
    try {
      const batchId = (batchIdOverride ?? committedBatch).trim()
      const batchParam = batchId ? `&batch_id=${encodeURIComponent(batchId)}` : ''
      const res = await fetch(`${expressUrl}/api/questions/recent?limit=100${batchParam}`, {
        headers: { ...authHeaders() }
      })
      if (!res.ok) return
      const data = await res.json()
      const rows = Array.isArray(data.questions) ? data.questions : []
      setCommitted(rows)
      setViewMode('committed')
    } catch {
      // ignore
    }
  }

  async function deleteCommittedQuestion(questionId?: string, numericId?: number) {
    const target = questionId || numericId
    if (!target) return
    const ok = window.confirm(`Delete committed question ${target}? This cannot be undone.`)
    if (!ok) return
    try {
      const res = await fetch(`${expressUrl}/api/questions/deletequestion`, {
        method: 'DELETE',
        headers: { ...authHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ questionId: String(target) })
      })
      if (!res.ok) {
        const msg = await res.text()
        setCommittedError(msg || 'Failed to delete committed question')
        return
      }
      setCommitted(prev => prev.filter(q => q.question_id !== questionId && q.id !== numericId))
      setCommittedError('')
      setUiNotice('Committed question deleted.')
    } catch (err: any) {
      setCommittedError(err?.message || 'Failed to delete committed question')
    }
  }

  function downloadCommittedCsv() {
    if (!committedForView.length) {
      alert('No committed questions to export.')
      return
    }
    const header = ['question_id', 'question_text', 'subject', 'chapter', 'topic', 'exam_type', 'published_year', 'question_fact', 'batch_tag', 'difficulty_level', 'difficulty_type', 'question_type']
    const rows = committedForView.map(q => [
      q.id ?? '',
      (q.question_text || '').replace(/\n/g, ' ').trim(),
      q.subject_name || '',
      q.chapter_name || '',
      q.topic_name || '',
      q.exam_type || '',
      (q as any).published_year || '',
      (q as any).question_fact || '',
      q.batch_tag || '',
      q.difficulty_level ?? '',
      q.difficulty_type || '',
      q.question_type || ''
    ])
    const csv = [header, ...rows].map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const batchLabel = committedBatch ? `_${committedBatch}` : ''
    link.href = URL.createObjectURL(blob)
    link.download = `committed_questions${batchLabel}.csv`
    link.click()
    URL.revokeObjectURL(link.href)
  }

  const pageQuestions = draft?.questions || []
  const questionsForView = allQuestions || pageQuestions
  const sourcePages = Array.from(
    new Set(questionsForView.map(q => q.source_page).filter(n => Number.isFinite(n)))
  ).sort((a, b) => a - b)
  const validationFilteredQuestions = validationFilter === 'failed'
    ? questionsForView.filter((q: Question) => validationFailedIds.has(q.question_id))
    : validationFilter === 'valid'
      ? questionsForView.filter((q: Question) => validationValidIds.has(q.question_id))
      : questionsForView
  const filteredQuestions = validationFilteredQuestions
    .filter((q: Question) => (validationFilter !== 'all' ? true : (sourcePage ? q.source_page === sourcePage : true)))
    .filter((q: Question) => {
      if (filter === 'all') return true
      if (filter === 'verified') return q.verification_state === 'verified'
      if (filter === 'pending') return q.verification_state !== 'verified' && q.verification_state !== 'rejected'
      return true
    })
    .filter((q: Question) => {
      if (!filterExamType) return true
      return String(q.exam_type || '').trim().toLowerCase() === filterExamType.toLowerCase()
    })
    .filter((q: Question) => (!filterMissingAssets ? true : hasMissingAssets(q)))
    .sort((a: Question, b: Question) => (a.source_page || 0) - (b.source_page || 0))

  const pageImagesByPage = (() => {
    const assets = draft?.image_assets || {}
    const map: Record<number, { id: string; filename: string }[]> = {}
    Object.entries(assets).forEach(([key, asset]: any) => {
      if (!asset || !asset.filename) return
      const sp = asset.source_page
      if (!Number.isFinite(sp)) return
      if (!map[sp]) map[sp] = []
      map[sp].push({ id: key, filename: asset.filename })
    })
    return map
  })()

  useEffect(() => {
    const count = filteredQuestions.length
    if (count > 0 && prevQuestionsCountRef.current === 0) {
      questionsAnchorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
    prevQuestionsCountRef.current = count
  }, [filteredQuestions.length])

  const currentBatchInfo = currentBatch ? batches.find(b => b.batch_id === currentBatch) : undefined
  const totalQuestionsKnown = currentBatchInfo?.total_questions ?? draft?.total_questions ?? 0
  const loadedQuestionsCount = (allQuestions || draft?.questions || []).length
  const hasHiddenQuestions = totalQuestionsKnown > 0 && filteredQuestions.length === 0

  useEffect(() => {
    if (!currentBatch || autoLoadAllRef.current) return
    if (totalQuestionsKnown > loadedQuestionsCount && filteredQuestions.length === 0 && !allQuestions) {
      autoLoadAllRef.current = true
      setUiNotice(`Questions exist in this batch (${totalQuestionsKnown}). Loading all pages...`)
      loadAllQuestions(currentBatch).finally(() => {
        setUiNotice('All pages loaded.')
      })
    }
  }, [currentBatch, totalQuestionsKnown, loadedQuestionsCount, filteredQuestions.length, allQuestions])

  useEffect(() => {
    if (!currentBatch || autoLoadAllRef.current) return
    if (!currentBatchInfo || currentBatchInfo.status !== 'done') return
    if (totalQuestionsKnown > loadedQuestionsCount && !allQuestions) {
      autoLoadAllRef.current = true
      setUiNotice(`Batch complete (${totalQuestionsKnown} questions). Loading all pages...`)
      loadAllQuestions(currentBatch).finally(() => {
        setUiNotice('All pages loaded.')
      })
    }
  }, [currentBatch, currentBatchInfo?.status, totalQuestionsKnown, loadedQuestionsCount, allQuestions])

  const stats = {
    total: questionsForView.length || 0,
    verified: questionsForView.filter((q: Question) => q.verification_state === 'verified').length || 0,
    pending: questionsForView.filter((q: Question) => q.verification_state !== 'verified' && q.verification_state !== 'rejected').length || 0
  }
  const duplicateCount = validationErrors.filter(e => e?.reason === 'DUPLICATE_IN_DB').length
  const failedCount = validationFailedIds.size
  const selectedCount = selectedIds.size
  const committedForView = committed.filter(q => {
    if (committedFilterExam && String(q.exam_type || '').toLowerCase() !== committedFilterExam.toLowerCase()) {
      return false
    }
    if (committedFilterTag && !(String(q.batch_tag || '').toLowerCase().includes(committedFilterTag.toLowerCase()))) {
      return false
    }
    return true
  })
  const tourSteps = getTourSteps()
  const tourTotal = tourSteps.length
  const activeTour = tourOpen && tourSteps[tourStep]

  function getTourSteps() {
    return [
      { selector: '[data-tour="sidebar"]', title: 'Batches', body: 'Pick a batch to load questions from one PDF.' },
      { selector: '[data-tour="pagination"]', title: 'Pages', body: 'Use the page selector to review one source_page at a time.' },
      { selector: '[data-tour="actions"]', title: 'Validate + Commit', body: 'Validate checks required fields. Commit sends verified questions to DB.' },
      { selector: '[data-tour="bulk-meta"]', title: 'Bulk Metadata', body: 'Apply subject/chapter/topic, difficulty, and question type in bulk.' },
      { selector: '[data-tour="filters"]', title: 'Filters', body: 'Filter by pending/verified/failed after validation.' }
    ]
  }

  function parseTimestamp(ts?: string): number | null {
    if (!ts) return null
    const hasTz = /[zZ]|[+-]\d{2}:?\d{2}$/.test(ts)
    const safe = hasTz ? ts : `${ts}Z`
    const t = Date.parse(safe)
    return Number.isFinite(t) ? t : null
  }

  function formatElapsed(start?: string) {
    const t = parseTimestamp(start)
    if (!t) return ''
    const diff = Math.max(0, Math.floor((nowTs - t) / 1000))
    const h = Math.floor(diff / 3600)
    const m = Math.floor((diff % 3600) / 60)
    const s = diff % 60
    if (h) return `${h}h ${m}m ${s}s`
    if (m) return `${m}m ${s}s`
    return `${s}s`
  }

  function formatIstTime(ts?: string) {
    const t = parseTimestamp(ts)
    if (!t) return ''
    return new Date(t).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })
  }

  function formatEta(elapsedSec: number, pagesDone?: number | null, totalPages?: number | null) {
    if (!pagesDone || !totalPages || pagesDone <= 0) return ''
    const rate = elapsedSec / pagesDone
    const remaining = Math.max(0, Math.round(rate * (totalPages - pagesDone)))
    return formatDuration(remaining)
  }

  function formatDuration(totalSec: number) {
    const h = Math.floor(totalSec / 3600)
    const m = Math.floor((totalSec % 3600) / 60)
    const s = totalSec % 60
    if (h) return `${h}h ${m}m ${s}s`
    if (m) return `${m}m ${s}s`
    return `${s}s`
  }

  function closeTour() {
    localStorage.setItem('dq_review_tour_done', '1')
    setTourOpen(false)
  }

  function nextTour() {
    if (tourStep + 1 >= tourTotal) {
      closeTour()
      return
    }
    setTourStep(tourStep + 1)
  }

  function prevTour() {
    if (tourStep === 0) return
    setTourStep(tourStep - 1)
  }

  function formatValidationError(e: any, q: any) {
    const field = e?.field || 'unknown'
    const reason = e?.reason || e?.message || 'INVALID'
    let message = ''
    switch (reason) {
      case 'REQUIRED':
        message = `Missing ${field}`
        break
      case 'SUBJECT_NOT_FOUND':
        message = 'Subject not found in DB'
        break
      case 'INVALID_QUESTION_TYPE':
        message = 'Question type not supported'
        break
      case 'INSUFFICIENT_OPTIONS':
        message = 'Options missing'
        break
      case 'NO_CORRECT_ANSWER':
        message = 'No correct option selected'
        break
      case 'SINGLE_CORRECT_VIOLATION':
        message = 'Single-correct needs exactly 1 answer'
        break
      case 'DIFFICULTY_REQUIRED':
        message = 'Difficulty level/type missing'
        break
      case 'INVALID_DIFFICULTY':
        message = 'Difficulty level/type not found'
        break
      case 'TEXT_TOO_SHORT':
        message = 'Question text too short'
        break
      default:
        message = String(reason)
    }
    const qnum = (q as any)?.questionNumber || (q as any)?.question_number
    const page = q?.source_page
    return { page, qnum, field, reason, message }
  }

  function downloadValidationErrors() {
    if (!validationErrors.length) {
      alert('No validation errors to download.')
      return
    }
    const rows = validationErrors.map((e: any) => {
      const idx = typeof e?.index === 'number' ? e.index : -1
      const q = idx >= 0 ? lastValidationQuestions[idx] : null
      const info = formatValidationError(e, q)
      return [
        q?.question_id ?? '',
        q?.subject_name ?? '',
        q?.chapter_name ?? '',
        q?.topic_name ?? '',
        q?.exam_type ?? '',
        (q as any)?.published_year ?? '',
        (q as any)?.question_fact ?? '',
        info.page ?? '',
        info.qnum ?? '',
        info.field,
        info.reason,
        info.message
      ]
    })
    const header = ['question_id', 'subject', 'chapter', 'topic', 'exam_type', 'published_year', 'question_fact', 'page', 'question_number', 'field', 'reason', 'message']
    const csv = [header, ...rows].map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'validation_errors.csv'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  if (!isLoggedIn) {
    return (
      <div style={{ minHeight: '100vh', background: '#0f0f1a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ background: 'rgba(255,255,255,0.03)', padding: '40px', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.08)', width: '100%', maxWidth: '420px', textAlign: 'center' }}>
          <h1 style={{ marginBottom: '16px' }}>Login required</h1>
          <p style={{ color: '#9ca3af', marginBottom: '20px' }}>Please login from the main page to continue.</p>
          {onLogout && (
            <button onClick={onLogout} style={{ padding: '10px 20px', background: '#3b82f6', border: 'none', borderRadius: '8px', color: '#fff', cursor: 'pointer' }}>
              Back to login
            </button>
          )}
        </div>
      </div>
    )
  }

  return (
      <div className="review-scope">
      <div className="app">
        {activeTour && (
          <div className="tour-overlay">
            <div className="tour-backdrop" onClick={closeTour} />
            <div className="tour-card">
              <div className="tour-title">{activeTour.title}</div>
              <div className="tour-body">{activeTour.body}</div>
              <div className="tour-actions">
                <span className="tour-step">Step {tourStep + 1} / {tourTotal}</span>
                <div className="tour-buttons">
                  <button className="btn small" onClick={prevTour} disabled={tourStep === 0}>
                    Back
                  </button>
                  <button className="btn small" onClick={nextTour}>
                    {tourStep + 1 === tourTotal ? 'Done' : 'Next'}
                  </button>
                  <button className="btn small" onClick={closeTour}>
                    Skip
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      <header className={`header ${showTitle ? 'has-title' : 'no-title'}`}>
        {showTitle && (
          <div className="header-title">
            <h1>DocQuest SuperAdmin</h1>
          </div>
        )}
        <div className="header-controls">
          <div className="header-tabs">
            <button
              className={`tab ${viewMode === 'review' ? 'active' : ''}`}
              onClick={() => setViewMode('review')}
            >
              Review
            </button>
            <button
              className={`tab ${viewMode === 'committed' ? 'active' : ''}`}
              onClick={() => loadCommitted()}
            >
              Committed
            </button>
            <button
              className="tab"
              onClick={() => {
                setTourStep(0)
                setTourOpen(true)
              }}
            >
              Help
            </button>
          </div>
          <div className="stats">
            <span className="stat">{stats.total} Total</span>
            <span className="stat verified">{stats.verified} Verified</span>
            <span className="stat pending">{stats.pending} Pending</span>
            <span className="user-pill">User: {username}</span>
            {onLogout && (
              <button className="btn logout" onClick={onLogout}>
                Logout
              </button>
            )}
          </div>
        </div>
      </header>

      {viewMode === 'committed' && (
        <div className="main committed-page">
          <div className="committed-header">
            <button className="committed-back" onClick={() => setViewMode('review')}>
              Back to Review
            </button>
            <h2>Committed Questions (latest 100)</h2>
            <select
              value={committedBatch}
              onChange={e => {
                const next = e.target.value
                setCommittedBatch(next)
                loadCommitted(next)
              }}
            >
              <option value="">All batches</option>
              {batches.map(b => (
                <option key={b.batch_id} value={b.batch_id}>
                  {b.file_name ? `${b.batch_id} (${b.file_name})` : b.batch_id}
                </option>
              ))}
            </select>
            <select value={committedFilterExam} onChange={e => setCommittedFilterExam(e.target.value)}>
              <option value="">All exams</option>
              <option value="neet">NEET</option>
              <option value="jee">JEE</option>
              <option value="jee advanced">JEE Advanced</option>
            </select>
            <input
              type="text"
              placeholder="Batch tag filter"
              value={committedFilterTag}
              onChange={e => setCommittedFilterTag(e.target.value)}
            />
            <button className="btn small" onClick={downloadCommittedCsv}>
              Download CSV
            </button>
          </div>
          <div className="bulk-metadata">
            <div className="bulk-row">
              <input
                type="text"
                placeholder="Subject"
                value={committedBulkSubject}
                onChange={e => setCommittedBulkSubject(e.target.value)}
              />
              <input
                type="text"
                placeholder="Chapter"
                value={committedBulkChapter}
                onChange={e => setCommittedBulkChapter(e.target.value)}
              />
              <input
                type="text"
                placeholder="Topic"
                value={committedBulkTopic}
                onChange={e => setCommittedBulkTopic(e.target.value)}
              />
              <button className="btn small" disabled={committedBulkBusy} onClick={() => applyCommittedMetadata('all')}>
                Apply to all
              </button>
              <button className="btn small" disabled={committedBulkBusy} onClick={() => applyCommittedMetadata('missing')}>
                Apply to missing
              </button>
            </div>
          </div>
          {committedForView.length === 0 && <div style={{ color: '#888' }}>No committed questions found.</div>}
          <div className="committed-list">
            {committedForView.map((q, i) => (
              <CommittedQuestionCard
                key={q.id || i}
                question={q}
                isEditing={committedEditId === q.id}
                editValue={committedEdit}
                difficultyTypes={difficultyTypes}
                onEdit={() => startEditCommitted(q)}
                onCancel={cancelEditCommitted}
                onChange={setCommittedEdit}
                onSave={saveCommittedEdit}
                onDelete={() => deleteCommittedQuestion(q.question_id, q.id)}
                error={committedError}
                assetUrl={committedAssetUrl}
                onUploadAsset={uploadCommittedAsset}
              />
            ))}
          </div>
        </div>
      )}

      {viewMode === 'review' && (
        <div className="main">
          <aside className="sidebar" data-tour="sidebar">
            <div className="upload-area">
              <label className="upload-label" title="Upload a PDF or DOCX to create a new batch.">
                <span>{uploading ? 'Processing...' : 'Upload PDF/DOCX'}</span>
                <input type="file" accept=".pdf,.docx" onChange={uploadFile} disabled={uploading} />
              </label>
              {uploadProgress && <p className="progress">{uploadProgress}</p>}
            </div>

            <h3>Batches</h3>
            {batches.map(b => (
              <div
                key={b.batch_id}
                className={`batch-item ${b.batch_id === currentBatch ? 'active' : ''}`}
                onClick={() => {
                  setCurrentPage(1)
                  setAllQuestions(null)
                  if (b.status === 'done') {
                    loadDraft(b.batch_id, 1, pageSize).then(() => loadAllQuestions(b.batch_id))
                  } else {
                    pollJobAndLoad(b)
                  }
                }}
                >
                  <span className="batch-id">{b.batch_id}</span>
                  <span className="batch-meta">{formatBatchMeta(b)}</span>
                  {b.stage_timings_seconds && (
                    <span className="batch-timings">
                      {formatStageTimings(b.stage_timings_seconds)}
                    </span>
                  )}
                  {b.status !== 'done' && (
                    <button
                      className="btn small"
                      style={{ marginLeft: 'auto' }}
                      disabled={startingBatchId === b.batch_id}
                      onClick={async e => {
                        e.stopPropagation()
                        setStartingBatchId(b.batch_id)
                        await dispatchBatch(b)
                        setStartingBatchId(null)
                      }}
                      title={isPausedStatus(b.status) ? 'Resume processing for this batch.' : 'Start processing this batch.'}
                    >
                      {startingBatchId === b.batch_id
                        ? (isPausedStatus(b.status) ? 'Resuming...' : 'Starting...')
                        : (isPausedStatus(b.status) ? 'Resume' : 'Start')}
                    </button>
                  )}
                  <button
                    className="btn small"
                    style={{ marginLeft: 'auto' }}
                    onClick={e => {
                      e.stopPropagation()
                      deleteBatch(b.batch_id)
                    }}
                    title="Delete this batch and its assets."
                  >
                    Delete
                  </button>
                </div>
            ))}
          </aside>

          <main className="content">
            {(uiNotice || uiError) && (
              <div className={`status-banner ${uiError ? 'error' : 'notice'}`}>
                <span>{uiError || uiNotice}</span>
                <button
                  className="btn small"
                  onClick={() => {
                    setUiError('')
                    setUiNotice('')
                  }}
                >
                  Dismiss
                </button>
              </div>
            )}
            <div className="actions-panel" data-tour="actions">
              <div className="actions-row">
                <span className="actions-title">Actions</span>
                <span className="actions-meta">{selectedCount} selected</span>
                <span className={`action-status ${actionStatus.state}`}>
                  {actionStatus.message || 'Ready'}
                </span>
                {actionSticky && actionStatus.state !== 'idle' && (
                  <button
                    className="btn small"
                    onClick={() => {
                      setActionStatus({ state: 'idle', message: '' })
                      setActionSticky(false)
                    }}
                    title="Clear the current status message."
                  >
                    Dismiss
                  </button>
                )}
              </div>
              <div className="actions-row">
                <span className="actions-meta">Verified: {stats.verified}</span>
                <span className="actions-meta">Pending: {stats.pending}</span>
                <span className="actions-meta">Failed: {failedCount}</span>
                <span className="actions-meta">Duplicates: {duplicateCount}</span>
                <label className="actions-meta" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                  <input
                    type="checkbox"
                    checked={autoMarkDuplicates}
                    onChange={e => setAutoMarkDuplicates(e.target.checked)}
                  />
                  Auto-mark duplicates
                </label>
              </div>
              <details className="action-section" open>
                <summary className="section-title">Step 1 — Choose a target</summary>
                <div className="section-desc">Pick a Question # range or select checkboxes. If you skip this, actions apply to all.</div>
                <div className="actions-row actions-split">
                  <div className="actions-left">
                    <input
                      type="number"
                      placeholder="Question # start"
                      value={bulkRangeStart}
                      onChange={e => setBulkRangeStart(e.target.value)}
                    />
                    <input
                      type="number"
                      placeholder="Question # end"
                      value={bulkRangeEnd}
                      onChange={e => setBulkRangeEnd(e.target.value)}
                    />
                  </div>
                  <div className="actions-groups">
                    <div className="actions-group">
                      <div className="actions-group-title">Range actions</div>
                      <div className="actions-group-body">
                        <button
                          className="btn small"
                          onClick={() => verifyBulk('range')}
                          disabled={actionStatus.state === 'working'}
                          title="Verify questions inside the Question # range."
                        >
                          Verify range
                        </button>
                        <button
                          className="btn small"
                          onClick={() => validateBulk('range')}
                          disabled={actionStatus.state === 'working'}
                          title="Validate questions inside the Question # range."
                        >
                          Validate range
                        </button>
                        <button
                          className="btn small"
                          onClick={() => commitBulk('range')}
                          disabled={actionStatus.state === 'working'}
                          title="Commit questions inside the Question # range to the database."
                        >
                          Commit range
                        </button>
                      </div>
                      <div className="actions-group-note">Uses Question # start/end.</div>
                    </div>
                    <div className="actions-group">
                      <div className="actions-group-title">Selected actions</div>
                      <div className="actions-group-body">
                        <button
                          className="btn small"
                          onClick={() => verifyBulk('selected')}
                          disabled={actionStatus.state === 'working' || selectedCount === 0}
                          title="Verify only the checked questions."
                        >
                          Verify selected
                        </button>
                        <button
                          className="btn small"
                          onClick={() => validateBulk('selected')}
                          disabled={actionStatus.state === 'working' || selectedCount === 0}
                          title="Validate only the checked questions."
                        >
                          Validate selected
                        </button>
                        <button
                          className="btn small"
                          onClick={() => commitBulk('selected')}
                          disabled={actionStatus.state === 'working' || selectedCount === 0}
                          title="Commit only the checked questions."
                        >
                          Commit selected
                        </button>
                      </div>
                      <div className="actions-group-note">Uses selected checkboxes.</div>
                    </div>
                  </div>
                </div>
              </details>
              <details className="action-section" open>
                <summary className="section-title">Step 2 — Batch actions (safe defaults)</summary>
                <div className="section-desc">Use these when you’re ready to validate/commit the whole batch.</div>
                <div className="actions-row">
                  <button className="btn small" onClick={() => validateBulk('all')} disabled={actionStatus.state === 'working'} title="Validate every verified question in the batch.">
                    Validate all
                  </button>
                  <button className="btn small" onClick={() => commitBulk('all')} disabled={actionStatus.state === 'working'} title="Commit all verified questions in the batch.">
                    Commit all
                  </button>
                  <button className="btn small" onClick={() => currentBatch && loadAllQuestions(currentBatch)} disabled={actionStatus.state === 'working' || !currentBatch || allLoading} title="Load all pages for search and bulk range actions.">
                    {allLoading ? 'Loading pages...' : 'Load all pages'}
                  </button>
                  <button className="btn small" onClick={verifyAllValid} disabled={actionStatus.state === 'working'} title="Verify every question that passes local checks.">
                    Verify all valid
                  </button>
                  <button className="btn small" onClick={addQuestion} disabled={actionStatus.state === 'working' || !currentBatch} title="Add a new empty question to this batch.">
                    Add question
                  </button>
                </div>
              </details>
              <details className="action-section" open>
                <summary className="section-title">Step 3 — Fix failed items only</summary>
                <div className="section-desc">Retry only the failed set after you review them.</div>
                <div className="actions-row">
                  <button className="btn small" onClick={() => selectFailedAndRun('validate')} disabled={actionStatus.state === 'working' || failedCount === 0} title="Retry validation for only the failed questions.">
                    Validate failed only
                  </button>
                  <button className="btn small" onClick={() => selectFailedAndRun('commit')} disabled={actionStatus.state === 'working' || failedCount === 0} title="Commit only the failed questions after review.">
                    Commit failed only
                  </button>
                  {validationErrors.length > 0 && (
                    <button className="btn small" onClick={downloadValidationErrors} title="Download CSV of validation failures.">
                      Download failed CSV
                    </button>
                  )}
                </div>
              </details>
            </div>
            <div className="bulk-metadata" data-tour="bulk-meta">
              {uiError && <div className="committed-error">{uiError}</div>}
              {uiNotice && <div className="committed-meta">{uiNotice}</div>}
              <details className="bulk-section" open>
                <summary className="section-title">Step 1 — Upload Answer Sheet</summary>
                <div className="section-desc">Upload the answer key sheet. It will auto-map answers for this batch.</div>
                <div className="bulk-row">
                  <label className="upload-label answer-upload" title="Upload an answer key sheet to auto-map answers.">
                    <span>Upload Answer Sheet</span>
                    <input
                      type="file"
                      accept=".png,.jpg,.jpeg,.pdf"
                      onChange={e => {
                        const f = e.target.files?.[0]
                        if (f) uploadAnswerKeyFile(f)
                      }}
                    />
                  </label>
                  {answerKeyStatus && <div className="answer-status">{answerKeyStatus}</div>}
                  {answerKeyDetected.count > 0 && (
                    <div className="answer-status">
                      Detected {answerKeyDetected.count} answers
                      {answerKeyDetected.min !== null && answerKeyDetected.max !== null
                        ? ` (Q${answerKeyDetected.min}–Q${answerKeyDetected.max})`
                        : ''}
                    </div>
                  )}
                </div>
                <div className="bulk-row">
                  <div className="field-stack">
                    <label className="field-label">Start page</label>
                    <input
                      type="number"
                      placeholder="e.g. 1"
                      value={answerKeyStartPage}
                      onChange={e => setAnswerKeyStartPage(e.target.value)}
                    />
                    <div className="field-help">First page that contains the answer key.</div>
                  </div>
                  <div className="field-stack">
                    <label className="field-label">End page</label>
                    <input
                      type="number"
                      placeholder="e.g. 6"
                      value={answerKeyMaxPages}
                      onChange={e => setAnswerKeyMaxPages(e.target.value)}
                    />
                    <div className="field-help">Last page that contains the answer key.</div>
                  </div>
                  <div className="field-stack">
                    <label className="field-label">Start question #</label>
                    <input
                      type="number"
                      placeholder="e.g. 1"
                      value={answerKeyMinQ}
                      onChange={e => setAnswerKeyMinQ(e.target.value)}
                    />
                    <div className="field-help">First question number in the key.</div>
                  </div>
                  <div className="field-stack">
                    <label className="field-label">End question #</label>
                    <input
                      type="number"
                      placeholder="e.g. 200"
                      value={answerKeyMaxQ}
                      onChange={e => setAnswerKeyMaxQ(e.target.value)}
                    />
                    <div className="field-help">Last question number in the key.</div>
                  </div>
                </div>
                <details className="advanced-details">
                  <summary>Advanced (OCR tuning)</summary>
                  <div className="bulk-row">
                    <div className="field-stack">
                      <label className="field-label">OCR DPI</label>
                      <input
                        type="number"
                        placeholder="300"
                        value={answerKeyOcrDpi}
                        onChange={e => setAnswerKeyOcrDpi(e.target.value)}
                      />
                      <div className="field-help">Leave at 300 unless OCR misses answers.</div>
                    </div>
                  </div>
                </details>
              </details>
              <details className="bulk-section" open>
                <summary className="section-title">Step 2 — Add Subject / Chapter / Topic / Exam / Facts</summary>
                <div className="section-desc">Fill once, then apply by question range, source page range, or all questions.</div>
                <div className="bulk-row">
                  <input
                    type="text"
                    placeholder="Subject"
                    value={bulkSubject}
                    onChange={e => setBulkSubject(e.target.value)}
                  />
                  <input
                    type="text"
                    placeholder="Chapter"
                    value={bulkChapter}
                    onChange={e => setBulkChapter(e.target.value)}
                  />
                  <input
                    type="text"
                    placeholder="Topic"
                    value={bulkTopic}
                    onChange={e => setBulkTopic(e.target.value)}
                  />
                  <select value={bulkExamType} onChange={e => setBulkExamType(e.target.value)}>
                    <option value="">Exam type</option>
                    <option value="neet">NEET</option>
                    <option value="jee">JEE</option>
                    <option value="jee advanced">JEE Advanced</option>
                  </select>
                  <input
                    type="number"
                    placeholder="Published year (e.g. 2024)"
                    value={bulkPublishedYear}
                    onChange={e => setBulkPublishedYear(e.target.value)}
                  />
                  <input
                    type="text"
                    placeholder="Question fact (e.g. NEET 2024, Shift 1)"
                    value={bulkQuestionFact}
                    onChange={e => setBulkQuestionFact(e.target.value)}
                  />
                  <input
                    type="text"
                    placeholder="Batch tag"
                    value={bulkTag}
                    onChange={e => setBulkTag(e.target.value)}
                  />
                  <button className="btn small" disabled={bulkBusy} onClick={() => applyBulkMetadata('all')} title="Apply Subject/Chapter/Topic/Exam/Tag to every question.">
                    Apply to all
                  </button>
                  <button className="btn small" disabled={bulkBusy} onClick={() => applyBulkMetadata('missing')} title="Apply metadata only where fields are missing.">
                    Apply to missing
                  </button>
                  <button className="btn small" disabled={bulkBusy || !currentBatch} onClick={addQuestion} title="Add a new empty question to this batch.">
                    Add question
                  </button>
                </div>
                <div className="bulk-row">
                  <input
                    type="number"
                    placeholder="Question # start"
                    value={bulkRangeStart}
                    onChange={e => setBulkRangeStart(e.target.value)}
                  />
                  <input
                    type="number"
                    placeholder="Question # end"
                    value={bulkRangeEnd}
                    onChange={e => setBulkRangeEnd(e.target.value)}
                  />
                  <button className="btn small" disabled={bulkBusy} onClick={() => applyBulkMetadata('range')} title="Apply metadata to the Question # range.">
                    Apply to question range
                  </button>
                </div>
                <div className="bulk-row">
                  <input
                    type="number"
                    placeholder="Source page start"
                    value={bulkPageStart}
                    onChange={e => setBulkPageStart(e.target.value)}
                  />
                  <input
                    type="number"
                    placeholder="Source page end"
                    value={bulkPageEnd}
                    onChange={e => setBulkPageEnd(e.target.value)}
                  />
                  <button className="btn small" disabled={bulkBusy} onClick={applyBulkMetadataByPageRange} title="Apply metadata to questions whose source page falls in this range.">
                    Apply to source page range
                  </button>
                </div>
              </details>
              <details className="bulk-section" open>
                <summary className="section-title">Step 3 — Save a template (optional)</summary>
                <div className="section-desc">Use this if you reuse the same Subject/Chapter/Topic again.</div>
                <div className="bulk-row">
                  <input
                    type="text"
                    placeholder="Template name"
                    value={bulkPresetName}
                    onChange={e => setBulkPresetName(e.target.value)}
                  />
                  <button className="btn small" disabled={bulkBusy} onClick={savePreset} title="Save the current metadata as a template.">
                    Save template
                  </button>
                  {bulkPresets.map(preset => (
                    <div key={preset.name} style={{ display: 'inline-flex', gap: '6px' }}>
                      <button className="btn small" onClick={() => applyPreset(preset)} title={`Apply preset ${preset.name}.`}>
                        {preset.name}
                      </button>
                      <button className="btn small" onClick={() => removePreset(preset.name)} title={`Delete preset ${preset.name}.`}>
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              </details>
              <details className="bulk-section" open>
                <summary className="section-title">Step 4 — Apply to a Question # range (optional)</summary>
                <div className="section-desc">Use this when you only want a specific block of questions.</div>
                <div className="bulk-row">
                  <input
                    type="number"
                    placeholder="Question # start"
                    value={bulkRangeStart}
                    onChange={e => setBulkRangeStart(e.target.value)}
                  />
                  <input
                    type="number"
                    placeholder="Question # end"
                    value={bulkRangeEnd}
                    onChange={e => setBulkRangeEnd(e.target.value)}
                  />
                  <button className="btn small" disabled={bulkBusy} onClick={() => applyBulkMetadata('range')} title="Apply metadata to the Question # range.">
                    Apply to range (question #)
                  </button>
                </div>
                <div className="bulk-row">
                  <input
                    type="number"
                    placeholder="Source page start"
                    value={bulkPageStart}
                    onChange={e => setBulkPageStart(e.target.value)}
                  />
                  <input
                    type="number"
                    placeholder="Source page end"
                    value={bulkPageEnd}
                    onChange={e => setBulkPageEnd(e.target.value)}
                  />
                  <button className="btn small" disabled={bulkBusy} onClick={applyBulkMetadataByPageRange} title="Apply metadata to questions whose source page falls in this range.">
                    Apply to page range
                  </button>
                  <button
                    className="btn small"
                    onClick={() => setSelectedIds(new Set(filteredQuestions.map((q: Question) => q.question_id)))}
                    title="Select all questions currently visible on screen."
                  >
                    Select current page
                  </button>
                  <button className="btn small" onClick={() => setSelectedIds(new Set())} title="Clear all selected questions.">
                    Clear selection
                  </button>
                </div>
              </details>
              <div ref={questionsAnchorRef} className="bulk-section">
                <div className="section-title">Questions ({filteredQuestions.length} loaded)</div>
                <div className="section-desc">Questions appear here as they are processed. Use the page selector to navigate.</div>
                <div className="filters" style={{ marginTop: '10px' }}>
                  <span className="actions-meta">Source pages: {sourcePages.length}</span>
                  <select
                    value={sourcePage ?? ''}
                    onChange={e => {
                      const value = e.target.value
                      userSetPageRef.current = true
                      setSourcePage(value ? Number(value) : null)
                    }}
                  >
                    <option value="">All pages</option>
                    {sourcePages.map(p => (
                      <option key={p} value={p}>Page {p}</option>
                    ))}
                  </select>
                  <button
                    className="btn small"
                    onClick={() => {
                      if (!sourcePages.length) return
                      const idx = sourcePage ? sourcePages.indexOf(sourcePage) : 0
                      const next = sourcePages[Math.max(0, idx - 1)]
                      userSetPageRef.current = true
                      setSourcePage(next)
                    }}
                    disabled={!sourcePages.length}
                  >
                    Prev page
                  </button>
                  <button
                    className="btn small"
                    onClick={() => {
                      if (!sourcePages.length) return
                      const idx = sourcePage ? sourcePages.indexOf(sourcePage) : -1
                      const next = sourcePages[Math.min(sourcePages.length - 1, idx + 1)]
                      userSetPageRef.current = true
                      setSourcePage(next)
                    }}
                    disabled={!sourcePages.length}
                  >
                    Next page
                  </button>
                  <button className="btn small" onClick={() => currentBatch && loadAllQuestions(currentBatch)} disabled={!currentBatch || allLoading}>
                    {allLoading ? 'Loading...' : 'Load all pages'}
                  </button>
                </div>
              </div>
              <div className="filters" data-tour="filters">
                <button className={`filter-pill ${filter === 'all' ? 'active' : ''}`} onClick={() => setFilter('all')}>
                  All
                </button>
                <button className={`filter-pill ${filter === 'pending' ? 'active' : ''}`} onClick={() => setFilter('pending')}>
                  Pending
                </button>
                <button className={`filter-pill ${filter === 'verified' ? 'active' : ''}`} onClick={() => setFilter('verified')}>
                  Verified
                </button>
                <button className={`filter-pill ${validationFilter === 'failed' ? 'active' : ''}`} onClick={() => setValidationFilter('failed')}>
                  Failed
                </button>
                <button className={`filter-pill ${validationFilter === 'valid' ? 'active' : ''}`} onClick={() => setValidationFilter('valid')}>
                  Valid
                </button>
                <button className={`filter-pill ${validationFilter === 'all' ? 'active' : ''}`} onClick={() => setValidationFilter('all')}>
                  Validation: All
                </button>
                <label className="filter-pill" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                  <input
                    type="checkbox"
                    checked={filterMissingAssets}
                    onChange={e => setFilterMissingAssets(e.target.checked)}
                  />
                  Missing assets
                </label>
                <select
                  value={filterExamType}
                  onChange={e => setFilterExamType(e.target.value)}
                >
                  <option value="">All exams</option>
                  <option value="neet">NEET</option>
                  <option value="jee">JEE</option>
                  <option value="jee advanced">JEE Advanced</option>
                </select>
              </div>
              {hasHiddenQuestions && (
                <div className="status-banner notice" style={{ marginTop: '12px' }}>
                  <span>Questions exist but are hidden by filters. Click “All” or choose a page.</span>
                  <button className="btn small" onClick={() => { setFilter('all'); setValidationFilter('all'); setFilterExamType(''); setFilterMissingAssets(false); setSourcePage(null); }}>
                    Show all
                  </button>
                </div>
              )}
              <div className="questions">
                {filteredQuestions.length === 0 ? (
                  <div style={{ color: '#94a3b8', padding: '12px 4px' }}>
                    No questions yet. This batch is still processing.
                  </div>
                ) : (
                  filteredQuestions.map((q: Question, idx: number) => {
                    const pageImages = pageImagesByPage[q.source_page] || []
                    return (
                      <QuestionCard
                        key={q.question_id}
                        question={q}
                        index={idx}
                        batchId={currentBatch || ''}
                        difficultyTypes={difficultyTypes}
                        assetUrl={assetUrl}
                        onUploadAsset={uploadAsset}
                        onVerify={() => verifyQuestion(q.question_id)}
                        onReject={() => rejectQuestion(q.question_id)}
                        onUpdate={(patch) => updateQuestion(q.question_id, patch)}
                        onToggleCorrect={(letter) => toggleCorrect(q.question_id, letter)}
                        onApplyAnswer={() => applyAnswerToQuestion(q)}
                        onDelete={() => deleteDraftQuestion(q.question_id)}
                        selected={selectedIds.has(q.question_id)}
                        onToggleSelect={() => {
                          setSelectedIds(prev => {
                            const next = new Set(prev)
                            if (next.has(q.question_id)) {
                              next.delete(q.question_id)
                            } else {
                              next.add(q.question_id)
                            }
                            return next
                          })
                        }}
                        pageImages={pageImages}
                      />
                    )
                  })
                )}
              </div>
            </div>
            {showValidation && (
              <div className="validation-modal">
                <div className="validation-card">
                  <div className="validation-title">Validation Results</div>
                  {validationResult && (
                    <div className="validation-summary">
                      <span>Valid: {validationResult.validCount ?? 0}</span>
                      <span>Failed: {validationResult.failedCount ?? 0}</span>
                      <span>Skipped: {validationResult.skippedCount ?? 0}</span>
                    </div>
                  )}
                  {validationErrors.length > 0 && (
                    <div style={{ marginTop: '10px', fontSize: '12px', color: '#cbd5f5' }}>
                      <div style={{ marginBottom: '6px' }}>Failed reasons (first 20):</div>
                      <div style={{ maxHeight: '200px', overflowY: 'auto', paddingRight: '6px' }}>
                        {validationErrors.slice(0, 20).map((e: any, idx: number) => {
                          const info = formatValidationError(e, lastValidationQuestions[e?.index ?? -1])
                          return (
                            <div key={`valerr-${idx}`} style={{ marginBottom: '6px' }}>
                              Page {info.page ?? '?'} · Q{info.qnum ?? '?'} · {info.field}: {info.message}
                            </div>
                          )
                        })}
                      </div>
                      <button className="btn small" onClick={downloadValidationErrors} style={{ marginTop: '10px' }}>
                        Download failed CSV
                      </button>
                    </div>
                  )}
                  <button onClick={() => setShowValidation(false)} style={{ marginTop: '16px', padding: '10px 24px', background: '#6366f1', border: 'none', borderRadius: '8px', color: '#fff', cursor: 'pointer' }}>
                    Close
                  </button>
                </div>
              </div>
            )}
          </main>
        </div>
      )}

      {viewMode === 'review' && (
      <footer style={{ position: 'fixed', bottom: 0, left: 0, right: 0, background: 'rgba(0,0,0,0.85)', padding: '16px 32px', display: 'flex', alignItems: 'center', gap: '16px', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
        <div style={{ flex: 1, textAlign: 'center', color: '#888' }}>
          {stats.verified} verified - {stats.pending} pending
        </div>
      </footer>
      )}
      </div>
    </div>
  )
}

interface QuestionCardProps {
  question: Question
  index: number
  batchId: string
  difficultyTypes: string[]
  assetUrl: (name?: string) => string
  onUploadAsset: (file: File) => Promise<string | null>
  onVerify: () => void
  onReject: () => void
  onUpdate: (patch: Partial<Question>) => void
  onToggleCorrect: (letter: string) => void
  onApplyAnswer: () => void
  onDelete: () => void
  selected: boolean
  onToggleSelect: () => void
  pageImages: { id: string; filename: string }[]
}

function QuestionCard({ question: q, index, batchId, difficultyTypes, assetUrl, onUploadAsset, onVerify, onReject, onUpdate, onToggleCorrect, onApplyAnswer, onDelete, selected, onToggleSelect, pageImages }: QuestionCardProps) {
  const [editMode, setEditMode] = useState(false)
  const [text, setText] = useState(q.questionText)
  const [explanation, setExplanation] = useState(q.explanation || '')
  const [options, setOptions] = useState<Option[]>(q.options || [])
  const [subject, setSubject] = useState((q as any).subject_name || '')
  const [chapter, setChapter] = useState((q as any).chapter_name || '')
  const [topic, setTopic] = useState((q as any).topic_name || '')
  const [examType, setExamType] = useState((q as any).exam_type || '')
  const [publishedYear, setPublishedYear] = useState((q as any).published_year ? String((q as any).published_year) : '')
  const [questionFact, setQuestionFact] = useState((q as any).question_fact || '')
  const [difficultyType, setDifficultyType] = useState(q.difficulty_type || '')
  const [level, setLevel] = useState(q.difficulty_level ? String(q.difficulty_level) : '')
  const [questionType, setQuestionType] = useState((q as any).questionType || (q as any).question_type || 'single_correct')
  const correctLetters = (q.correct_option_letters ? String(q.correct_option_letters) : '')
    .split(',')
    .map(l => l.trim().toUpperCase())
    .filter(Boolean)
  const optionLetters = (q.options || []).map(o => String(o.letter).toUpperCase())
  const numericOptions = optionLetters.length > 0 && optionLetters.every(l => ['1', '2', '3', '4'].includes(l))
  const correctSet = new Set<string>()
  const mapToNum: Record<string, string> = { A: '1', B: '2', C: '3', D: '4' }
  for (const c of correctLetters) {
    correctSet.add(c)
    if (numericOptions && mapToNum[c]) {
      correctSet.add(mapToNum[c])
    }
  }

  useEffect(() => {
    if (!editMode) {
      setDifficultyType(q.difficulty_type || '')
      setLevel(q.difficulty_level ? String(q.difficulty_level) : '')
      setQuestionType((q as any).questionType || (q as any).question_type || 'single_correct')
    }
  }, [q.difficulty_level, q.difficulty_type, editMode])

  useEffect(() => {
    if (!editMode) {
      setText(q.questionText)
      setExplanation(q.explanation || '')
      setOptions(q.options || [])
      setSubject((q as any).subject_name || '')
      setChapter((q as any).chapter_name || '')
      setTopic((q as any).topic_name || '')
      setExamType((q as any).exam_type || '')
      setPublishedYear((q as any).published_year ? String((q as any).published_year) : '')
      setQuestionFact((q as any).question_fact || '')
    }
  }, [q.questionText, q.explanation, q.options, q.subject_name, q.chapter_name, q.topic_name, q.exam_type, (q as any).published_year, (q as any).question_fact, editMode])

  function updateOptionText(letter: string, value: string) {
    setOptions(prev => prev.map(o => (o.letter === letter ? { ...o, text: value } : o)))
  }

  function addOption() {
    setOptions(prev => {
      const letters = prev.map(o => String(o.letter).toUpperCase())
      const numeric = letters.length > 0 && letters.every(l => ['1', '2', '3', '4'].includes(l))
      let nextLetter = ''
      if (numeric) {
        const nums = letters.map(l => parseInt(l, 10)).filter(n => Number.isFinite(n))
        const nextNum = (nums.length ? Math.max(...nums) : 0) + 1
        nextLetter = String(nextNum)
      } else {
        const base = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
        const idx = letters.length > 0 ? Math.min(letters.length, base.length - 1) : 0
        nextLetter = base[idx]
      }
      return [...prev, { letter: nextLetter, text: '', is_correct: false }]
    })
  }

  function normalizeImageListLocal(value?: string | string[]) {
    if (Array.isArray(value)) return value.filter(Boolean)
    if (typeof value === 'string' && value) return [value]
    return []
  }

  function attachQuestionImage(name: string) {
    const list = normalizeImageListLocal(q.image_urls || q.image_url)
    const next = list.includes(name) ? list : [...list, name]
    onUpdate({ image_urls: next } as any)
  }

  function attachExplanationImage(name: string) {
    const list = normalizeImageListLocal(q.explanation_images || q.explanation_image)
    const next = list.includes(name) ? list : [...list, name]
    onUpdate({ explanation_images: next } as any)
  }

  function attachOptionImageToLetter(letter: string, name: string) {
    const nextOptions = options.map(o => {
      if (o.letter !== letter) return o
      const list = normalizeImageListLocal(o.image_urls || o.image_url)
      const next = list.includes(name) ? list : [...list, name]
      return { ...o, image_urls: next }
    })
    setOptions(nextOptions)
    onUpdate({ options: nextOptions } as any)
  }

  function removeQuestionImage(name: string) {
    const list = normalizeImageListLocal(q.image_urls || q.image_url)
    const next = list.filter(n => n !== name)
    onUpdate({ image_urls: next } as any)
  }

  function removeExplanationImage(name: string) {
    const list = normalizeImageListLocal(q.explanation_images || q.explanation_image)
    const next = list.filter(n => n !== name)
    onUpdate({ explanation_images: next } as any)
  }

  function removeOptionImage(letter: string, name: string) {
    const nextOptions = options.map(o => {
      if (o.letter !== letter) return o
      const list = normalizeImageListLocal(o.image_urls || o.image_url)
      const next = list.filter(n => n !== name)
      return { ...o, image_urls: next }
    })
    setOptions(nextOptions)
    onUpdate({ options: nextOptions } as any)
  }

  function saveChanges() {
    const normalizedDiffType = difficultyType.trim()
    const difficultyValue = normalizedDiffType && normalizedDiffType.toLowerCase() !== 'unknown' ? normalizedDiffType : null
    const yearRaw = publishedYear.trim()
    const hasYear = yearRaw.length > 0
    const parsedYear = Number(yearRaw)
    if (hasYear && (!Number.isFinite(parsedYear) || parsedYear < 1900 || parsedYear > 2100)) {
      alert('Enter a valid publication year (1900-2100).')
      return
    }
    onUpdate({
      questionText: text,
      explanation,
      subject_name: subject,
      chapter_name: chapter,
      topic_name: topic,
      exam_type: examType.trim(),
      published_year: hasYear && Number.isFinite(parsedYear) ? Math.trunc(parsedYear) : null,
      question_fact: questionFact.trim(),
      difficulty_type: difficultyValue,
      difficulty_level: level ? Number(level) : null,
      questionType: (questionType || 'single_correct').trim().toLowerCase(),
      options
    } as any)
    setEditMode(false)
  }

  async function handleQuestionImage(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const name = await onUploadAsset(file)
    if (name) attachQuestionImage(name)
  }

  async function handleExplanationImage(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const name = await onUploadAsset(file)
    if (name) attachExplanationImage(name)
  }

  async function handleOptionImage(letter: string, e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const name = await onUploadAsset(file)
    if (!name) return
    const source = editMode ? options : q.options
    const nextOptions = source.map(o => {
      if (o.letter !== letter) return o
      const list = normalizeImageListLocal(o.image_urls || o.image_url)
      const next = list.includes(name) ? list : [...list, name]
      return { ...o, image_urls: next }
    })
    setOptions(nextOptions)
    onUpdate({ options: nextOptions } as any)
  }

  return (
      <div className={`question-card ${q.verification_state}`}>
        <div className="question-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <input type="checkbox" checked={selected} onChange={onToggleSelect} />
            <span className="q-number">Q{(q as any).questionNumber || index + 1}</span>
          </div>
          <div className="badges">
            <span className="badge type">{((q as any).questionType || (q as any).question_type || 'single_correct') as any}</span>
            <span className="badge type">{q.difficulty_type || 'unknown'}</span>
            <span className="badge level">Level {q.difficulty_level || '?'}</span>
            {q.exam_type && <span className="badge type">{q.exam_type}</span>}
            {(q as any).published_year && <span className="badge level">Year {(q as any).published_year}</span>}
            <span className={`badge state ${q.verification_state}`}>{q.verification_state}</span>
            <span className="badge page">Page {q.source_page}</span>
            {q.correct_option_letters && (
              <span className="badge level">Answer: {q.correct_option_letters}</span>
            )}
          </div>
        </div>

        {q.verification_state === 'rejected' && (q as any).reject_reason && (
          <div className="reject-reason">
            Reject reason: {(q as any).reject_reason}
          </div>
        )}

            {normalizeImageListLocal(q.image_urls || q.image_url).map((img, idx) => (
              <div key={`${img}-${idx}`} style={{ display: 'inline-flex', flexDirection: 'column', gap: '6px', marginRight: '8px' }}>
                <img src={assetUrl(img)} className="question-image" alt="question visual" />
                {editMode && (
                  <button className="btn small" onClick={() => removeQuestionImage(img)}>
                    Remove question image
                  </button>
                )}
              </div>
            ))}

      {editMode ? (
        <textarea value={text} onChange={e => setText(e.target.value)} placeholder="Enter question text..." />
      ) : (
        <p className="question-text">{q.questionText}</p>
      )}
      {!editMode && (q as any).question_fact && (
        <p className="question-text" style={{ opacity: 0.85 }}>
          Fact: {(q as any).question_fact}
        </p>
      )}

      <div className="meta-row">
        {editMode ? (
          <>
            <select value={questionType} onChange={e => setQuestionType(e.target.value)}>
              <option value="single_correct">single_correct</option>
              <option value="multiple_correct">multiple_correct</option>
              <option value="assertion_and_reason">assertion_and_reason</option>
              <option value="matching">matching</option>
              <option value="statements">statements</option>
              <option value="numerical">numerical</option>
            </select>
            <input
              type="text"
              value={subject}
              onChange={e => setSubject(e.target.value)}
              placeholder="Subject"
            />
            <input
              type="text"
              value={chapter}
              onChange={e => setChapter(e.target.value)}
              placeholder="Chapter"
            />
            <input
              type="text"
              value={topic}
              onChange={e => setTopic(e.target.value)}
              placeholder="Topic"
            />
            <select value={examType} onChange={e => setExamType(e.target.value)}>
              <option value="">Exam type</option>
              <option value="neet">NEET</option>
              <option value="jee">JEE</option>
              <option value="jee advanced">JEE Advanced</option>
            </select>
            <input
              type="number"
              value={publishedYear}
              onChange={e => setPublishedYear(e.target.value)}
              placeholder="Published year"
            />
            <input
              type="text"
              value={questionFact}
              onChange={e => setQuestionFact(e.target.value)}
              placeholder="Question fact (year/shift/source)"
            />
            <input
              type="number"
              value={level}
              onChange={e => setLevel(e.target.value)}
              placeholder="Level"
            />
            <select
              value={difficultyType}
              onChange={e => setDifficultyType(e.target.value)}
            >
              <option value="">Difficulty type</option>
              {difficultyTypes.map(type => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
              <option value="unknown">unknown</option>
            </select>
          </>
        ) : (
          <div className="committed-meta">
            {(q as any).subject_name || 'subject?'} / {(q as any).chapter_name || 'chapter?'} / {(q as any).topic_name || 'topic?'} / {(q as any).exam_type || 'exam?'} / {(q as any).published_year || 'year?'}
            {(q as any).question_fact ? ` / ${(q as any).question_fact}` : ''}
          </div>
        )}
        <label className="btn" title="Upload or replace the main question image.">
          Upload question image
          <input type="file" accept="image/*" onChange={handleQuestionImage} style={{ display: 'none' }} />
        </label>
      </div>

      <div className="options">
        {(editMode ? options : q.options).map(o => (
          <div
            key={o.letter}
            className={`option ${(o.is_correct || (!editMode && correctSet.has(String(o.letter).toUpperCase()))) ? 'correct' : ''}`}
          >
            <input
              type="checkbox"
              checked={o.is_correct || (!editMode && correctSet.has(String(o.letter).toUpperCase()))}
              onChange={() => onToggleCorrect(o.letter)}
            />
            <span className="letter">{o.letter}</span>
            {editMode ? (
              <input
                className="option-text"
                value={o.text}
                onChange={e => updateOptionText(o.letter, e.target.value)}
              />
            ) : (
              <span className="option-text">{o.text}</span>
            )}
            {normalizeImageListLocal(o.image_urls || o.image_url).map((img, idx) => (
              <img key={`${img}-${idx}`} src={assetUrl(img)} className="option-image" alt="option" />
            ))}
            <label className="btn small" title="Upload an image for this option.">
              Upload option image
              <input type="file" accept="image/*" onChange={(e) => handleOptionImage(o.letter, e)} style={{ display: 'none' }} />
            </label>
            {editMode && normalizeImageListLocal(o.image_urls || o.image_url).map((img, idx) => (
              <button key={`${img}-${idx}`} className="btn small" onClick={() => removeOptionImage(o.letter, img)} title="Remove this option image.">
                Remove option image
              </button>
            ))}
          </div>
        ))}
        {editMode && (
          <button className="btn small" onClick={addOption} title="Add a new option choice.">
            Add option
          </button>
        )}
      </div>

      <div className="meta-row">
        {editMode ? (
          <textarea value={explanation} onChange={e => setExplanation(e.target.value)} placeholder="Explanation..." />
        ) : (
          explanation && <p className="question-text">{explanation}</p>
        )}
        <label className="btn" title="Upload an explanation image for this question.">
          Upload explanation image
          <input type="file" accept="image/*" onChange={handleExplanationImage} style={{ display: 'none' }} />
        </label>
        {normalizeImageListLocal(q.explanation_images || q.explanation_image).map((img, idx) => (
          <div key={`${img}-${idx}`} style={{ display: 'inline-flex', flexDirection: 'column', gap: '6px', marginRight: '8px' }}>
            {editMode && (
              <button className="btn small" onClick={() => removeExplanationImage(img)} title="Remove this explanation image.">
                Remove explanation image
              </button>
            )}
            <img src={assetUrl(img)} className="question-image" alt="explanation" />
          </div>
        ))}
      </div>
      {pageImages.length > 0 && (
        <div className="meta-row">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '100%' }}>
            <div style={{ fontSize: '12px', color: '#9ca3af' }}>Page visuals (click to attach)</div>
            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
              {pageImages.map(img => (
                <div key={img.id} style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <img src={assetUrl(img.filename)} style={{ width: '120px', borderRadius: '8px' }} alt="page asset" />
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                    <button className="btn small" onClick={() => attachQuestionImage(img.filename)} title="Use this asset as the question image.">
                      Use for question
                    </button>
                    <button className="btn small" onClick={() => attachExplanationImage(img.filename)} title="Use this asset as the explanation image.">
                      Use for explanation
                    </button>
                  </div>
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                    {options.map(o => (
                      <button key={o.letter} className="btn small" onClick={() => attachOptionImageToLetter(o.letter, img.filename)} title={`Use this asset for option ${o.letter}.`}>
                        Use for {o.letter}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
      <div className="actions">
        {editMode ? (
          <>
            <button className="btn save" onClick={saveChanges} title="Save edits for this question.">Save</button>
            <button className="btn cancel" onClick={() => setEditMode(false)} title="Discard edits and exit edit mode.">Cancel</button>
          </>
        ) : (
          <>
            <button className="btn edit" onClick={() => setEditMode(true)} title="Edit question text, options, and metadata.">Edit</button>
            <button className="btn edit" onClick={() => setEditMode(true)} title="Edit explanation text or images.">Edit Explanation</button>
          </>
        )}
        <button className="btn verify" onClick={onVerify} title="Mark this question as verified.">Verify</button>
        <button className="btn reject" onClick={onReject} title="Mark this question as rejected.">Reject</button>
        <button className="btn reject" onClick={onDelete} title="Delete this question from the batch.">Delete</button>
      </div>
    </div>
  )
}

export default ReviewApp

interface CommittedCardProps {
  question: CommittedQuestion
  isEditing: boolean
  editValue: CommittedQuestion | null
  difficultyTypes: string[]
  onEdit: () => void
  onCancel: () => void
  onChange: (q: CommittedQuestion | null) => void
  onSave: () => void
  onDelete: () => void
  error: string
  assetUrl: (key?: string) => string
  onUploadAsset: (questionId: number, file: File) => Promise<string | null>
}

function CommittedQuestionCard({ question: q, isEditing, editValue, difficultyTypes, onEdit, onCancel, onChange, onSave, onDelete, error, assetUrl, onUploadAsset }: CommittedCardProps) {
  const options = Array.isArray(q.options) ? q.options : []
  const active = isEditing ? editValue || q : q
  const activeOptions = Array.isArray(active.options) ? active.options : []

  function updateOption(index: number, patch: Partial<Option>) {
    const next = activeOptions.map((o, i) => (i === index ? { ...o, ...patch } : o))
    onChange({ ...(active as any), options: next })
  }

  function optionImageKey(o: Option) {
    return o.image_url || o.imageKey || o.image_key || ''
  }

  async function handleCommittedQuestionImage(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !q.id) return
    const key = await onUploadAsset(q.id, file)
    if (key) onChange({ ...(active as any), question_image_key: key })
  }

  async function handleCommittedExplanationImage(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !q.id) return
    const key = await onUploadAsset(q.id, file)
    if (key) onChange({ ...(active as any), explanation_image_key: key })
  }

  async function handleCommittedOptionImage(index: number, e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !q.id) return
    const key = await onUploadAsset(q.id, file)
    if (!key) return
    updateOption(index, { imageKey: key })
  }

  return (
    <div className="question-card committed-card">
      <div className="question-header">
        <span className="q-number">ID {q.id || '-'}</span>
        <div className="badges">
          <span className="badge type">{q.difficulty_type || 'unknown'}</span>
          <span className="badge level">Level {q.difficulty_level || '?'}</span>
          <span className="badge page">{q.question_type || 'single_correct'}</span>
        </div>
      </div>

      {isEditing ? (
        <textarea
          value={(active.question_text || '') as any}
          onChange={e => onChange({ ...(active as any), question_text: e.target.value })}
          placeholder="Question text"
        />
      ) : (
        <p className="question-text">{q.question_text || 'Untitled'}</p>
      )}

      {q.question_image_key && <img src={assetUrl(q.question_image_key)} className="question-image" alt="question" />}

      <div className="meta-row">
        {isEditing ? (
          <>
            <input
              type="text"
              value={(active.subject_name || '') as any}
              onChange={e => onChange({ ...(active as any), subject_name: e.target.value })}
              placeholder="Subject"
            />
            <input
              type="text"
              value={(active.chapter_name || '') as any}
              onChange={e => onChange({ ...(active as any), chapter_name: e.target.value })}
              placeholder="Chapter"
            />
            <input
              type="text"
              value={(active.topic_name || '') as any}
              onChange={e => onChange({ ...(active as any), topic_name: e.target.value })}
              placeholder="Topic"
            />
          <select
            value={(active.difficulty_type || '') as any}
            onChange={e => onChange({ ...(active as any), difficulty_type: e.target.value })}
          >
            <option value="">Difficulty type</option>
            {difficultyTypes.map(type => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
            <option value="unknown">unknown</option>
          </select>
            <input
              type="number"
              value={(active.difficulty_level || '') as any}
              onChange={e => onChange({ ...(active as any), difficulty_level: Number(e.target.value) || null })}
              placeholder="Level"
            />
          </>
        ) : (
          <div className="committed-meta">
            {q.subject_name || 'subject?'} / {q.chapter_name || 'chapter?'} / {q.topic_name || 'topic?'}
          </div>
        )}
      </div>

      <div className="options">
        {options.length === 0 && <div style={{ color: '#888' }}>No options found.</div>}
        {options.map((o, idx) => (
          <div key={idx} className={`option ${o.is_correct ? 'correct' : ''}`}>
            <input
              type="checkbox"
              checked={o.is_correct}
              onChange={() => updateOption(idx, { is_correct: !o.is_correct })}
              disabled={!isEditing}
            />
            <span className="letter">{o.letter}</span>
            {isEditing ? (
              <input
                type="text"
                value={(activeOptions[idx]?.text || '') as any}
                onChange={e => updateOption(idx, { text: e.target.value })}
                placeholder="Option text"
              />
            ) : (
              <span className="option-text">{o.text}</span>
            )}
            {optionImageKey(o) && <img src={assetUrl(optionImageKey(o))} className="option-image" alt="option" />}
            {isEditing && (
              <label className="btn small" title="Upload an image for this option.">
                Upload option image
                <input type="file" accept="image/*" onChange={(e) => handleCommittedOptionImage(idx, e)} style={{ display: 'none' }} />
              </label>
            )}
          </div>
        ))}
      </div>

      <div className="meta-row">
        {isEditing ? (
          <textarea
            value={(active.explanation_text || '') as any}
            onChange={e => onChange({ ...(active as any), explanation_text: e.target.value })}
            placeholder="Explanation..."
          />
        ) : (
          q.explanation_text && <p className="question-text">{q.explanation_text}</p>
        )}
        {q.explanation_image_key && <img src={assetUrl(q.explanation_image_key)} className="question-image" alt="explanation" />}
      </div>

      {error && isEditing && <div className="committed-error">{error}</div>}
      <div className="actions">
        {isEditing ? (
          <>
            <button className="btn save" onClick={onSave} title="Save edits to this committed question.">Save</button>
            <button className="btn cancel" onClick={onCancel} title="Discard edits and exit edit mode.">Cancel</button>
            <label className="btn small" title="Upload or replace the committed question image.">
              Upload question image
              <input type="file" accept="image/*" onChange={handleCommittedQuestionImage} style={{ display: 'none' }} />
            </label>
            <label className="btn small" title="Upload or replace the committed explanation image.">
              Upload explanation image
              <input type="file" accept="image/*" onChange={handleCommittedExplanationImage} style={{ display: 'none' }} />
            </label>
          </>
        ) : (
          <>
            <button className="btn edit" onClick={onEdit} title="Edit this committed question.">Edit</button>
            <button className="btn edit" onClick={onEdit} title="Edit explanation text or images.">Edit Explanation</button>
          </>
        )}
        <button className="btn reject" onClick={onDelete} title="Delete this committed question.">Delete</button>
      </div>
    </div>
  )
}











