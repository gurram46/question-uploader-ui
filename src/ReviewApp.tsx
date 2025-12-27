/* eslint-disable no-alert, no-restricted-globals, security/detect-object-injection, @typescript-eslint/no-unused-vars */
import { useEffect, useRef, useState } from 'react'
import './ReviewApp.css'

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
  image_url?: string
  image_urls?: string[]
  explanation?: string
  explanation_image?: string
  explanation_images?: string[]
  correct_option_letters?: string | null
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
  status: string
  total_questions: number
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
  difficulty_level?: number
  difficulty_type?: string
  question_type?: string
  question_image_key?: string
  explanation_image_key?: string
  explanation_text?: string
  options?: Option[] | string
}

const API_URL = 'http://localhost:8000'

type ReviewAppProps = {
  bootToken?: string
  bootUser?: string
}

function ReviewApp({ bootToken, bootUser }: ReviewAppProps) {
  const [batches, setBatches] = useState<BatchSummary[]>([])
  const [currentBatch, setCurrentBatch] = useState<string | null>(null)
  const [draft, setDraft] = useState<Draft | null>(null)
  const [filter, setFilter] = useState<string>('all')
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState('')
  const [expressUrl, setExpressUrl] = useState('http://localhost:3000')
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null)
  const [showValidation, setShowValidation] = useState(false)
  const [lastValidationQuestions, setLastValidationQuestions] = useState<Question[]>([])
  const [validationFilter, setValidationFilter] = useState<'all' | 'failed' | 'valid'>('all')
  const [validationFailedIds, setValidationFailedIds] = useState<Set<string>>(new Set())
  const [validationValidIds, setValidationValidIds] = useState<Set<string>>(new Set())
  const [validationErrors, setValidationErrors] = useState<any[]>([])
  const [committed, setCommitted] = useState<CommittedQuestion[]>([])
  const [committedBatch, setCommittedBatch] = useState('')
  const [viewMode, setViewMode] = useState<'review' | 'committed'>('review')
  const [committedEditId, setCommittedEditId] = useState<number | null>(null)
  const [committedEdit, setCommittedEdit] = useState<CommittedQuestion | null>(null)
  const [committedError, setCommittedError] = useState('')
  const [bulkSubject, setBulkSubject] = useState('')
  const [bulkChapter, setBulkChapter] = useState('')
  const [bulkTopic, setBulkTopic] = useState('')
  const [bulkRangeStart, setBulkRangeStart] = useState('')
  const [bulkRangeEnd, setBulkRangeEnd] = useState('')
  const [bulkBusy, setBulkBusy] = useState(false)
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
  const [answerKeyMaxPages, setAnswerKeyMaxPages] = useState('20')
  const [answerKeyMaxQ, setAnswerKeyMaxQ] = useState('300')
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
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  // Auth state
  const [isLoggedIn, setIsLoggedIn] = useState(!!localStorage.getItem('token'))
  const [token, setToken] = useState(localStorage.getItem('token') || '')
  const [username, setUsername] = useState(localStorage.getItem('username') || '')
  const [loginError, setLoginError] = useState('')

  useEffect(() => {
    if (bootToken) {
      localStorage.setItem('token', bootToken)
      setToken(bootToken)
      setIsLoggedIn(true)
      if (bootUser) {
        localStorage.setItem('username', bootUser)
        setUsername(bootUser)
      }
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
      setLoginError('')
      const cleanUrl = `${window.location.origin}${window.location.pathname}`
      window.history.replaceState({}, '', cleanUrl)
    }
  }, [])

  useEffect(() => {
    if (!allQuestions) return
    if (answerKeyMaxQ && answerKeyMaxQ !== '300') return
    let maxNum = 0
    for (const q of allQuestions) {
      const num = Number((q as any).questionNumber || (q as any).question_number)
      if (Number.isFinite(num) && num > maxNum) maxNum = num
    }
    if (maxNum > 0) setAnswerKeyMaxQ(String(maxNum))
  }, [allQuestions, answerKeyMaxQ])

  useEffect(() => {
    const key = 'dq_review_tour_done'
    if (!localStorage.getItem(key)) {
      setTourOpen(true)
      setTourStep(0)
    }
  }, [])

  function authHeaders(): Record<string, string> {
    return token ? { Authorization: `Bearer ${token}` } : {}
  }

  async function handleLogin(user: string, pass: string) {
    try {
      const res = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: user, password: pass })
      })
      if (!res.ok) {
        setLoginError('Invalid credentials')
        return
      }
      const data = await res.json()
      localStorage.setItem('token', data.token)
      localStorage.setItem('username', data.username)
      setToken(data.token)
      setUsername(data.username)
      setIsLoggedIn(true)
      setLoginError('')
    } catch {
      setLoginError('Login failed')
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
    const base = allQuestions || (draft?.questions || [])
    const pages = Array.from(
      new Set(base.map(q => q.source_page).filter(n => Number.isFinite(n)))
    ).sort((a, b) => a - b)
    if (!pages.length) {
      setSourcePage(null)
      return
    }
    if (sourcePage === null || !pages.includes(sourcePage)) {
      setSourcePage(pages[0])
    }
  }, [allQuestions, draft?.questions, sourcePage])

  async function loadBatches() {
    const res = await fetch(`${API_URL}/draft/drafts`, { headers: authHeaders() })
    if (!res.ok) return
    const data = await res.json()
    setBatches(data)
  }

  async function loadDraft(batchId: string, page = currentPage, limit = pageSize) {
    const safeLimit = Math.min(200, Math.max(1, limit))
    const res = await fetch(`${API_URL}/draft/${batchId}?page=${page}&limit=${safeLimit}`, { headers: authHeaders() })
    if (res.ok) {
      const data = await res.json()
      setDraft(data)
      setCurrentBatch(batchId)
      setCurrentPage(data.page || page)
      if ((answerKeyMaxQ === '300' || !answerKeyMaxQ) && data.total_questions) {
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

    const res = await fetch(`${API_URL}/draft/upload`, {
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

    let lastProgress = -1
    while (true) {
      const pollRes = await fetch(`${API_URL}/draft/jobs/${jobId}`, { headers: authHeaders() })
      const job = await pollRes.json()
      setUploadProgress(`Processing... ${job.progress || 0}%`)

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
    const res = await fetch(`${API_URL}/draft/${currentBatch}/verify/${qid}`, {
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
    if (mode === 'selected') {
      body.ids = targets.map(t => t.question_id)
    } else if (mode === 'range') {
      const start = Number(bulkRangeStart)
      const end = Number(bulkRangeEnd)
      if (Number.isFinite(start) && Number.isFinite(end)) {
        body.range_start = start
        body.range_end = end
      }
    }
    await bulkUpdateRequest(body)
    scheduleDraftRefresh(currentBatch)
    await refreshAllIfLoaded()
    setActionStatus({ state: 'success', message: `Verified ${targets.length} question(s).` })
    console.info('[verify-bulk] done', { mode, count: targets.length, batch: currentBatch })
  }

  async function rejectQuestion(qid: string) {
    await fetch(`${API_URL}/draft/${currentBatch}/reject/${qid}`, {
      method: 'POST',
      headers: authHeaders()
    })
    updateLocalQuestion(qid, { verification_state: 'rejected' } as any)
    scheduleDraftRefresh(currentBatch!)
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
      const res = await fetch(`${API_URL}/draft/${currentBatch}/question/${qid}`, {
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
    const res = await fetch(`${API_URL}/draft/assets/${currentBatch}/upload`, {
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
    const res = await fetch(`${API_URL}/draft/assets/committed/${questionId}/upload`, {
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
      topic_name: (bulkTopic || '').trim()
    }
    const res = await fetch(`${API_URL}/draft/${currentBatch}/question`, {
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

    if (!subject && !chapter && !topic) {
      alert('Enter subject, chapter, or topic to apply.')
      return
    }

    const start = Number(bulkRangeStart)
    const end = Number(bulkRangeEnd)
    const hasRange = Number.isFinite(start) && Number.isFinite(end) && start > 0 && end >= start
    const patch: any = {}
    if (subject) patch.subject_name = subject
    if (chapter) patch.chapter_name = chapter
    if (topic) patch.topic_name = topic

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

  function parseAnswerKey(text: string): Record<number, string> {
    const out: Record<number, string> = {}
    const cleaned = text.replace(/\n/g, ' ').trim()
    if (!cleaned) return out
    const regex = /(\d+)\s*[\.\-:)\]]*\s*([A-Da-d]|[1-4])/g
    let match: RegExpExecArray | null
    while ((match = regex.exec(cleaned)) !== null) {
      const num = Number(match[1])
      const ans = match[2].toUpperCase()
      const mapped = ans === '1' ? 'A' : ans === '2' ? 'B' : ans === '3' ? 'C' : ans === '4' ? 'D' : ans
      out[num] = mapped
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
    const maxQ = Math.max(1, Number(answerKeyMaxQ) || 300)
    const startPage = Math.max(1, Number(answerKeyStartPage) || 1)
    const ocrDpi = Math.max(150, Math.min(450, Number(answerKeyOcrDpi) || 300))
    const res = await fetch(`${API_URL}/draft/answer-key/parse?max_pages=${maxPages}&start_page=${startPage}&min_q=1&max_q=${maxQ}&ocr_dpi=${ocrDpi}`, {
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
      const res = await fetch(`${API_URL}/draft/${batchId}?page=${page}&limit=${limit}`, { headers: authHeaders() })
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
    const res = await fetch(`${API_URL}/draft/${currentBatch}/bulk-update`, {
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
    const byNumber = questions.filter(q => {
      const num = parseQuestionNumber(q)
      return num !== null && num >= start && num <= end
    })
    if (byNumber.length > 0) return byNumber
    return questions.filter(q => (q.source_page || 0) >= start && (q.source_page || 0) <= end)
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
    const source =
      mode === 'selected' ? getQuestionsForSelected() :
      mode === 'range' ? await getQuestionsForRange() :
      await ensureAllQuestions()
    const payload = buildBulkPayload(source)
    if (!payload.length) {
      alert('No verified questions to validate')
      return
    }
    setLastValidationQuestions(source.filter(q => q.verification_state === 'verified'))
    const controller = new AbortController()
    const timeoutId = window.setTimeout(() => controller.abort(), 60000)
    try {
      console.info('[validate] start', { mode, count: payload.length, url: expressUrl })
      setActionStatus({ state: 'working', message: 'Validating...' })
      const res = await fetch(`${expressUrl}/api/questions/validate`, {
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
        const idx = typeof err?.index === 'number' ? err.index : -1
        const q = idx >= 0 ? source[idx] : null
        if (q?.question_id) {
          if ((err as any)?.reason === 'DUPLICATE_IN_DB') {
            duplicateIds.add(q.question_id)
          } else {
            failedIds.add(q.question_id)
          }
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

  async function commitBulk(mode: 'all' | 'selected' | 'range' = 'all') {
    if (!draft?.questions) return
    let sticky = false
    if (!confirm('Commit verified questions to database?')) return
    const source =
      mode === 'selected' ? getQuestionsForSelected() :
      mode === 'range' ? await getQuestionsForRange() :
      await ensureAllQuestions()
    const payload = buildBulkPayload(source)
    if (!payload.length) {
      alert('No verified questions to commit')
      return
    }
    setLastValidationQuestions(source.filter(q => q.verification_state === 'verified'))
    const controller = new AbortController()
    const timeoutId = window.setTimeout(() => controller.abort(), 120000)
    try {
      console.info('[commit] start', { mode, count: payload.length, url: expressUrl })
      setActionStatus({ state: 'working', message: 'Committing...' })
      const res = await fetch(`${expressUrl}/api/questions/bulk`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify({ questions: payload }),
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
      const sourceQuestions = source.filter(q => q.verification_state === 'verified')
      const failedIds = new Set<string>()
      const duplicateIds = new Set<string>()
      for (const err of errors) {
        const idx = typeof err?.index === 'number' ? err.index : -1
        const q = idx >= 0 ? sourceQuestions[idx] : null
        if (q?.question_id) {
          if ((err as any)?.reason === 'DUPLICATE_IN_DB') {
            duplicateIds.add(q.question_id)
          } else {
            failedIds.add(q.question_id)
          }
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

  function downloadCommittedCsv() {
    if (!committed.length) {
      alert('No committed questions to export.')
      return
    }
    const header = ['question_id', 'question_text', 'subject', 'chapter', 'topic', 'difficulty_level', 'difficulty_type', 'question_type']
    const rows = committed.map(q => [
      q.id ?? '',
      (q.question_text || '').replace(/\n/g, ' ').trim(),
      q.subject_name || '',
      q.chapter_name || '',
      q.topic_name || '',
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
      : pageQuestions
  const filteredQuestions = validationFilteredQuestions
    .filter((q: Question) => (validationFilter !== 'all' ? true : (sourcePage ? q.source_page === sourcePage : true)))
    .filter((q: Question) => {
      if (filter === 'all') return true
      if (filter === 'verified') return q.verification_state === 'verified'
      if (filter === 'pending') return q.verification_state !== 'verified' && q.verification_state !== 'rejected'
      return true
    })
    .sort((a: Question, b: Question) => (a.source_page || 0) - (b.source_page || 0))

  const stats = {
    total: questionsForView.length || 0,
    verified: questionsForView.filter((q: Question) => q.verification_state === 'verified').length || 0,
    pending: questionsForView.filter((q: Question) => q.verification_state !== 'verified' && q.verification_state !== 'rejected').length || 0
  }
  const duplicateCount = validationErrors.filter(e => e?.reason === 'DUPLICATE_IN_DB').length
  const failedCount = validationFailedIds.size
  const selectedCount = selectedIds.size
  const tourSteps = getTourSteps()
  const tourTotal = tourSteps.length
  const activeTour = tourOpen && tourSteps[tourStep]

  function getTourSteps() {
    return [
      { selector: '[data-tour="sidebar"]', title: 'Batches', body: 'Pick a batch to load questions from one PDF.' },
      { selector: '[data-tour="pagination"]', title: 'Pages', body: 'Use the page selector to review one source_page at a time.' },
      { selector: '[data-tour="actions"]', title: 'Validate + Commit', body: 'Validate checks required fields. Commit sends verified questions to DB.' },
      { selector: '[data-tour="bulk-meta"]', title: 'Bulk Metadata', body: 'Apply subject/chapter/topic, difficulty, and question type in bulk.' },
      { selector: '[data-tour="answer-key"]', title: 'Answer Key', body: 'Paste or upload keys, then apply to page or range.' },
      { selector: '[data-tour="filters"]', title: 'Filters', body: 'Filter by pending/verified/failed after validation.' }
    ]
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
        info.page ?? '',
        info.qnum ?? '',
        info.field,
        info.reason,
        info.message
      ]
    })
    const header = ['page', 'question_number', 'field', 'reason', 'message']
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
        <div style={{ background: 'rgba(255,255,255,0.03)', padding: '48px', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.08)', width: '100%', maxWidth: '400px' }}>
          <h1 style={{ marginBottom: '32px', textAlign: 'center' }}>DocQuest Review</h1>
          <form onSubmit={(e) => {
            e.preventDefault()
            const form = e.target as HTMLFormElement
            const user = (form.elements.namedItem('username') as HTMLInputElement).value
            const pass = (form.elements.namedItem('password') as HTMLInputElement).value
            handleLogin(user, pass)
          }}>
            <input name="username" type="text" placeholder="Username" />
            <input name="password" type="password" placeholder="Password" />
            {loginError && <div style={{ marginBottom: '16px', color: '#f87171', textAlign: 'center' }}>{loginError}</div>}
            <button type="submit">Login</button>
          </form>
          <div style={{ marginTop: '16px', textAlign: 'center', color: '#888', fontSize: '12px' }}>
            <div>admin / admin123</div>
            <div>reviewer / review123</div>
          </div>
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
      <header className="header">
        <h1></h1>
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
          <span style={{ marginLeft: '16px', color: '#a1a1aa' }}>User: {username}</span>
          <button onClick={handleLogout} style={{ marginLeft: '8px', padding: '6px 12px' }}>Logout</button>
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
                  {b.batch_id}
                </option>
              ))}
            </select>
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
          {committed.length === 0 && <div style={{ color: '#888' }}>No committed questions found.</div>}
          <div className="committed-list">
            {committed.map((q, i) => (
              <CommittedQuestionCard
                key={q.id || i}
                question={q}
                isEditing={committedEditId === q.id}
                editValue={committedEdit}
                onEdit={() => startEditCommitted(q)}
                onCancel={cancelEditCommitted}
                onChange={setCommittedEdit}
                onSave={saveCommittedEdit}
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
              <label className="upload-label">
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
                  loadDraft(b.batch_id, 1, pageSize)
                }}
              >
                <span className="batch-id">{b.batch_id}</span>
                <span className="batch-meta">{b.total_questions || '?'} questions - {b.status}</span>
              </div>
            ))}
          </aside>

          <main className="content">
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
              <div className="actions-row">
                <input
                  type="number"
                  placeholder="Range start"
                  value={bulkRangeStart}
                  onChange={e => setBulkRangeStart(e.target.value)}
                />
                <input
                  type="number"
                  placeholder="Range end"
                  value={bulkRangeEnd}
                  onChange={e => setBulkRangeEnd(e.target.value)}
                />
                <button className="btn small" onClick={() => verifyBulk('selected')} disabled={actionStatus.state === 'working' || selectedCount === 0}>
                  Verify selected
                </button>
                <button className="btn small" onClick={() => verifyBulk('range')} disabled={actionStatus.state === 'working'}>
                  Verify range
                </button>
                <button className="btn small" onClick={() => validateBulk('selected')} disabled={actionStatus.state === 'working' || selectedCount === 0}>
                  Validate selected
                </button>
                <button className="btn small" onClick={() => validateBulk('range')} disabled={actionStatus.state === 'working'}>
                  Validate range
                </button>
                <button className="btn small" onClick={() => commitBulk('selected')} disabled={actionStatus.state === 'working' || selectedCount === 0}>
                  Commit selected
                </button>
                <button className="btn small" onClick={() => commitBulk('range')} disabled={actionStatus.state === 'working'}>
                  Commit range
                </button>
              </div>
              <div className="actions-row">
                <button className="btn small" onClick={() => validateBulk('all')} disabled={actionStatus.state === 'working'}>
                  Validate all
                </button>
                <button className="btn small" onClick={() => commitBulk('all')} disabled={actionStatus.state === 'working'}>
                  Commit all
                </button>
                <button className="btn small" onClick={() => currentBatch && loadAllQuestions(currentBatch)} disabled={actionStatus.state === 'working' || !currentBatch || allLoading}>
                  {allLoading ? 'Loading pages...' : 'Load all pages'}
                </button>
                <button className="btn small" onClick={verifyAllValid} disabled={actionStatus.state === 'working'}>
                  Verify all valid
                </button>
                <button className="btn small" onClick={addQuestion} disabled={actionStatus.state === 'working' || !currentBatch}>
                  Add question
                </button>
              </div>
              <div className="actions-row">
                <button className="btn small" onClick={() => selectFailedAndRun('validate')} disabled={actionStatus.state === 'working' || failedCount === 0}>
                  Validate failed only
                </button>
                <button className="btn small" onClick={() => selectFailedAndRun('commit')} disabled={actionStatus.state === 'working' || failedCount === 0}>
                  Commit failed only
                </button>
              </div>
            </div>
            <div className="bulk-metadata" data-tour="bulk-meta">
              {uiError && <div className="committed-error">{uiError}</div>}
              {uiNotice && <div className="committed-meta">{uiNotice}</div>}
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
                <button className="btn small" disabled={bulkBusy} onClick={() => applyBulkMetadata('all')}>
                  Apply to all
                </button>
                <button className="btn small" disabled={bulkBusy} onClick={() => applyBulkMetadata('missing')}>
                  Apply to missing
                </button>
              </div>
              <div className="bulk-row">
                <input
                  type="number"
                  placeholder="Page start"
                  value={bulkRangeStart}
                  onChange={e => setBulkRangeStart(e.target.value)}
                />
                <input
                  type="number"
                  placeholder="Page end"
                  value={bulkRangeEnd}
                  onChange={e => setBulkRangeEnd(e.target.value)}
                />
                <button className="btn small" disabled={bulkBusy} onClick={() => applyBulkMetadata('range')}>
                  Apply to range
                </button>
                <button
                  className="btn small"
                  onClick={() => setSelectedIds(new Set(filteredQuestions.map((q: Question) => q.question_id)))}
                >
                  Select page
                </button>
                <button className="btn small" onClick={() => setSelectedIds(new Set())}>
                  Clear selection
                </button>
              </div>
              <div className="bulk-row" data-tour="answer-key">
                <input
                  type="file"
                  accept=".png,.jpg,.jpeg,.pdf"
                  onChange={e => {
                    const f = e.target.files?.[0]
                    if (f) uploadAnswerKeyFile(f)
                  }}
                />
                <input
                  type="number"
                  min="1"
                  max="20"
                  placeholder="Key pages"
                  value={answerKeyMaxPages}
                  onChange={e => setAnswerKeyMaxPages(e.target.value)}
                />
                <input
                  type="number"
                  min="1"
                  placeholder="Start page"
                  value={answerKeyStartPage}
                  onChange={e => setAnswerKeyStartPage(e.target.value)}
                />
                <input
                  type="number"
                  min="1"
                  placeholder="Max Q"
                  value={answerKeyMaxQ}
                  onChange={e => setAnswerKeyMaxQ(e.target.value)}
                />
                <input
                  type="number"
                  min="150"
                  max="450"
                  placeholder="OCR DPI"
                  value={answerKeyOcrDpi}
                  onChange={e => setAnswerKeyOcrDpi(e.target.value)}
                />
                <input
                  type="text"
                  placeholder="Answer key (1.A 2.B 3.C)"
                  value={bulkAnswerKey}
                  onChange={e => setBulkAnswerKey(e.target.value)}
                />
                <input
                  type="number"
                  placeholder="Page"
                  value={bulkAnswerPage}
                  onChange={e => setBulkAnswerPage(e.target.value)}
                />
                <button className="btn small" disabled={bulkBusy} onClick={() => applyBulkAnswers('all')}>
                  Apply answers to all
                </button>
                <button className="btn small" disabled={bulkBusy} onClick={() => applyBulkAnswers('missing')}>
                  Apply answers to missing
                </button>
                <button className="btn small" disabled={bulkBusy} onClick={() => applyBulkAnswers('range')}>
                  Apply answers to range
                </button>
                <button className="btn small" disabled={bulkBusy} onClick={applyAnswersToPage}>
                  Apply answers to page
                </button>
              </div>
              {(answerKeyStatus || answerKeyPairs.length > 0) && (
                <div className="bulk-row" style={{ alignItems: 'flex-start' }}>
                  <div style={{ fontSize: '12px', color: '#9ca3af' }}>
                    {answerKeyStatus}
                  </div>
                  {answerKeyPairs.length > 0 && (
                    <div style={{ maxHeight: '120px', overflowY: 'auto', fontSize: '12px', color: '#cbd5f5' }}>
                      {answerKeyPairs.slice(0, 100).map((p, idx) => (
                        <div key={`${p.number}-${idx}`}>
                          Q{p.number}: {p.answer}
                        </div>
                      ))}
                      {answerKeyPairs.length > 100 && (
                        <div>... {answerKeyPairs.length - 100} more</div>
                      )}
                    </div>
                  )}
                </div>
              )}
              <div className="bulk-row">
                <input
                  type="number"
                  placeholder="Difficulty level"
                  value={bulkLevel}
                  onChange={e => setBulkLevel(e.target.value)}
                />
              <input
                type="text"
                placeholder="Difficulty type"
                value={bulkDifficultyType}
                onChange={e => setBulkDifficultyType(e.target.value)}
              />
              <select value={bulkQuestionType} onChange={e => setBulkQuestionType(e.target.value)}>
                <option value="single_correct">single_correct</option>
                <option value="multiple_correct">multiple_correct</option>
                <option value="assertion_and_reason">assertion_and_reason</option>
                <option value="matching">matching</option>
                <option value="statements">statements</option>
                <option value="numerical">numerical</option>
              </select>
                <button className="btn small" disabled={bulkBusy} onClick={() => applyBulkLevel('all')}>
                  Apply level to all
                </button>
                <button className="btn small" disabled={bulkBusy} onClick={() => applyBulkLevel('missing')}>
                  Apply level to missing
                </button>
                <button className="btn small" disabled={bulkBusy} onClick={() => applyBulkLevel('range')}>
                  Apply level to range
                </button>
                <button className="btn small" disabled={bulkBusy} onClick={() => applyBulkDifficultyType('all')}>
                  Apply type to all
                </button>
                <button className="btn small" disabled={bulkBusy} onClick={() => applyBulkDifficultyType('missing')}>
                  Apply type to missing
                </button>
              <button className="btn small" disabled={bulkBusy} onClick={() => applyBulkDifficultyType('range')}>
                Apply type to range
              </button>
              <button className="btn small" disabled={bulkBusy} onClick={() => applyBulkQuestionType('all')}>
                Apply qtype to all
              </button>
              <button className="btn small" disabled={bulkBusy} onClick={() => applyBulkQuestionType('range')}>
                Apply qtype to range
              </button>
                <button className="btn small" disabled={bulkBusy} onClick={() => applyBulkLevelAndType('all')}>
                  Apply level+type to all
                </button>
                <button className="btn small" disabled={bulkBusy} onClick={() => applyBulkLevelAndType('missing')}>
                  Apply level+type to missing
                </button>
                <button className="btn small" disabled={bulkBusy} onClick={() => applyBulkLevelAndType('range')}>
                  Apply level+type to range
                </button>
                <button className="btn small" disabled={bulkBusy} onClick={() => applyBulkLevelTypeAndQuestionType('all')}>
                  Apply level+type+qtype to all
                </button>
                <button className="btn small" disabled={bulkBusy} onClick={() => applyBulkLevelTypeAndQuestionType('missing')}>
                  Apply level+type+qtype to missing
                </button>
                <button className="btn small" disabled={bulkBusy} onClick={() => applyBulkLevelTypeAndQuestionType('range')}>
                  Apply level+type+qtype to range
                </button>
              </div>
            </div>
            <div className="filters" data-tour="filters">
              {['all', 'pending', 'verified'].map(f => (
                <button key={f} className={filter === f ? 'active' : ''} onClick={() => setFilter(f)}>
                  {f.charAt(0).toUpperCase() + f.slice(1)}
                </button>
              ))}
            </div>
            <div className="pagination" data-tour="pagination">
              <button
                className="btn small"
                disabled={sourcePages.length === 0 || sourcePage === null || sourcePages.indexOf(sourcePage) <= 0}
                onClick={() => {
                  if (sourcePage === null) return
                  const idx = sourcePages.indexOf(sourcePage)
                  if (idx > 0) setSourcePage(sourcePages[idx - 1])
                }}
              >
                Prev page
              </button>
              <span className="pagination-info">
                Page {sourcePage || '?'} of {sourcePages.length || '?'} - {filteredQuestions.length} on page - {draft?.total_questions || 0} total{allLoading ? ' (loading pages...)' : ''}
              </span>
              <button
                className="btn small"
                disabled={sourcePages.length === 0 || sourcePage === null || sourcePages.indexOf(sourcePage) === sourcePages.length - 1}
                onClick={() => {
                  if (sourcePage === null) return
                  const idx = sourcePages.indexOf(sourcePage)
                  if (idx >= 0 && idx < sourcePages.length - 1) setSourcePage(sourcePages[idx + 1])
                }}
              >
                Next page
              </button>
              <select
                value={sourcePage || ''}
                onChange={e => setSourcePage(Number(e.target.value) || null)}
              >
                <option value="">Select page</option>
                {sourcePages.map(p => (
                  <option key={p} value={p}>
                    Page {p}
                  </option>
                ))}
              </select>
            </div>
            <div className="questions">
              {filteredQuestions.length === 0 && questionsForView.length > 0 && (
                <div style={{ color: '#888' }}>
                  No questions on this page. Pick another page from the selector.
                </div>
              )}
              {filteredQuestions.map((q: Question, i: number) => (
                <QuestionCard
                  key={q.question_id}
                  question={q}
                  index={i}
                  batchId={currentBatch || ''}
                  assetUrl={assetUrl}
                  onUploadAsset={uploadAsset}
                  onVerify={() => verifyQuestion(q.question_id)}
                  onReject={() => rejectQuestion(q.question_id)}
                  onUpdate={(patch) => updateQuestion(q.question_id, patch)}
                  onToggleCorrect={(letter) => toggleCorrect(q.question_id, letter)}
                  onApplyAnswer={() => applyAnswerToQuestion(q)}
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
                  pageImages={Object.entries(draft?.image_assets || {})
                    .filter(([, asset]) => asset?.filename && asset?.source_page === q.source_page)
                    .map(([id, asset]) => ({ id, filename: asset.filename }))}
                />
              ))}
            </div>
          </main>
        </div>
      )}

      {showValidation && validationResult && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: '#1a1a2e', padding: '24px', borderRadius: '16px', maxWidth: '500px', width: '90%' }}>
            <h3 style={{ marginBottom: '16px' }}>Validation Results</h3>
            <div style={{ display: 'flex', gap: '16px', marginBottom: '16px' }}>
              <div style={{ padding: '12px', background: 'rgba(52,211,153,0.1)', borderRadius: '8px', flex: 1, textAlign: 'center' }}>
                <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#34d399' }}>{validationResult.validCount || validationResult.insertedCount || 0}</div>
                <div style={{ fontSize: '12px', color: '#888' }}>{validationResult.insertedCount ? 'Inserted' : 'Valid'}</div>
              </div>
              <div style={{ padding: '12px', background: 'rgba(248,113,113,0.1)', borderRadius: '8px', flex: 1, textAlign: 'center' }}>
                <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#f87171' }}>{validationResult.failedCount || 0}</div>
                <div style={{ fontSize: '12px', color: '#888' }}>Failed</div>
              </div>
              <div style={{ padding: '12px', background: 'rgba(251,191,36,0.1)', borderRadius: '8px', flex: 1, textAlign: 'center' }}>
                <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#fbbf24' }}>{validationResult.skippedCount || 0}</div>
                <div style={{ fontSize: '12px', color: '#888' }}>Skipped</div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '8px', marginBottom: '12px', flexWrap: 'wrap' }}>
              <button
                onClick={() => { setValidationFilter('failed'); setFilter('all'); setShowValidation(false) }}
                style={{ padding: '8px 12px', background: '#f87171', border: 'none', borderRadius: '6px', color: '#fff', cursor: 'pointer' }}
              >
                Show Failed
              </button>
              <button
                onClick={() => { setValidationFilter('valid'); setFilter('all'); setShowValidation(false) }}
                style={{ padding: '8px 12px', background: '#34d399', border: 'none', borderRadius: '6px', color: '#0b0f16', cursor: 'pointer' }}
              >
                Show Valid
              </button>
              <button
                onClick={downloadValidationErrors}
                style={{ padding: '8px 12px', background: '#2d2d44', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', color: '#fff', cursor: 'pointer' }}
              >
                Download Errors (CSV)
              </button>
              <button
                onClick={() => { setValidationFilter('all'); setFilter('all'); setShowValidation(false) }}
                style={{ padding: '8px 12px', background: '#2d2d44', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', color: '#fff', cursor: 'pointer' }}
              >
                Clear Filter
              </button>
            </div>
            {validationResult.errors?.length > 0 && (
              <div style={{ maxHeight: '200px', overflowY: 'auto', background: 'rgba(0,0,0,0.3)', padding: '12px', borderRadius: '8px' }}>
                {validationResult.errors.map((e: any, i: number) => {
                  const idx = typeof e.index === 'number' ? e.index : -1
                  const q = idx >= 0 ? lastValidationQuestions[idx] : null
                  const info = formatValidationError(e, q)
                  const qnum = info.qnum
                  const page = info.page
                  const message = info.message
                  const labelParts = []
                  if (page) labelParts.push(`Page ${page}`)
                  if (qnum) labelParts.push(`Q${qnum}`)
                  const label = labelParts.length ? `${labelParts.join(' - ')}: ` : ''
                  return (
                    <div key={i} style={{ padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,0.1)', color: '#f87171', fontSize: '13px' }}>
                      {label}{message}
                    </div>
                  )
                })}
              </div>
            )}
            <button onClick={() => setShowValidation(false)} style={{ marginTop: '16px', padding: '10px 24px', background: '#6366f1', border: 'none', borderRadius: '8px', color: '#fff', cursor: 'pointer' }}>
              Close
            </button>
          </div>
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
  assetUrl: (name?: string) => string
  onUploadAsset: (file: File) => Promise<string | null>
  onVerify: () => void
  onReject: () => void
  onUpdate: (patch: Partial<Question>) => void
  onToggleCorrect: (letter: string) => void
  onApplyAnswer: () => void
  selected: boolean
  onToggleSelect: () => void
  pageImages: { id: string; filename: string }[]
}

function QuestionCard({ question: q, index, batchId, assetUrl, onUploadAsset, onVerify, onReject, onUpdate, onToggleCorrect, onApplyAnswer, selected, onToggleSelect, pageImages }: QuestionCardProps) {
  const [editMode, setEditMode] = useState(false)
  const [text, setText] = useState(q.questionText)
  const [explanation, setExplanation] = useState(q.explanation || '')
  const [options, setOptions] = useState<Option[]>(q.options || [])
  const [subject, setSubject] = useState((q as any).subject_name || '')
  const [chapter, setChapter] = useState((q as any).chapter_name || '')
  const [topic, setTopic] = useState((q as any).topic_name || '')
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
    }
  }, [q.questionText, q.explanation, q.options, editMode])

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
    onUpdate({
      questionText: text,
      explanation,
      subject_name: subject,
      chapter_name: chapter,
      topic_name: topic,
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
          <span className={`badge state ${q.verification_state}`}>{q.verification_state}</span>
          <span className="badge page">Page {q.source_page}</span>
          {q.correct_option_letters && (
            <span className="badge level">Answer: {q.correct_option_letters}</span>
          )}
        </div>
      </div>

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
            <input
              type="number"
              value={level}
              onChange={e => setLevel(e.target.value)}
              placeholder="Level"
            />
            <input
              type="text"
              value={difficultyType}
              onChange={e => setDifficultyType(e.target.value)}
              placeholder="Difficulty type"
            />
          </>
        ) : (
          <div className="committed-meta">
            {(q as any).subject_name || 'subject?'} / {(q as any).chapter_name || 'chapter?'} / {(q as any).topic_name || 'topic?'}
          </div>
        )}
        <label className="btn">
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
            <label className="btn small">
              Upload option image
              <input type="file" accept="image/*" onChange={(e) => handleOptionImage(o.letter, e)} style={{ display: 'none' }} />
            </label>
            {editMode && normalizeImageListLocal(o.image_urls || o.image_url).map((img, idx) => (
              <button key={`${img}-${idx}`} className="btn small" onClick={() => removeOptionImage(o.letter, img)}>
                Remove option image
              </button>
            ))}
          </div>
        ))}
        {editMode && (
          <button className="btn small" onClick={addOption}>
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
        <label className="btn">
          Upload explanation image
          <input type="file" accept="image/*" onChange={handleExplanationImage} style={{ display: 'none' }} />
        </label>
        {normalizeImageListLocal(q.explanation_images || q.explanation_image).map((img, idx) => (
          <div key={`${img}-${idx}`} style={{ display: 'inline-flex', flexDirection: 'column', gap: '6px', marginRight: '8px' }}>
            {editMode && (
              <button className="btn small" onClick={() => removeExplanationImage(img)}>
                Remove explanation image
              </button>
            )}
            <img src={assetUrl(img)} className="question-image" alt="explanation" />
          </div>
        ))}
      </div>
      {editMode && pageImages.length > 0 && (
        <div className="meta-row">
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            {pageImages.map(img => (
              <div key={img.id} style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <img src={assetUrl(img.filename)} style={{ width: '120px', borderRadius: '8px' }} alt="page asset" />
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                  <button className="btn small" onClick={() => attachQuestionImage(img.filename)}>
                    Use for question
                  </button>
                  <button className="btn small" onClick={() => attachExplanationImage(img.filename)}>
                    Use for explanation
                  </button>
                </div>
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                  {options.map(o => (
                    <button key={o.letter} className="btn small" onClick={() => attachOptionImageToLetter(o.letter, img.filename)}>
                      Use for {o.letter}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      <div className="actions">
        {editMode ? (
          <>
            <button className="btn save" onClick={saveChanges}>Save</button>
            <button className="btn cancel" onClick={() => setEditMode(false)}>Cancel</button>
          </>
        ) : (
          <>
            <button className="btn edit" onClick={() => setEditMode(true)}>Edit</button>
            <button className="btn edit" onClick={() => setEditMode(true)}>Edit Explanation</button>
            <button className="btn edit" onClick={onApplyAnswer}>Apply Answer</button>
          </>
        )}
        <button className="btn verify" onClick={onVerify}>Verify</button>
        <button className="btn reject" onClick={onReject}>Reject</button>
      </div>
    </div>
  )
}

export default ReviewApp

interface CommittedCardProps {
  question: CommittedQuestion
  isEditing: boolean
  editValue: CommittedQuestion | null
  onEdit: () => void
  onCancel: () => void
  onChange: (q: CommittedQuestion | null) => void
  onSave: () => void
  error: string
  assetUrl: (key?: string) => string
  onUploadAsset: (questionId: number, file: File) => Promise<string | null>
}

function CommittedQuestionCard({ question: q, isEditing, editValue, onEdit, onCancel, onChange, onSave, error, assetUrl, onUploadAsset }: CommittedCardProps) {
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
            <input
              type="text"
              value={(active.difficulty_type || '') as any}
              onChange={e => onChange({ ...(active as any), difficulty_type: e.target.value })}
              placeholder="Difficulty type"
            />
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
              <label className="btn small">
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
            <button className="btn save" onClick={onSave}>Save</button>
            <button className="btn cancel" onClick={onCancel}>Cancel</button>
            <label className="btn small">
              Upload question image
              <input type="file" accept="image/*" onChange={handleCommittedQuestionImage} style={{ display: 'none' }} />
            </label>
            <label className="btn small">
              Upload explanation image
              <input type="file" accept="image/*" onChange={handleCommittedExplanationImage} style={{ display: 'none' }} />
            </label>
          </>
        ) : (
          <>
            <button className="btn edit" onClick={onEdit}>Edit</button>
            <button className="btn edit" onClick={onEdit}>Edit Explanation</button>
          </>
        )}
      </div>
    </div>
  )
}











