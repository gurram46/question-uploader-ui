import { QuestionForm, ValidationError } from '../types';

// Sanitize string input to prevent XSS
export const sanitizeString = (input: string): string => {
  return input
    .trim()
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
};

// Validate subject name (letters only)
export const validateSubjectName = (subjectName: string): string[] => {
  const errors: string[] = [];
  const trimmed = subjectName.trim();
  
  if (!trimmed) {
    errors.push('Subject name is required');
  } else if (!/^[a-zA-Z\s]+$/.test(trimmed)) {
    errors.push('Subject name can only contain letters and spaces');
  } else if (trimmed.length < 2) {
    errors.push('Subject name must be at least 2 characters long');
  } else if (trimmed.length > 50) {
    errors.push('Subject name must be less than 50 characters');
  }
  
  return errors;
};

// Validate topic name (letters and numbers)
export const validateTopicName = (topicName: string): string[] => {
  const errors: string[] = [];
  const trimmed = topicName.trim();
  
  if (!trimmed) {
    errors.push('Topic name is required');
  } else if (!/^[a-zA-Z0-9\s]+$/.test(trimmed)) {
    errors.push('Topic name can only contain letters, numbers, and spaces');
  } else if (trimmed.length < 2) {
    errors.push('Topic name must be at least 2 characters long');
  } else if (trimmed.length > 50) {
    errors.push('Topic name must be less than 50 characters');
  }
  
  return errors;
};

// Validate difficulty level
export const validateDifficultyLevel = (level: number): string[] => {
  const errors: string[] = [];
  
  if (!level || isNaN(level)) {
    errors.push('Difficulty level is required');
  } else if (!Number.isInteger(level)) {
    errors.push('Difficulty level must be a whole number');
  } else if (level < 1 || level > 10) {
    errors.push('Difficulty level must be between 1 and 10');
  }
  
  return errors;
};

// Validate question text
export const validateQuestionText = (questionText: string): string[] => {
  const errors: string[] = [];
  const trimmed = questionText.trim();
  
  if (!trimmed) {
    errors.push('Question text is required');
  } else if (trimmed.length < 1) {
    errors.push('Question text must be at least 1 character long');
  } else if (trimmed.length > 1000) {
    errors.push('Question text must be less than 1000 characters');
  }
  
  return errors;
};

// Validate chapter name (letters and numbers)
export const validateChapterName = (chapterName: string): string[] => {
  const errors: string[] = [];
  const trimmed = chapterName.trim();
  if (!trimmed) {
    errors.push('Chapter name is required');
  } else if (!/^[a-zA-Z0-9\s]+$/.test(trimmed)) {
    errors.push('Chapter name can only contain letters, numbers, and spaces');
  } else if (trimmed.length < 2) {
    errors.push('Chapter name must be at least 2 characters long');
  } else if (trimmed.length > 50) {
    errors.push('Chapter name must be less than 50 characters');
  }
  return errors;
};

// Validate options
export const validateOptions = (options: QuestionForm['options']): string[] => {
  const errors: string[] = [];
  
  // Count filled options (those with text or image)
  const filledOptions = options.filter(option => 
    option.option_text.trim() || option.option_image
  );
  
  if (filledOptions.length < 2) {
    errors.push('At least 2 options must have text or image');
  }
  
  // Check if at least one option is marked as correct
  const correctOptions = filledOptions.filter(option => option.is_correct);
  if (correctOptions.length === 0) {
    errors.push('At least one option must be marked as correct');
  }
  
  // Validate each filled option
  filledOptions.forEach((option, index) => {
    if (option.option_text.trim()) {
      if (option.option_text.trim().length < 1) {
        errors.push(`Option ${index + 1} text cannot be empty`);
      } else if (option.option_text.length > 200) {
        errors.push(`Option ${index + 1} text must be less than 200 characters`);
      }
    }
    
    // If neither text nor image is provided for a filled option
    if (!option.option_text.trim() && !option.option_image) {
      errors.push(`Option ${index + 1} must have either text or image`);
    }
  });
  
  return errors;
};

// Validate question type
export const validateQuestionType = (questionType: string): string[] => {
  const errors: string[] = [];
  
  if (!questionType || !questionType.trim()) {
    errors.push('Question type is required');
  }
  
  return errors;
};

// Validate explanation (optional)
export const validateExplanation = (explanation: string): string[] => {
  const errors: string[] = [];
  
  if (explanation && explanation.trim()) {
    if (explanation.length > 1000) {
      errors.push('Explanation must be less than 1000 characters');
    }
  }
  
  return errors;
};

// Main validation function
export const validateQuestionForm = (form: QuestionForm): ValidationError[] => {
  const allErrors: ValidationError[] = [];
  
  // Validate subject name
  const subjectErrors = validateSubjectName(form.subjectName);
  subjectErrors.forEach(error => allErrors.push({ field: 'subjectName', message: error }));
  
  // Validate topic name
  const topicErrors = validateTopicName(form.topicName);
  topicErrors.forEach(error => allErrors.push({ field: 'topicName', message: error }));
  
  // Validate chapter name
  const chapterErrors = validateChapterName(form.chapterName);
  chapterErrors.forEach(error => allErrors.push({ field: 'chapterName', message: error }));
  
  // Validate difficulty level
  const difficultyErrors = validateDifficultyLevel(form.difficultyLevel);
  difficultyErrors.forEach(error => allErrors.push({ field: 'difficultyLevel', message: error }));
  
  // Validate question text
  const questionErrors = validateQuestionText(form.questionText);
  questionErrors.forEach(error => allErrors.push({ field: 'questionText', message: error }));
  
  // Validate options
  const optionErrors = validateOptions(form.options);
  optionErrors.forEach(error => allErrors.push({ field: 'options', message: error }));
  
  // Validate question type
  const questionTypeErrors = validateQuestionType(form.questionType);
  questionTypeErrors.forEach(error => allErrors.push({ field: 'questionType', message: error }));
  
  // Validate explanation
  const explanationErrors = validateExplanation(form.explanation);
  explanationErrors.forEach(error => allErrors.push({ field: 'explanation', message: error }));
  
  return allErrors;
};

// Check if form is valid
export const isFormValid = (form: QuestionForm): boolean => {
  const errors = validateQuestionForm(form);
  return errors.length === 0;
};
