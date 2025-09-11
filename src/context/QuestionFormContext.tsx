import React, { createContext, useContext, useMemo, useState } from 'react';
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

export const QuestionFormProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
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

  const [validationErrors, setValidationErrors] = useState<ValidationError[]>([]);
  const [isLoading, setIsLoading] = useState(false);

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

