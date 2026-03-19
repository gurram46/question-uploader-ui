import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { GroupedQuestion } from '../types';
import { questionApi, difficultyApi } from '../services/api';
import { groupQuestionsByQuestionId, formatDate, getDifficultyInfo, debounce, filterQuestions, getUniqueSubjects, getUniqueChapters } from '../utils/dataProcessing';
import { useToast } from '../hooks/useToast';

const QuestionsList: React.FC = () => {
  const { showError, showSuccess } = useToast();
  const controlClass = 'w-full px-3 sm:px-4 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white text-slate-900';
  const [questions, setQuestions] = useState<GroupedQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('');
  const [selectedChapter, setSelectedChapter] = useState('');
  const [selectedTopic, setSelectedTopic] = useState('');
  // Difficulty filter sourced from backend (level + type)
  const [difficultyOptions, setDifficultyOptions] = useState<Array<{ key: string; level: number; type: string }>>([]);
  const [selectedDifficultyKey, setSelectedDifficultyKey] = useState<string>('');
  const [expandedQuestions, setExpandedQuestions] = useState<Set<string>>(new Set());
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

  // Fetch questions on component mount
  useEffect(() => {
    const fetchQuestions = async () => {
      setLoading(true);
      try {
        const questionRows = await questionApi.getQuestions();
        const groupedQuestions = groupQuestionsByQuestionId(questionRows);
        setQuestions(groupedQuestions);
      } catch (error) {
        // Error logging is handled by API service
        const errorMessage = error instanceof Error ? error.message : 'Failed to load questions';
        showError(errorMessage);
      } finally {
        setLoading(false);
      }
    };

    fetchQuestions();
  }, [showError]);

  // Load difficulties (level + type). Fallback to building from loaded questions.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const diffs = await difficultyApi.getDifficulties();
        const uniq = new Map<string, { key: string; level: number; type: string }>();
        diffs.forEach((d: any) => {
          const lvl = Number(d?.difficulty_level);
          const type = String(d?.difficulty_type || '').trim();
          if (Number.isFinite(lvl)) {
            const key = `${lvl}::${type}`;
            if (!uniq.has(key)) uniq.set(key, { key, level: lvl, type });
          }
        });
        let all = Array.from(uniq.values());
        if (all.length === 0 && questions.length > 0) {
          const localUniq = new Map<string, { key: string; level: number; type: string }>();
          questions.forEach(q => {
            const lvl = Number(q.difficulty_level || 0);
            const type = String((q as any).difficulty_type || '').trim();
            if (Number.isFinite(lvl) && lvl > 0) {
              const key = `${lvl}::${type}`;
              if (!localUniq.has(key)) localUniq.set(key, { key, level: lvl, type });
            }
          });
          all = Array.from(localUniq.values());
        }
        all.sort((a, b) => (a.level - b.level) || a.type.localeCompare(b.type));
        if (!cancelled) setDifficultyOptions(all);
      } catch (err) {
        // If API fails, try to build from questions if available
        if (questions.length > 0 && !cancelled) {
          const localUniq = new Map<string, { key: string; level: number; type: string }>();
          questions.forEach(q => {
            const lvl = Number(q.difficulty_level || 0);
            const type = String((q as any).difficulty_type || '').trim();
            if (Number.isFinite(lvl) && lvl > 0) {
              const key = `${lvl}::${type}`;
              if (!localUniq.has(key)) localUniq.set(key, { key, level: lvl, type });
            }
          });
          const all = Array.from(localUniq.values()).sort((a, b) => (a.level - b.level) || a.type.localeCompare(b.type));
          setDifficultyOptions(all);
        }
      }
    })();
    return () => { cancelled = true; };
  }, [questions]);

  // Debounced search to avoid excessive filtering
  const debouncedSetSearchTerm = useMemo(
    () => debounce((term: string) => setSearchTerm(term), 300),
    []
  );

  // Filter questions based on search criteria
  const filteredQuestions = useMemo(() => {
    // Use base filter for search + subject + chapter
    const base = filterQuestions(questions, searchTerm, selectedSubject, selectedChapter, null);
    const topicFiltered = selectedTopic
      ? base.filter(q => {
          const topicName = String((q as any).topicName ?? q.topic_name ?? '').trim().toLowerCase();
          return topicName === selectedTopic.trim().toLowerCase();
        })
      : base;
    if (!selectedDifficultyKey) return topicFiltered;
    const [lvlStr, typeRaw] = selectedDifficultyKey.split('::');
    const lvl = Number(lvlStr);
    const type = (typeRaw || '').trim().toLowerCase();
    return topicFiltered.filter(q => {
      const matchesLevel = Number(q.difficulty_level || 0) === lvl;
      if (!matchesLevel) return false;
      const qt = String((q as any).difficulty_type || '').trim().toLowerCase();
      // If filter has type, require exact match; otherwise match by level only
      return type ? qt === type : true;
    });
  }, [questions, searchTerm, selectedSubject, selectedChapter, selectedTopic, selectedDifficultyKey]);

  const structuralQuestions = useMemo(() => {
    const base = filterQuestions(questions, searchTerm, selectedSubject, selectedChapter, null);
    if (!selectedTopic) return base;
    return base.filter(q => {
      const topicName = String((q as any).topicName ?? q.topic_name ?? '').trim().toLowerCase();
      return topicName === selectedTopic.trim().toLowerCase();
    });
  }, [questions, searchTerm, selectedSubject, selectedChapter, selectedTopic]);

  const subjectSummaries = useMemo(() => {
    const map = new Map<string, { subject: string; questionCount: number; chapters: Set<string>; topics: Set<string> }>();
    structuralQuestions.forEach(question => {
      const subject = String((question as any).subjectName ?? question.subject_name ?? '').trim() || 'Unassigned';
      const chapter = String((question as any).chapterName ?? question.chapter_name ?? '').trim();
      const topic = String((question as any).topicName ?? question.topic_name ?? '').trim();
      if (!map.has(subject)) {
        map.set(subject, { subject, questionCount: 0, chapters: new Set<string>(), topics: new Set<string>() });
      }
      const item = map.get(subject);
      if (!item) return;
      item.questionCount += 1;
      if (chapter) item.chapters.add(chapter);
      if (topic) item.topics.add(topic);
    });
    return Array.from(map.values())
      .sort((a, b) => b.questionCount - a.questionCount || a.subject.localeCompare(b.subject))
      .map(item => ({
        subject: item.subject,
        questionCount: item.questionCount,
        chapterCount: item.chapters.size,
        topicCount: item.topics.size,
      }));
  }, [structuralQuestions]);

  const chapterSummaries = useMemo(() => {
    const map = new Map<string, { chapter: string; questionCount: number; topics: Set<string> }>();
    structuralQuestions.forEach(question => {
      const chapter = String((question as any).chapterName ?? question.chapter_name ?? '').trim() || 'Unassigned Chapter';
      const topic = String((question as any).topicName ?? question.topic_name ?? '').trim();
      if (!map.has(chapter)) {
        map.set(chapter, { chapter, questionCount: 0, topics: new Set<string>() });
      }
      const item = map.get(chapter);
      if (!item) return;
      item.questionCount += 1;
      if (topic) item.topics.add(topic);
    });
    return Array.from(map.values())
      .sort((a, b) => b.questionCount - a.questionCount || a.chapter.localeCompare(b.chapter))
      .map(item => ({
        chapter: item.chapter,
        questionCount: item.questionCount,
        topicCount: item.topics.size,
      }));
  }, [structuralQuestions]);

  const topicSummaries = useMemo(() => {
    const map = new Map<string, { topic: string; questionCount: number }>();
    structuralQuestions.forEach(question => {
      const topic = String((question as any).topicName ?? question.topic_name ?? '').trim() || 'Unassigned Topic';
      if (!map.has(topic)) {
        map.set(topic, { topic, questionCount: 0 });
      }
      const item = map.get(topic);
      if (!item) return;
      item.questionCount += 1;
    });
    return Array.from(map.values()).sort((a, b) => b.questionCount - a.questionCount || a.topic.localeCompare(b.topic));
  }, [structuralQuestions]);

  const levelSummaries = useMemo(() => {
    const map = new Map<number, number>();
    structuralQuestions.forEach(question => {
      const level = Number(question.difficulty_level || 0);
      if (!Number.isFinite(level) || level <= 0) return;
      map.set(level, (map.get(level) || 0) + 1);
    });
    return Array.from(map.entries())
      .sort((a, b) => a[0] - b[0])
      .map(([level, count]) => ({ level, count, info: getDifficultyInfo(level) }));
  }, [structuralQuestions]);

  // Get unique subjects for filter dropdown
  const uniqueSubjects = useMemo(() => getUniqueSubjects(questions), [questions]);
  const uniqueChapters = useMemo(() => getUniqueChapters(questions, selectedSubject), [questions, selectedSubject]);
  const uniqueTopics = useMemo(() => {
    const selectedSubjectLower = selectedSubject.trim().toLowerCase();
    const selectedChapterLower = selectedChapter.trim().toLowerCase();
    const topics = questions
      .filter(q => {
        const subjectName = String((q as any).subjectName ?? q.subject_name ?? '').trim().toLowerCase();
        const chapterName = String((q as any).chapterName ?? q.chapter_name ?? '').trim().toLowerCase();
        if (selectedSubjectLower && subjectName !== selectedSubjectLower) return false;
        if (selectedChapterLower && chapterName !== selectedChapterLower) return false;
        return true;
      })
      .map(q => String((q as any).topicName ?? q.topic_name ?? '').trim())
      .filter(Boolean);
    return Array.from(new Set(topics)).sort((a, b) => a.localeCompare(b));
  }, [questions, selectedSubject, selectedChapter]);

  // Toggle question expansion
  const toggleExpansion = useCallback((questionId: string) => {
    setExpandedQuestions(prev => {
      const newSet = new Set(prev);
      if (newSet.has(questionId)) {
        newSet.delete(questionId);
      } else {
        newSet.add(questionId);
      }
      return newSet;
    });
  }, []);

  // Reset filters
  const resetFilters = useCallback(() => {
    setSearchTerm('');
    setSelectedSubject('');
    setSelectedChapter('');
    setSelectedTopic('');
    setSelectedDifficultyKey('');
  }, []);

  const requestDelete = useCallback((questionId: string) => {
    setPendingDeleteId(questionId);
  }, []);

  const confirmDelete = useCallback(async (questionId: string) => {
    try {
      await questionApi.deleteQuestion(questionId);
      setQuestions(prev => prev.filter(q => q.question_id !== questionId));
      setPendingDeleteId(null);
      showSuccess('Question deleted');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to delete question';
      showError(msg);
    }
  }, [showError, showSuccess]);

  const cancelDelete = useCallback(() => setPendingDeleteId(null), []);

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6">
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
          <span className="ml-3 text-gray-600">Loading questions...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6">
      <div className="bg-white rounded-[28px] border border-slate-200 shadow-[0_24px_60px_rgba(15,23,42,0.08)] overflow-hidden">
        {/* Header */}
        <div className="p-4 sm:p-6 border-b border-slate-200 bg-gradient-to-br from-white via-slate-50 to-blue-50">
          <div className="flex flex-col lg:flex-row lg:justify-between lg:items-start mb-5 gap-4">
            <div>
              <p className="text-xs font-semibold tracking-[0.18em] uppercase text-slate-500 mb-2">View Questions</p>
              <h2 className="text-2xl sm:text-3xl font-bold text-slate-900">Find the right question fast</h2>
              <p className="text-sm sm:text-base text-slate-600 mt-2 max-w-2xl">
                Search first, then narrow by subject, chapter, topic, and difficulty. Open a card only when you need the full details.
              </p>
            </div>
            <div className="text-sm text-slate-600 rounded-2xl border border-slate-200 bg-white/80 px-4 py-3">
              Total: {questions.length} | Filtered: {filteredQuestions.length}
            </div>
          </div>

          {/* Search and Filters */}
          <div className="grid grid-cols-1 md:grid-cols-7 gap-3 sm:gap-4">
            {/* Search Input */}
            <div className="md:col-span-3">
              <label className="block text-xs font-semibold tracking-[0.12em] uppercase text-slate-500 mb-2">
                Search
              </label>
              <input
                type="text"
                placeholder="Search questions, subjects, chapters, or topics..."
                className={controlClass}
                onChange={(e) => debouncedSetSearchTerm(e.target.value)}
              />
            </div>

            {/* Subject Filter */}
            <div>
              <label className="block text-xs font-semibold tracking-[0.12em] uppercase text-slate-500 mb-2">
                Subject
              </label>
              <select
                value={selectedSubject}
                onChange={(e) => {
                  setSelectedSubject(e.target.value);
                  setSelectedChapter('');
                  setSelectedTopic('');
                }}
                className={controlClass}
              >
                <option value="">All Subjects</option>
                {uniqueSubjects.map(subject => (
                  <option key={subject} value={subject}>{subject}</option>
                ))}
              </select>
            </div>

            {/* Chapter Filter */}
            <div>
              <label className="block text-xs font-semibold tracking-[0.12em] uppercase text-slate-500 mb-2">
                Chapter
              </label>
              <select
                value={selectedChapter}
                onChange={(e) => {
                  setSelectedChapter(e.target.value);
                  setSelectedTopic('');
                }}
                className={controlClass}
              >
                <option value="">All Chapters</option>
                {uniqueChapters.map(ch => (
                  <option key={ch} value={ch}>{ch}</option>
                ))}
              </select>
            </div>

            {/* Topic Filter */}
            <div>
              <label className="block text-xs font-semibold tracking-[0.12em] uppercase text-slate-500 mb-2">
                Topic
              </label>
              <select
                value={selectedTopic}
                onChange={(e) => setSelectedTopic(e.target.value)}
                className={controlClass}
              >
                <option value="">All Topics</option>
                {uniqueTopics.map(topic => (
                  <option key={topic} value={topic}>{topic}</option>
                ))}
              </select>
            </div>

            {/* Difficulty Filter */}
            <div>
              <label className="block text-xs font-semibold tracking-[0.12em] uppercase text-slate-500 mb-2">
                Difficulty
              </label>
              <select
                value={selectedDifficultyKey}
                onChange={(e) => setSelectedDifficultyKey(e.target.value)}
                className={controlClass}
              >
                <option value="">All Difficulties</option>
                {difficultyOptions.map(d => (
                  <option key={d.key} value={d.key}>{`Level ${d.level}${d.type ? ` — ${d.type}` : ''}`}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Reset Filters Button */}
          {(searchTerm || selectedSubject || selectedChapter || selectedTopic || selectedDifficultyKey) && (
            <div className="mt-4 flex flex-wrap items-center gap-2">
              {selectedSubject && <span className="inline-flex items-center rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">Subject: {selectedSubject}</span>}
              {selectedChapter && <span className="inline-flex items-center rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">Chapter: {selectedChapter}</span>}
              {selectedTopic && <span className="inline-flex items-center rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">Topic: {selectedTopic}</span>}
              {selectedDifficultyKey && <span className="inline-flex items-center rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">Difficulty filter on</span>}
              <button
                onClick={resetFilters}
                className="text-sm text-primary-600 hover:text-primary-800 font-medium"
              >
                Clear all filters
              </button>
            </div>
          )}

          <div className="mt-6 grid gap-4">
            <div className="rounded-2xl border border-slate-200 bg-white/80 p-4">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <p className="text-xs font-semibold tracking-[0.14em] uppercase text-slate-500">Structure summary</p>
                  <h3 className="text-lg font-semibold text-slate-900">
                    {selectedTopic
                      ? `Topic overview: ${selectedTopic}`
                      : selectedChapter
                      ? `Chapter overview: ${selectedChapter}`
                      : selectedSubject
                      ? `Subject overview: ${selectedSubject}`
                      : 'Subject overview'}
                  </h3>
                </div>
                <div className="grid grid-cols-2 gap-2 sm:flex sm:gap-3">
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2">
                    <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">Questions</div>
                    <div className="text-lg font-bold text-slate-900">{structuralQuestions.length}</div>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2">
                    <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">Chapters</div>
                    <div className="text-lg font-bold text-slate-900">{chapterSummaries.length}</div>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2">
                    <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">Topics</div>
                    <div className="text-lg font-bold text-slate-900">{topicSummaries.length}</div>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2">
                    <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">Levels</div>
                    <div className="text-lg font-bold text-slate-900">{levelSummaries.length || 0}</div>
                  </div>
                </div>
              </div>
            </div>

            {!selectedSubject && (
              <div className="rounded-2xl border border-slate-200 bg-white p-4">
                <div className="mb-4">
                  <p className="text-xs font-semibold tracking-[0.14em] uppercase text-slate-500">Subjects</p>
                  <h3 className="text-lg font-semibold text-slate-900">Each subject and how much it contains</h3>
                </div>
                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                  {subjectSummaries.map(item => (
                    <button
                      key={item.subject}
                      type="button"
                      onClick={() => {
                        setSelectedSubject(item.subject);
                        setSelectedChapter('');
                        setSelectedTopic('');
                      }}
                      className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-left transition hover:border-primary-300 hover:bg-primary-50"
                    >
                      <div className="text-base font-semibold text-slate-900">{item.subject}</div>
                      <div className="mt-3 grid grid-cols-3 gap-2 text-sm text-slate-600">
                        <div>
                          <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">Questions</div>
                          <div className="mt-1 font-bold text-slate-900">{item.questionCount}</div>
                        </div>
                        <div>
                          <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">Chapters</div>
                          <div className="mt-1 font-bold text-slate-900">{item.chapterCount}</div>
                        </div>
                        <div>
                          <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">Topics</div>
                          <div className="mt-1 font-bold text-slate-900">{item.topicCount}</div>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {selectedSubject && !selectedChapter && (
              <div className="rounded-2xl border border-slate-200 bg-white p-4">
                <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-xs font-semibold tracking-[0.14em] uppercase text-slate-500">Chapters in {selectedSubject}</p>
                    <h3 className="text-lg font-semibold text-slate-900">Each chapter and how many topics and questions it has</h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedSubject('');
                      setSelectedChapter('');
                      setSelectedTopic('');
                    }}
                    className="text-sm font-medium text-primary-700"
                  >
                    Back to all subjects
                  </button>
                </div>
                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                  {chapterSummaries.map(item => (
                    <button
                      key={item.chapter}
                      type="button"
                      onClick={() => {
                        setSelectedChapter(item.chapter === 'Unassigned Chapter' ? '' : item.chapter);
                        setSelectedTopic('');
                      }}
                      className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-left transition hover:border-primary-300 hover:bg-primary-50"
                    >
                      <div className="text-base font-semibold text-slate-900">{item.chapter}</div>
                      <div className="mt-3 grid grid-cols-2 gap-2 text-sm text-slate-600">
                        <div>
                          <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">Questions</div>
                          <div className="mt-1 font-bold text-slate-900">{item.questionCount}</div>
                        </div>
                        <div>
                          <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">Topics</div>
                          <div className="mt-1 font-bold text-slate-900">{item.topicCount}</div>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {selectedSubject && selectedChapter && (
              <div className="rounded-2xl border border-slate-200 bg-white p-4">
                <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-xs font-semibold tracking-[0.14em] uppercase text-slate-500">Topics in {selectedChapter}</p>
                    <h3 className="text-lg font-semibold text-slate-900">Each topic and how many questions it has</h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedChapter('');
                      setSelectedTopic('');
                    }}
                    className="text-sm font-medium text-primary-700"
                  >
                    Back to chapters
                  </button>
                </div>
                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                  {topicSummaries.map(item => (
                    <button
                      key={item.topic}
                      type="button"
                      onClick={() => setSelectedTopic(item.topic === 'Unassigned Topic' ? '' : item.topic)}
                      className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-left transition hover:border-primary-300 hover:bg-primary-50"
                    >
                      <div className="text-base font-semibold text-slate-900">{item.topic}</div>
                      <div className="mt-3">
                        <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">Questions</div>
                        <div className="mt-1 font-bold text-slate-900">{item.questionCount}</div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <div className="mb-4">
                <p className="text-xs font-semibold tracking-[0.14em] uppercase text-slate-500">Level distribution</p>
                <h3 className="text-lg font-semibold text-slate-900">How many questions are in each level</h3>
              </div>
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                {levelSummaries.length > 0 ? (
                  levelSummaries.map(item => (
                    <div key={item.level} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                      <div className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${item.info.color}`}>
                        {item.info.text}
                      </div>
                      <div className="mt-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">Questions</div>
                      <div className="mt-1 text-xl font-bold text-slate-900">{item.count}</div>
                    </div>
                  ))
                ) : (
                  <div className="text-sm text-slate-500">No level data available for this scope.</div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Questions List */}
        <div className="p-4 sm:p-6">
          {filteredQuestions.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-gray-400 mb-4">
                <svg className="mx-auto h-16 w-16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
              </div>
              <p className="text-gray-600 text-lg">
                {questions.length === 0 ? 'No questions found.' : 'No questions match your search criteria.'}
              </p>
              {questions.length === 0 && (
                <p className="text-gray-500 text-sm mt-2">
                  Upload your first question to get started!
                </p>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {filteredQuestions.map((question) => {
                const isExpanded = expandedQuestions.has(question.question_id);
                const difficultyInfo = getDifficultyInfo(question.difficulty_level);
                const difficultyType = (question as any).difficulty_type ?? '';
                const questionType = (question as any).question_type ?? '';
                // Normalize naming differences from backend (camelCase vs snake_case)
                const subjectName = (question as any).subjectName ?? question.subject_name;
                const topicName = (question as any).topicName ?? question.topic_name;
                const questionText = (question as any).questionText ?? question.question_text;
                const questionImage = (question as any).questionImage ?? (question as any).question_image ?? '';
                const explanation = (question as any).explanation ?? (question as any).explaination ?? (question as any).explanation_text ?? '';
                const explanationImage = (question as any).explanationImage ?? (question as any).explainationImage ?? (question as any).explanation_image ?? '';

                return (
                  <div key={question.question_id} className="border border-slate-200 rounded-2xl overflow-hidden bg-white shadow-sm">
                    {/* Question Header */}
                    <div 
                      className="p-4 sm:p-5 bg-slate-50 cursor-pointer hover:bg-slate-100 transition-colors"
                      onClick={() => toggleExpansion(question.question_id)}
                    >
                      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-3">
                        <div className="flex-1">
                          <div className="flex flex-wrap items-center gap-2 mb-2">
                            <span className="inline-flex items-center rounded-full bg-slate-900 px-3 py-1 text-xs font-semibold tracking-[0.08em] text-white">
                              #{question.question_id}
                            </span>
                            <span className="text-sm font-medium text-slate-700">{subjectName}</span>
                            {question.chapter_name && (
                              <>
                                <span className="text-sm text-slate-300">•</span>
                                <span className="text-sm text-slate-500">{question.chapter_name}</span>
                              </>
                            )}
                            <span className="text-sm text-slate-300">•</span>
                            <span className="text-sm text-slate-500">{topicName}</span>
                            {/* Badges inline on larger screens */}
                            <span className={`hidden sm:inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${difficultyInfo.color}`}>
                              {difficultyInfo.text}
                            </span>
                            {difficultyType && (
                              <span className="hidden sm:inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                                {difficultyType}
                              </span>
                            )}
                            {questionType && (
                              <span className="hidden sm:inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                {questionType}
                              </span>
                            )}
                          </div>
                          {/* Badges moved to second row on mobile for better wrap */}
                          <div className="flex sm:hidden items-center gap-2 mb-2">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${difficultyInfo.color}`}>
                              {difficultyInfo.text}
                            </span>
                            {difficultyType && (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                                {difficultyType}
                              </span>
                            )}
                            {questionType && (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                {questionType}
                              </span>
                            )}
                          </div>
                          <p className="text-slate-900 font-semibold text-base leading-7 line-clamp-2">
                            {questionText}
                          </p>
                          <p className="text-sm text-slate-500 mt-2">
                            {question.created_at && formatDate(question.created_at)} • {question.options.length} options
                          </p>
                        </div>
                        <div className="sm:ml-4 flex items-center space-x-2 sm:justify-end">
                          {pendingDeleteId === question.question_id ? (
                            <div className="flex items-center space-x-2" onClick={(e) => e.stopPropagation()}>
                              <button
                                onClick={() => confirmDelete(question.question_id)}
                                className="text-white bg-red-600 hover:bg-red-700 text-xs px-2 py-1 rounded"
                                title="Confirm delete"
                              >
                                Confirm
                              </button>
                              <button
                                onClick={cancelDelete}
                                className="text-gray-700 bg-gray-100 hover:bg-gray-200 text-xs px-2 py-1 rounded border border-gray-200"
                                title="Cancel"
                              >
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={(e) => { e.stopPropagation(); requestDelete(question.question_id); }}
                              className="text-red-600 hover:text-red-800 text-sm border border-red-200 px-3 py-2 rounded-xl bg-red-50"
                              title="Delete question"
                            >
                              Delete
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleExpansion(question.question_id);
                            }}
                            className="text-sm font-medium text-primary-700 bg-white border border-primary-200 px-3 py-2 rounded-xl hover:bg-primary-50"
                          >
                            {isExpanded ? 'Hide details' : 'Open details'}
                          </button>
                          <svg
                            className={`w-5 h-5 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        </div>
                      </div>
                    </div>

                    {/* Expanded Content */}
                    {isExpanded && (
                      <div className="p-4 sm:p-6 bg-white border-t border-gray-200">
                        {/* Question Image */}
                        {questionImage && (
                          <div className="mb-6">
                            <img
                              src={questionImage}
                              alt="Question"
                              className="w-full max-w-full sm:max-w-md h-auto rounded-lg border border-gray-200"
                            />
                          </div>
                        )}

                        {/* Options */}
                        <div className="mb-6">
                          <h4 className="font-medium text-gray-900 mb-3">Answer Options:</h4>
                          <div className="space-y-3">
                            {question.options.map((option, index) => (
                              <div
                                key={`${question.question_id}-option-${index}`}
                                className={`flex flex-col sm:flex-row sm:items-start sm:space-x-3 space-y-2 sm:space-y-0 p-3 rounded-lg ${
                                  option.is_correct ? 'bg-green-50 border border-green-200' : 'bg-gray-50'
                                }`}
                              >
                                <div className="flex-shrink-0 mt-1">
                                  {option.is_correct ? (
                                    <svg className="w-5 h-5 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                    </svg>
                                  ) : (
                                    <div className="w-5 h-5 border border-gray-400 rounded-full"></div>
                                  )}
                                </div>
                                <div className="flex-1">
                                  <div className="flex items-center space-x-2 mb-1">
                                    <span className="text-sm font-medium text-gray-700">Option {index + 1}</span>
                                    {option.is_correct && (
                                      <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">
                                        Correct
                                      </span>
                                    )}
                                  </div>
                                  {option.option_text && (
                                    <p className="text-gray-900 mb-2">{option.option_text}</p>
                                  )}
                                  {option.option_image && (
                                    <img
                                      src={option.option_image}
                                      alt={`Option ${index + 1}`}
                                      className="w-full max-w-full sm:max-w-xs h-auto rounded border border-gray-200"
                                    />
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Explanation */}
                        {(explanation || explanationImage) && (
                          <div>
                            <h4 className="font-medium text-gray-900 mb-3">Explanation:</h4>
                            {explanation && (
                              <p className="text-gray-700 mb-3">{explanation}</p>
                            )}
                            {explanationImage && (
                              <img
                                src={explanationImage}
                                alt="Explanation"
                                className="w-full max-w-full sm:max-w-md h-auto rounded-lg border border-gray-200"
                              />
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default QuestionsList;
