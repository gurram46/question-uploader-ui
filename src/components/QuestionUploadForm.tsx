import React, { useCallback, useEffect, useState } from 'react';
import { QuestionForm, FormOption, QuestionType } from '../types';
import { validateQuestionForm } from '../utils/validation';
import { createQuestionFormData } from '../services/uploadService';
import { questionApi, difficultyApi, questionTypeApi } from '../services/api';
import { useToast } from '../hooks/useToast';
import { useQuestionForm } from '../context/QuestionFormContext';

const QuestionUploadForm: React.FC = () => {
  const { showSuccess, showError } = useToast();
  const { form, setForm, validationErrors, setValidationErrors, isLoading, setIsLoading } = useQuestionForm();

  // Difficulty selection sourced from backend
  const [selectedLevel, setSelectedLevel] = useState<number>(1);
  const [difficultyOptions, setDifficultyOptions] = useState<Array<{ idStr: string; idNum?: number; level: number; type: string }>>([]);
  const [selectedDifficultyIdStr, setSelectedDifficultyIdStr] = useState<string | undefined>(undefined);

  // Question type selection sourced from backend
  const [questionTypes, setQuestionTypes] = useState<QuestionType[]>([]);

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

  // Load difficulty options; prefer /getdifficulties (raw/encoded ids), fallback to /getquestions
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const diffs = await difficultyApi.getDifficulties();
        const uniq = new Map<string, { idStr: string; idNum?: number; level: number; type: string }>();
        diffs.forEach((d: any) => {
          const lvl = Number(d?.difficulty_level);
          const type = String(d?.difficulty_type || '');
          const rawMaybe = d?.difficulty_id_raw ?? (typeof d?.difficulty_id === 'number' ? d.difficulty_id : undefined);
          const idNum = Number.isFinite(Number(rawMaybe)) ? Number(rawMaybe) : undefined;
          const idStr = (d?.difficulty_id !== undefined) ? String(d.difficulty_id) : (idNum !== undefined ? String(idNum) : '');
          if (idStr && Number.isFinite(lvl) && type) {
            if (!uniq.has(idStr)) uniq.set(idStr, { idStr, idNum, level: lvl, type });
          }
        });
        let all = Array.from(uniq.values());
        // Fallback to /getquestions if nothing usable returned
        if (all.length === 0) {
          const rows = await questionApi.getQuestions();
          const uniqQ = new Map<string, { idStr: string; idNum?: number; level: number; type: string }>();
          rows.forEach((r: any) => {
            const idNumQ = Number(r?.difficulty_id);
            const lvl = Number(r?.difficulty_level);
            const type = String(r?.difficulty_type || '');
            if (Number.isFinite(idNumQ) && Number.isFinite(lvl) && type) {
              const idStrQ = String(idNumQ);
              if (!uniqQ.has(idStrQ)) uniqQ.set(idStrQ, { idStr: idStrQ, idNum: idNumQ, level: lvl, type });
            }
          });
          all = Array.from(uniqQ.values());
        }
        if (!cancelled) setDifficultyOptions(all);
      } catch (err) {
        // Silently ignore; submit will handle missing selection
      }
    })();
    return () => { cancelled = true; };
  }, [selectedLevel]);

  // Whenever level changes, default to first available difficulty for that level
  useEffect(() => {
    const match = difficultyOptions.find(d => d.level === Number(selectedLevel));
    setSelectedDifficultyIdStr(match?.idStr);
  }, [selectedLevel, difficultyOptions]);

  // Load question types
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const types = await questionTypeApi.getQuestionTypes();
        if (!cancelled) setQuestionTypes(types);
      } catch (err) {
        // Silently ignore; submit will handle missing selection
        console.error('Error fetching question types:', err);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const errors = validateQuestionForm(form);
    if (errors.length > 0) {
      setValidationErrors(errors);
      showError('Please fix the validation errors before submitting.');
      return;
    }

    // Ensure a difficulty (with numeric ID) is selected
    const selected = difficultyOptions.find(d => d.idStr === selectedDifficultyIdStr);
    if (!selected) {
      showError('Please select a difficulty.');
      return;
    }

    setIsLoading(true);
    try {
      // Upload with selected difficulty id (prefer numeric; else use idStr)
      const toSend = selected.idNum !== undefined ? String(selected.idNum) : selected.idStr;
      const formData = createQuestionFormData(form, { difficultyId: toSend });
      await questionApi.uploadQuestion(formData);

      setForm({
        subjectName: form.subjectName,
        chapterName: form.chapterName,
        topicName: form.topicName,
        difficultyLevel: form.difficultyLevel,
        questionType: '',
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
      setSelectedDifficultyIdStr(undefined);
      showSuccess('Question uploaded successfully!');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to upload question. Please try again.';
      showError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6">
      <div className="bg-white rounded-lg shadow-md p-4 sm:p-6 md:p-8">
        <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-6">Upload New Question</h2>

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

          {/* Chapter Name */}
          <div>
            <label htmlFor="chapterName" className="block text-sm font-medium text-gray-700 mb-2">Chapter Name *</label>
            <input
              type="text"
              id="chapterName"
              value={form.chapterName}
              onChange={(e) => handleInputChange('chapterName', e.target.value)}
              className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 ${getFieldError('chapterName') ? 'border-red-500' : 'border-gray-300'}`}
              placeholder="Enter chapter name (letters and numbers)"
              disabled={isLoading}
            />
            {getFieldError('chapterName') && (<p className="mt-1 text-sm text-red-600">{getFieldError('chapterName')}</p>)}
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

          {/* Difficulty Selection */}
          <div>
            <label htmlFor="difficulty" className="block text-sm font-medium text-gray-700 mb-2">Difficulty (Level — Type) *</label>
            <select
              id="difficulty"
              value={selectedDifficultyIdStr ?? ''}
              onChange={(e) => {
                const idStr = e.target.value || undefined;
                setSelectedDifficultyIdStr(idStr);
                const chosen = difficultyOptions.find(d => d.idStr === idStr);
                if (chosen) {
                  setSelectedLevel(chosen.level);
                  handleInputChange('difficultyLevel', chosen.level);
                }
              }}
              className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 ${getFieldError('difficultyLevel') ? 'border-red-500' : 'border-gray-300'}`}
              disabled={isLoading}
            >
              <option value="">Select difficulty</option>
              {difficultyOptions.map(d => (
                <option key={d.idStr} value={d.idStr}>{`Level ${d.level} — ${d.type}`}</option>
              ))}
            </select>
            {getFieldError('difficultyLevel') && (<p className="mt-1 text-sm text-red-600">{getFieldError('difficultyLevel')}</p>)}
          </div>

          {/* Question Type Selection */}
          <div>
            <label htmlFor="questionType" className="block text-sm font-medium text-gray-700 mb-2">Question Type *</label>
            <select
              id="questionType"
              value={form.questionType}
              onChange={(e) => handleInputChange('questionType', e.target.value)}
              className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 ${getFieldError('questionType') ? 'border-red-500' : 'border-gray-300'}`}
              disabled={isLoading}
            >
              <option value="">Select question type</option>
              {questionTypes.map((type, index) => (
                <option key={index} value={type.question_type}>{type.question_type}</option>
              ))}
            </select>
            {getFieldError('questionType') && (<p className="mt-1 text-sm text-red-600">{getFieldError('questionType')}</p>)}
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
                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
                    <div className="sm:col-span-1">
                      <span className="inline-flex items-center justify-center h-8 w-8 rounded-full bg-gray-100 text-sm font-medium text-gray-700">{index + 1}</span>
                    </div>

                    <div className="sm:col-span-7">
                      <input
                        type="text"
                        value={option.option_text}
                        onChange={(e) => handleOptionChange(index, 'option_text', e.target.value)}
                        placeholder={`Option ${index + 1} text...`}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                        disabled={isLoading}
                      />
                    </div>

                    <div className="sm:col-span-3 h-10 flex items-center">
                      <label className="w-full sm:w-auto justify-center sm:justify-start cursor-pointer inline-flex items-center px-3 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-primary-500">
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

                    <div className="sm:col-span-1 h-10 flex items-center justify-end sm:justify-end self-center">
                      <label className="inline-flex items-center">
                        <input
                          type="checkbox"
                          checked={option.is_correct}
                          onChange={(e) => handleOptionChange(index, 'is_correct', e.target.checked)}
                          className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                          disabled={isLoading}
                        />
                        <span className="ml-2 text-sm text-gray-700 whitespace-nowrap select-none">Correct</span>
                      </label>
                    </div>
                  </div>

                  {option.option_image && (
                    <div className="mt-2 sm:ml-11 text-sm text-gray-500 break-words">Image: {option.option_image.name}</div>
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
              disabled={isLoading}
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
