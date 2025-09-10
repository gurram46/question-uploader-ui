import React, { useState, useCallback } from 'react';
import { QuestionForm, FormOption, ValidationError } from '../types';
import { validateQuestionForm } from '../utils/validation';
import { createFormDataFromQuestion } from '../services/s3Upload';
import { questionApi } from '../services/api';
import { useToast } from '../hooks/useToast';

const QuestionUploadForm: React.FC = () => {
  const { showSuccess, showError } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [validationErrors, setValidationErrors] = useState<ValidationError[]>([]);

  // Initial form state
  const [form, setForm] = useState<QuestionForm>({
    subjectName: '',
    topicName: '',
    difficultyLevel: 1,
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

  // Handle text input changes
  const handleInputChange = useCallback((field: keyof QuestionForm, value: string | number) => {
    setForm(prev => ({
      ...prev,
      [field]: value
    }));
    // Clear validation errors for this field
    setValidationErrors(prev => prev.filter(error => error.field !== field));
  }, []);

  // Handle file input changes
  const handleFileChange = useCallback((field: keyof QuestionForm, file: File | null) => {
    setForm(prev => ({
      ...prev,
      [field]: file
    }));
  }, []);

  // Handle option changes
  const handleOptionChange = useCallback((index: number, field: keyof FormOption, value: string | File | null | boolean) => {
    setForm(prev => ({
      ...prev,
      options: prev.options.map((option, i) => 
        i === index ? { ...option, [field]: value } : option
      )
    }));
    // Clear validation errors for options
    setValidationErrors(prev => prev.filter(error => error.field !== 'options'));
  }, []);

  // Get validation error for a field
  const getFieldError = useCallback((field: string): string | undefined => {
    const error = validationErrors.find(err => err.field === field);
    return error?.message;
  }, [validationErrors]);

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate form
    const errors = validateQuestionForm(form);
    if (errors.length > 0) {
      setValidationErrors(errors);
      showError('Please fix the validation errors before submitting.');
      return;
    }

    setIsLoading(true);
    try {
      // Create FormData from the form
      const formData = createFormDataFromQuestion(form);

      // Submit to API
      await questionApi.uploadQuestion(formData);

      // Reset form on success
      setForm({
        subjectName: '',
        topicName: '',
        difficultyLevel: 1,
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

    } catch (error: any) {
      console.error('Upload error:', error);
      showError(error.message || 'Failed to upload question. Please try again.');
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
            <label htmlFor="subjectName" className="block text-sm font-medium text-gray-700 mb-2">
              Subject Name *
            </label>
            <input
              type="text"
              id="subjectName"
              value={form.subjectName}
              onChange={(e) => handleInputChange('subjectName', e.target.value)}
              className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 ${
                getFieldError('subjectName') ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="Enter subject name (letters only)"
              disabled={isLoading}
            />
            {getFieldError('subjectName') && (
              <p className="mt-1 text-sm text-red-600">{getFieldError('subjectName')}</p>
            )}
          </div>

          {/* Topic Name */}
          <div>
            <label htmlFor="topicName" className="block text-sm font-medium text-gray-700 mb-2">
              Topic Name *
            </label>
            <input
              type="text"
              id="topicName"
              value={form.topicName}
              onChange={(e) => handleInputChange('topicName', e.target.value)}
              className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 ${
                getFieldError('topicName') ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="Enter topic name (letters and numbers)"
              disabled={isLoading}
            />
            {getFieldError('topicName') && (
              <p className="mt-1 text-sm text-red-600">{getFieldError('topicName')}</p>
            )}
          </div>

          {/* Difficulty Level */}
          <div>
            <label htmlFor="difficultyLevel" className="block text-sm font-medium text-gray-700 mb-2">
              Difficulty Level *
            </label>
            <select
              id="difficultyLevel"
              value={form.difficultyLevel}
              onChange={(e) => handleInputChange('difficultyLevel', parseInt(e.target.value))}
              className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 ${
                getFieldError('difficultyLevel') ? 'border-red-500' : 'border-gray-300'
              }`}
              disabled={isLoading}
            >
              <option value={1}>1 - Very Easy</option>
              <option value={2}>2 - Easy</option>
              <option value={3}>3 - Medium</option>
              <option value={4}>4 - Hard</option>
              <option value={5}>5 - Very Hard</option>
            </select>
            {getFieldError('difficultyLevel') && (
              <p className="mt-1 text-sm text-red-600">{getFieldError('difficultyLevel')}</p>
            )}
          </div>

          {/* Question Text */}
          <div>
            <label htmlFor="questionText" className="block text-sm font-medium text-gray-700 mb-2">
              Question Text *
            </label>
            <textarea
              id="questionText"
              value={form.questionText}
              onChange={(e) => handleInputChange('questionText', e.target.value)}
              rows={4}
              className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 ${
                getFieldError('questionText') ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="Enter the question text..."
              disabled={isLoading}
            />
            {getFieldError('questionText') && (
              <p className="mt-1 text-sm text-red-600">{getFieldError('questionText')}</p>
            )}
          </div>

          {/* Question Image */}
          <div>
            <label htmlFor="questionImage" className="block text-sm font-medium text-gray-700 mb-2">
              Question Image (Optional)
            </label>
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
            <p className="text-sm text-gray-600 mb-4">
              Fill at least 2 options and mark at least 1 as correct. Each option must have either text or an image.
            </p>
            
            <div className="space-y-4">
              {form.options.map((option, index) => (
                <div key={index} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-medium text-gray-700">Option {index + 1}</h4>
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={option.is_correct}
                        onChange={(e) => handleOptionChange(index, 'is_correct', e.target.checked)}
                        className="mr-2 h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                        disabled={isLoading}
                      />
                      <span className="text-sm text-gray-700">Correct Answer</span>
                    </label>
                  </div>
                  
                  <div className="space-y-3">
                    <input
                      type="text"
                      value={option.option_text}
                      onChange={(e) => handleOptionChange(index, 'option_text', e.target.value)}
                      placeholder={`Option ${index + 1} text...`}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                      disabled={isLoading}
                    />
                    
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleOptionChange(index, 'option_image', e.target.files?.[0] || null)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                      disabled={isLoading}
                    />
                  </div>
                </div>
              ))}
            </div>
            
            {getFieldError('options') && (
              <p className="mt-2 text-sm text-red-600">{getFieldError('options')}</p>
            )}
          </div>

          {/* Explanation */}
          <div>
            <label htmlFor="explanation" className="block text-sm font-medium text-gray-700 mb-2">
              Explanation (Optional)
            </label>
            <textarea
              id="explanation"
              value={form.explanation}
              onChange={(e) => handleInputChange('explanation', e.target.value)}
              rows={3}
              className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 ${
                getFieldError('explanation') ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="Optional explanation for the answer..."
              disabled={isLoading}
            />
            {getFieldError('explanation') && (
              <p className="mt-1 text-sm text-red-600">{getFieldError('explanation')}</p>
            )}
          </div>

          {/* Explanation Image */}
          <div>
            <label htmlFor="explanationImage" className="block text-sm font-medium text-gray-700 mb-2">
              Explanation Image (Optional)
            </label>
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
              className={`w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white ${
                isLoading 
                  ? 'bg-gray-400 cursor-not-allowed' 
                  : 'bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500'
              }`}
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
