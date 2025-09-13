import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { GroupedQuestion } from '../types';
import { questionApi } from '../services/api';
import { groupQuestionsByQuestionId, formatDate, getDifficultyInfo, debounce, filterQuestions, getUniqueSubjects } from '../utils/dataProcessing';
import { useToast } from '../hooks/useToast';

const QuestionsList: React.FC = () => {
  const { showError, showSuccess } = useToast();
  const [questions, setQuestions] = useState<GroupedQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('');
  const [selectedDifficulty, setSelectedDifficulty] = useState<number | null>(null);
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

  // Debounced search to avoid excessive filtering
  const debouncedSetSearchTerm = useMemo(
    () => debounce((term: string) => setSearchTerm(term), 300),
    []
  );

  // Filter questions based on search criteria
  const filteredQuestions = useMemo(() => {
    return filterQuestions(questions, searchTerm, selectedSubject, selectedDifficulty);
  }, [questions, searchTerm, selectedSubject, selectedDifficulty]);

  // Get unique subjects for filter dropdown
  const uniqueSubjects = useMemo(() => {
    return getUniqueSubjects(questions);
  }, [questions]);

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
    setSelectedDifficulty(null);
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
      <div className="bg-white rounded-lg shadow-md">
        {/* Header */}
        <div className="p-4 sm:p-6 border-b border-gray-200">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-4 gap-3">
            <h2 className="text-2xl font-bold text-gray-900">Questions Database</h2>
            <div className="text-sm text-gray-600">
              Total: {questions.length} | Filtered: {filteredQuestions.length}
            </div>
          </div>

          {/* Search and Filters */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3 sm:gap-4">
            {/* Search Input */}
            <div className="md:col-span-2">
              <input
                type="text"
                placeholder="Search questions, subjects, or topics..."
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                onChange={(e) => debouncedSetSearchTerm(e.target.value)}
              />
            </div>

            {/* Subject Filter */}
            <div>
              <select
                value={selectedSubject}
                onChange={(e) => setSelectedSubject(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="">All Subjects</option>
                {uniqueSubjects.map(subject => (
                  <option key={subject} value={subject}>{subject}</option>
                ))}
              </select>
            </div>

            {/* Difficulty Filter */}
            <div>
              <select
                value={selectedDifficulty || ''}
                onChange={(e) => setSelectedDifficulty(e.target.value ? parseInt(e.target.value) : null)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="">All Difficulties</option>
                <option value="1">1 - Very Easy</option>
                <option value="2">2</option>
                <option value="3">3 - Easy</option>
                <option value="4">4</option>
                <option value="5">5 - Medium</option>
                <option value="6">6</option>
                <option value="7">7 - Hard</option>
                <option value="8">8</option>
                <option value="9">9</option>
                <option value="10">10 - Very Hard</option>
              </select>
            </div>
          </div>

          {/* Reset Filters Button */}
          {(searchTerm || selectedSubject || selectedDifficulty) && (
            <div className="mt-4">
              <button
                onClick={resetFilters}
                className="text-sm text-primary-600 hover:text-primary-800 font-medium"
              >
                Clear all filters
              </button>
            </div>
          )}
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
                // Normalize naming differences from backend (camelCase vs snake_case)
                const subjectName = (question as any).subjectName ?? question.subject_name;
                const topicName = (question as any).topicName ?? question.topic_name;
                const questionText = (question as any).questionText ?? question.question_text;
                const questionImage = (question as any).questionImage ?? (question as any).question_image ?? '';
                const explanation = (question as any).explanation ?? (question as any).explaination ?? (question as any).explanation_text ?? '';
                const explanationImage = (question as any).explanationImage ?? (question as any).explainationImage ?? (question as any).explanation_image ?? '';

                return (
                  <div key={question.question_id} className="border border-gray-200 rounded-lg overflow-hidden">
                    {/* Question Header */}
                    <div 
                      className="p-4 bg-gray-50 cursor-pointer hover:bg-gray-100 transition-colors"
                      onClick={() => toggleExpansion(question.question_id)}
                    >
                      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-3">
                        <div className="flex-1">
                          <div className="flex items-center space-x-3 mb-2">
                            <span className="text-sm font-medium text-gray-600">#{question.question_id}</span>
                            <span className="text-sm text-gray-500">{subjectName}</span>
                            <span className="text-sm text-gray-400">•</span>
                            <span className="text-sm text-gray-500">{topicName}</span>
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${difficultyInfo.color}`}>
                              {difficultyInfo.text}
                            </span>
                            {difficultyType && (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                                {difficultyType}
                              </span>
                            )}
                          </div>
                          <p className="text-gray-900 font-medium line-clamp-2">
                            {questionText}
                          </p>
                          <p className="text-sm text-gray-500 mt-1">
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
                              className="text-red-600 hover:text-red-800 text-sm border border-red-200 px-2 py-1 rounded-md bg-red-50"
                              title="Delete question"
                            >
                              Delete
                            </button>
                          )}
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
