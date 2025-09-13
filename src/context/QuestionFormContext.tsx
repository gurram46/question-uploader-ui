import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { QuestionForm, ValidationError } from '../types';

type QuestionFormContextValue = {
  form: QuestionForm;
  setForm: React.Dispatch<React.SetStateAction<QuestionForm>>;
  validationErrors: ValidationError[];
  setValidationErrors: React.Dispatch<React.SetStateAction<ValidationError[]>>;
  isLoading: boolean;
  setIsLoading: React.Dispatch<React.SetStateAction<boolean>>;
};

const QuestionFormContext = createContext<QuestionFormContextValue | undefined>(undefined);

const DEFAULT_FORM: QuestionForm = {
  subjectName: '',
  chapterName: '',
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
};

const STORAGE_KEY = 'questionUploader.form';

const sanitizeForPersist = (form: QuestionForm): QuestionForm => ({
  ...form,
  questionImage: null,
  explanationImage: null,
  options: form.options.map(o => ({ ...o, option_image: null })),
});

export const QuestionFormProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [form, setForm] = useState<QuestionForm>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        // Basic shape merge with defaults to avoid missing fields
        return {
          ...DEFAULT_FORM,
          ...parsed,
          options: (parsed.options || DEFAULT_FORM.options).map((o: any, i: number) => ({
            option_text: o?.option_text || '',
            option_image: null,
            is_correct: !!o?.is_correct,
          })).slice(0, 4),
        } as QuestionForm;
      }
    } catch (_) {
      // ignore
    }
    return DEFAULT_FORM;
  });

  const [validationErrors, setValidationErrors] = useState<ValidationError[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Persist non-file fields so switching views keeps defaults
  useEffect(() => {
    try {
      const safe = sanitizeForPersist(form);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(safe));
    } catch (_) {
      // ignore storage errors
    }
  }, [form]);

  const value = useMemo(() => ({
    form,
    setForm,
    validationErrors,
    setValidationErrors,
    isLoading,
    setIsLoading,
  }), [form, validationErrors, isLoading]);

  return (
    <QuestionFormContext.Provider value={value}>
      {children}
    </QuestionFormContext.Provider>
  );
};

export const useQuestionForm = (): QuestionFormContextValue => {
  const ctx = useContext(QuestionFormContext);
  if (!ctx) {
    throw new Error('useQuestionForm must be used within a QuestionFormProvider');
  }
  return ctx;
};

export default QuestionFormContext;
