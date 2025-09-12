import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { QuestionForm, FormOption } from '../types';
import { validateQuestionForm } from '../utils/validation';
import { createQuestionFormData } from '../services/uploadService';
import { questionApi, difficultyApi } from '../services/api';
import { useToast } from '../hooks/useToast';
import { useQuestionForm } from '../context/QuestionFormContext';

const QuestionUploadForm: React.FC = () => {
  const { showSuccess, showError } = useToast();
  const { form, setForm, validationErrors, setValidationErrors, isLoading, setIsLoading } = useQuestionForm();

  // Difficulties state (simplified UI)
  const [isLoadingDifficulties, setIsLoadingDifficulties] = useState(false);
  const [selectedLevel, setSelectedLevel] = useState<number>(1);
  const [newDifficultyType, setNewDifficultyType] = useState<string>('');
  const [levelToNumericId, setLevelToNumericId] = useState<Map<number, number | string>>(new Map());
  const [isCreatingDifficulty, setIsCreatingDifficulty] = useState(false);

  // Derive numeric ids from existing questions only (no hashed id support here)
  useEffect(() => {
    const fetchAll = async () => {
      setIsLoadingDifficulties(true);
      try {
        const rows = await questionApi.getQuestions();
        const byLevel: Map<number, number | string> = new Map();
        rows.forEach((r: any) => {
          const lvl = Number(r?.difficulty_level ?? 0);
          const id = (r as any)?.difficulty_id;
          if (Number.isFinite(lvl) && lvl >= 1 && id !== undefined && id !== null) {
            if (!byLevel.has(lvl)) byLevel.set(lvl, id);
          }
        });
        setLevelToNumericId(byLevel);
        const initialLevel = Number(form.difficultyLevel) || 1;
        const normalized = [1, 2, 3].includes(initialLevel) ? initialLevel : 1;
        setSelectedLevel(normalized);
      } catch (_) {
        // Silent; UI still usable with fallback
      } finally {
        setIsLoadingDifficulties(false);
      }
    };
    fetchAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.difficultyLevel]);

  // Resolve numeric id (level-only)
  const selectedNumericDifficultyId = useMemo(() => {
    const id = levelToNumericId.get(selectedLevel);
    if (id === undefined || id === null) return undefined;
    const n = Number(id);
    return Number.isFinite(n) ? n : undefined;
  }, [levelToNumericId, selectedLevel]);

  // Handlers
  const handleInputChange = useCallback((field: keyof QuestionForm, value: string | number) => {
    setForm(prev => ({
      ...prev,
      [field]: value
    }));
    setValidationErrors(prev => prev.filter(error => error.field !== field));
  }, [setForm, setValidationErrors]);

  const handleFileChange = useCallback((field: keyof QuestionForm, file: File | null) => {
    setForm(prev => ({
      ...prev,
      [field]: file
    }));
  }, [setForm]);

  const handleOptionChange = useCallback((index: number, field: keyof FormOption, value: string | File | null | boolean) => {
    setForm(prev => ({
      ...prev,
      options: prev.options.map((option, i) => i === index ? { ...option, [field]: value } : option)
    }));
    setValidationErrors(prev => prev.filter(error => error.field !== 'options'));
  }, [setForm, setValidationErrors]);

  const getFieldError = useCallback((field: string): string | undefined => {
    const error = validationErrors.find(err => err.field === field);
    return error?.message;
  }, [validationErrors]);

  // Create a new difficulty (level + type)
  const handleCreateDifficulty = useCallback(async () => {
    const type = newDifficultyType.trim();
    const lvl = Number(selectedLevel);
    if (!type) {
      showError('Please enter a difficulty type (e.g., facts, statements).');
      return;
    }
    if (![1,2,3].includes(lvl)) {
      showError('Please select a valid level (1, 2, or 3).');
      return;
    }
    try {
      setIsCreatingDifficulty(true);
      await difficultyApi.createDifficulty(lvl, type);
      setNewDifficultyType('');
      showSuccess(`Difficulty added: Level ${lvl} - ${type}`);
      // Refetch mapping from questions (new difficulty may not appear until used by some question)
      try {
        const rows = await questionApi.getQuestions();
        const byLevel: Map<number, number | string> = new Map(levelToNumericId);
        rows.forEach((r: any) => {
          const l = Number(r?.difficulty_level ?? 0);
          const id = (r as any)?.difficulty_id;
          if (Number.isFinite(l) && l >= 1 && id !== undefined && id !== null && !byLevel.has(l)) {
            byLevel.set(l, id);
          }
        });
        setLevelToNumericId(byLevel);
      } catch {}
    } catch (e: any) {
      const msg = e?.message || 'Failed to create difficulty';
      showError(msg);
    } finally {
      setIsCreatingDifficulty(false);
    }
  }, [newDifficultyType, selectedLevel, showError, showSuccess, setIsLoading, levelToNumericId]);

  // Submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const errors = validateQuestionForm(form);
    if (errors.length > 0) {
      setValidationErrors(errors);
      showError('Please fix the validation errors before submitting.');
      return;
    }

    setIsLoading(true);
    try {
      if (selectedNumericDifficultyId === undefined) {
        showError('Difficulty not configured yet. Please select a difficulty that has a numeric id.');
        setIsLoading(false);
        return;
      }

      const formData = createQuestionFormData(form, { difficultyId: String(selectedNumericDifficultyId) });
      await questionApi.uploadQuestion(formData);

      setForm({
        subjectName: form.subjectName,
        topicName: form.topicName,
        difficultyLevel: form.difficultyLevel,
        questionText: '',
        questionImage: null,
        options: [
          { option_text: '', option_image: null, is_correct: false },
          { option_text: '', option_image: null, is_correct: false },
          { option_text: '', option_image: null, is_correct: false },
          { option_text: '', option_image: null, is_correct: false },
        ],
        explanation: '',
        explanationImage: null,
      });
      setValidationErrors([]);
      showSuccess('Question uploaded successfully!');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to upload question. Please try again.';
      showError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="bg-white rounded-lg shadow-md p-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Upload New Question</h2>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Subject Name */}
          <div>
            <label htmlFor="subjectName" className="block text-sm font-medium text-gray-700 mb-2">Subject Name *</label>
            <input
              type="text"
              id="subjectName"
              value={form.subjectName}
              onChange={(e) => handleInputChange('subjectName', e.target.value)}
              className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 ${getFieldError('subjectName') ? 'border-red-500' : 'border-gray-300'}`}
              placeholder="Enter subject name (letters only)"
              disabled={isLoading}
            />
            {getFieldError('subjectName') && (<p className="mt-1 text-sm text-red-600">{getFieldError('subjectName')}</p>)}
          </div>

          {/* Topic Name */}
          <div>
            <label htmlFor="topicName" className="block text-sm font-medium text-gray-700 mb-2">Topic Name *</label>
            <input
              type="text"
              id="topicName"
              value={form.topicName}
              onChange={(e) => handleInputChange('topicName', e.target.value)}
              className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 ${getFieldError('topicName') ? 'border-red-500' : 'border-gray-300'}`}
              placeholder="Enter topic name (letters and numbers)"
              disabled={isLoading}
            />
            {getFieldError('topicName') && (<p className="mt-1 text-sm text-red-600">{getFieldError('topicName')}</p>)}
          </div>

          {/* Difficulty Level */}
          <div>
            <label htmlFor="difficultyLevel" className="block text-sm font-medium text-gray-700 mb-2">Difficulty Level *</label>
            <select
              id="difficultyLevel"
              value={String(selectedLevel)}
              onChange={(e) => {
                const v = Number(e.target.value);
                const level = [1,2,3].includes(v) ? v : 1;
                setSelectedLevel(level);
                handleInputChange('difficultyLevel', level);
              }}
              className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 ${getFieldError('difficultyLevel') ? 'border-red-500' : 'border-gray-300'}`}
              disabled={isLoading}
            >
              {[1,2,3].map(lvl => (
                <option key={lvl} value={String(lvl)}>{`Level ${lvl}`}</option>
              ))}
            </select>
            {getFieldError('difficultyLevel') && (<p className="mt-1 text-sm text-red-600">{getFieldError('difficultyLevel')}</p>)}
            {isLoadingDifficulties && (<p className="mt-1 text-sm text-gray-500">Loading difficulties...</p>)}

            {/* Add Difficulty Type */}
            <div className="mt-3 flex gap-2">
              <input
                type="text"
                placeholder="Add difficulty type (e.g., facts)"
                value={newDifficultyType}
                onChange={(e) => setNewDifficultyType(e.target.value)}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                disabled={isLoading}
              />
              <button
                type="button"
                onClick={handleCreateDifficulty}
                className="px-4 py-2 rounded-md bg-primary-600 text-white hover:bg-primary-700 disabled:bg-gray-400"
                disabled={isCreatingDifficulty || !newDifficultyType.trim()}
              >
                {isCreatingDifficulty ? 'Adding...' : 'Add'}
              </button>
            </div>
          </div>

          {/* Question Text */}
          <div>
            <label htmlFor="questionText" className="block text-sm font-medium text-gray-700 mb-2">Question Text *</label>
            <textarea
              id="questionText"
              value={form.questionText}
              onChange={(e) => handleInputChange('questionText', e.target.value)}
              rows={4}
              className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 ${getFieldError('questionText') ? 'border-red-500' : 'border-gray-300'}`}
              placeholder="Enter the question text..."
              disabled={isLoading}
            />
            {getFieldError('questionText') && (<p className="mt-1 text-sm text-red-600">{getFieldError('questionText')}</p>)}
          </div>

          {/* Question Image */}
          <div>
            <label htmlFor="questionImage" className="block text-sm font-medium text-gray-700 mb-2">Question Image (Optional)</label>
            <input
              type="file"
              id="questionImage"
              accept="image/*"
              onChange={(e) => handleFileChange('questionImage', e.target.files?.[0] || null)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              disabled={isLoading}
            />
            <p className="mt-1 text-sm text-gray-500">Accepted formats: JPG, PNG, WebP. Max size: 5MB</p>
          </div>

          {/* Options */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">Answer Options *</h3>
            <p className="text-sm text-gray-600 mb-4">Fill at least 2 options and mark at least 1 as correct. Each option must have either text or an image.</p>

            <div className="space-y-3">
              {form.options.map((option, index) => (
                <div key={index} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center gap-3">
                    <div className="flex-shrink-0">
                      <span className="inline-flex items-center justify-center h-8 w-8 rounded-full bg-gray-100 text-sm font-medium text-gray-700">{index + 1}</span>
                    </div>

                    <div className="flex-grow">
                      <input
                        type="text"
                        value={option.option_text}
                        onChange={(e) => handleOptionChange(index, 'option_text', e.target.value)}
                        placeholder={`Option ${index + 1} text...`}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                        disabled={isLoading}
                      />
                    </div>

                    <div className="flex-shrink-0">
                      <label className="cursor-pointer inline-flex items-center px-3 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-primary-500">
                        <svg className="mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                        {option.option_image ? 'Change' : 'Add Image'}
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => handleOptionChange(index, 'option_image', e.target.files?.[0] || null)}
                          className="sr-only"
                          disabled={isLoading}
                        />
                      </label>
                      {option.option_image && (
                        <button type="button" onClick={() => handleOptionChange(index, 'option_image', null)} className="ml-2 text-sm text-red-600 hover:text-red-500" disabled={isLoading}>Remove</button>
                      )}
                    </div>

                    <div className="flex-shrink-0">
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={option.is_correct}
                          onChange={(e) => handleOptionChange(index, 'is_correct', e.target.checked)}
                          className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                          disabled={isLoading}
                        />
                        <span className="ml-2 text-sm text-gray-700 whitespace-nowrap">Correct</span>
                      </label>
                    </div>
                  </div>

                  {option.option_image && (
                    <div className="mt-2 ml-11 text-sm text-gray-500">Image: {option.option_image.name}</div>
                  )}
                </div>
              ))}
            </div>

            {getFieldError('options') && (<p className="mt-2 text-sm text-red-600">{getFieldError('options')}</p>)}
          </div>

          {/* Explanation */}
          <div>
            <label htmlFor="explanation" className="block text-sm font-medium text-gray-700 mb-2">Explanation (Optional)</label>
            <textarea
              id="explanation"
              value={form.explanation}
              onChange={(e) => handleInputChange('explanation', e.target.value)}
              rows={3}
              className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 ${getFieldError('explanation') ? 'border-red-500' : 'border-gray-300'}`}
              placeholder="Optional explanation for the answer..."
              disabled={isLoading}
            />
            {getFieldError('explanation') && (<p className="mt-1 text-sm text-red-600">{getFieldError('explanation')}</p>)}
          </div>

          {/* Explanation Image */}
          <div>
            <label htmlFor="explanationImage" className="block text-sm font-medium text-gray-700 mb-2">Explanation Image (Optional)</label>
            <input
              type="file"
              id="explanationImage"
              accept="image/*"
              onChange={(e) => handleFileChange('explanationImage', e.target.files?.[0] || null)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              disabled={isLoading}
            />
          </div>

          {/* Submit Button */}
          <div className="pt-4">
            <button
              type="submit"
              disabled={isLoading || selectedNumericDifficultyId === undefined}
              className={`w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white ${isLoading ? 'bg-gray-400 cursor-not-allowed' : 'bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500'}`}
            >
              {isLoading ? (
                <>
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Uploading...
                </>
              ) : (
                'Upload Question'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default QuestionUploadForm;
export {};
