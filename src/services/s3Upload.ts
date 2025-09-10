import { QuestionForm } from '../types';
import { sanitizeString } from '../utils/validation';

// Allowed image types and max size
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

// Validate file before upload
export const validateImageFile = (file: File): void => {
  if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
    throw new Error(`Invalid file type. Allowed types: ${ALLOWED_IMAGE_TYPES.join(', ')}`);
  }
  
  if (file.size > MAX_FILE_SIZE) {
    throw new Error(`File size too large. Maximum size: ${MAX_FILE_SIZE / (1024 * 1024)}MB`);
  }
};

// Create FormData from question form
export const createFormDataFromQuestion = (form: QuestionForm): FormData => {
  const formData = new FormData();
  
  // Add basic question data - using both camelCase and snake_case to ensure compatibility
  formData.append('subjectName', sanitizeString(form.subjectName));
  formData.append('topicName', sanitizeString(form.topicName));
  formData.append('difficultyLevel', form.difficultyLevel.toString());
  formData.append('questionText', sanitizeString(form.questionText));
  
  // Also add snake_case versions
  formData.append('subject_name', sanitizeString(form.subjectName));
  formData.append('topic_name', sanitizeString(form.topicName));
  formData.append('difficulty_level', form.difficultyLevel.toString());
  formData.append('question_text', sanitizeString(form.questionText));
  
  // Add question image if exists
  if (form.questionImage) {
    validateImageFile(form.questionImage);
    formData.append('questionImage', form.questionImage);
    formData.append('question_image', form.questionImage);
  }
  
  // Add explanation if exists
  if (form.explanation && form.explanation.trim()) {
    formData.append('explanation', sanitizeString(form.explanation));
  }
  
  // Add explanation image if exists
  if (form.explanationImage) {
    validateImageFile(form.explanationImage);
    formData.append('explanationImage', form.explanationImage);
    formData.append('explanation_image', form.explanationImage);
  }
  
  // Add options - create an array of valid options
  const validOptions = form.options.filter(option => 
    option.option_text.trim() || option.option_image
  );
  
  // Try multiple formats for options to match backend expectations
  const optionsArray = validOptions.map(option => ({
    optionText: option.option_text ? sanitizeString(option.option_text) : '',
    option_text: option.option_text ? sanitizeString(option.option_text) : '',
    isCorrect: option.is_correct,
    is_correct: option.is_correct,
    optionImage: null,
    option_image: null
  }));
  
  // Add options as JSON string
  formData.append('options', JSON.stringify(optionsArray));
  
  // Also add individual option fields
  validOptions.forEach((option, index) => {
    if (option.option_text.trim()) {
      formData.append(`options[${index}][optionText]`, sanitizeString(option.option_text));
      formData.append(`options[${index}][option_text]`, sanitizeString(option.option_text));
    }
    
    if (option.option_image) {
      validateImageFile(option.option_image);
      formData.append(`options[${index}][optionImage]`, option.option_image);
      formData.append(`options[${index}][option_image]`, option.option_image);
    }
    
    formData.append(`options[${index}][isCorrect]`, option.is_correct.toString());
    formData.append(`options[${index}][is_correct]`, option.is_correct.toString());
  });
  
  return formData;
};

// Utility function to convert File to base64 for preview
export const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (error) => reject(error);
  });
};

export default {
  createFormDataFromQuestion,
  validateImageFile,
  fileToBase64
};
