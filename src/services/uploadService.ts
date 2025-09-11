import { QuestionForm, QuestionPayload } from '../types';
import { sanitizeString } from '../utils/validation';
import axios from 'axios';

const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

export const validateImageFile = (file: File): void => {
  if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
    throw new Error(`Invalid file type. Allowed types: ${ALLOWED_IMAGE_TYPES.join(', ')}`);
  }
  
  if (file.size > MAX_FILE_SIZE) {
    throw new Error(`File size too large. Maximum size: ${MAX_FILE_SIZE / (1024 * 1024)}MB`);
  }
};

const uploadFileToBackend = async (file: File): Promise<string> => {
  const formData = new FormData();
  formData.append('file', file);
  
  try {
    const response = await axios.post(
      `${process.env.REACT_APP_API_BASE_URL}/upload-image`,
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    );
    return response.data.url || response.data.imageUrl || '';
  } catch (error) {
    return '';
  }
};

export const createQuestionPayload = async (form: QuestionForm): Promise<QuestionPayload> => {
  let questionImageUrl = '';
  let explanationImageUrl = '';
  const optionImageUrls: (string | null)[] = [null, null, null, null];
  
  if (form.questionImage) {
    validateImageFile(form.questionImage);
    questionImageUrl = await uploadFileToBackend(form.questionImage);
  }
  
  if (form.explanationImage) {
    validateImageFile(form.explanationImage);
    explanationImageUrl = await uploadFileToBackend(form.explanationImage);
  }
  
  const safeOptions = form.options.slice(0, 4);
  if (safeOptions[0]?.option_image) {
    validateImageFile(safeOptions[0].option_image);
    optionImageUrls[0] = await uploadFileToBackend(safeOptions[0].option_image);
  }
  if (safeOptions[1]?.option_image) {
    validateImageFile(safeOptions[1].option_image);
    optionImageUrls[1] = await uploadFileToBackend(safeOptions[1].option_image);
  }
  if (safeOptions[2]?.option_image) {
    validateImageFile(safeOptions[2].option_image);
    optionImageUrls[2] = await uploadFileToBackend(safeOptions[2].option_image);
  }
  if (safeOptions[3]?.option_image) {
    validateImageFile(safeOptions[3].option_image);
    optionImageUrls[3] = await uploadFileToBackend(safeOptions[3].option_image);
  }
  
  const options = form.options.slice(0, 4);
  
  const payload: QuestionPayload = {
    subjectName: sanitizeString(form.subjectName),
    topicName: sanitizeString(form.topicName),
    difficultyLevel: form.difficultyLevel,
    questionText: sanitizeString(form.questionText),
    questionImage: questionImageUrl || '',
    option1: options[0]?.option_text ? sanitizeString(options[0].option_text) : '',
    option1Image: optionImageUrls[0] || '',
    option1Correct: options[0]?.is_correct || false,
    option2: options[1]?.option_text ? sanitizeString(options[1].option_text) : '',
    option2Image: optionImageUrls[1] || '',
    option2Correct: options[1]?.is_correct || false,
    option3: options[2]?.option_text ? sanitizeString(options[2].option_text) : '',
    option3Image: optionImageUrls[2] || '',
    option3Correct: options[2]?.is_correct || false,
    option4: options[3]?.option_text ? sanitizeString(options[3].option_text) : '',
    option4Image: optionImageUrls[3] || '',
    option4Correct: options[3]?.is_correct || false,
    explaination: '',
    explainationImage: ''
  };
  
  // Backend expects 'explaination' spelling
  payload.explaination = form.explanation && form.explanation.trim()
    ? sanitizeString(form.explanation) 
    : '';
  
  // Add explanation image (note the spelling 'explainationImage')
  payload.explainationImage = explanationImageUrl || '';
  
  return payload;
};

export const createQuestionFormData = (form: QuestionForm): FormData => {
  const formData = new FormData();
  
  // Match exact field order expected by backend:
  // questionImage, subjectName, topicName, difficultyLevel, questionText,
  // option1Correct, option1, option2Correct, option2, option3Correct, option3,
  // option4Correct, option4, explaination, option1Image, option2Image,
  // option3Image, option4Image, explainationImage
  
  // Question image first (only if file exists)
  if (form.questionImage) {
    validateImageFile(form.questionImage);
    formData.append('questionImage', form.questionImage);
  }
  
  // Text fields
  formData.append('subjectName', sanitizeString(form.subjectName));
  formData.append('topicName', sanitizeString(form.topicName));
  // Ensure difficultyLevel is a clean integer string (1..10)
  const difficulty = Math.max(1, Math.min(10, Number(form.difficultyLevel) || 1));
  formData.append('difficultyLevel', difficulty.toString());
  formData.append('questionText', sanitizeString(form.questionText));
  
  const formOptions = form.options.slice(0, 4);
  
  // Options with correct fields first, then text
  // Option 1
  formData.append('option1Correct', (formOptions[0]?.is_correct ? '1' : '0'));
  const opt1Text = formOptions[0]?.option_text ? sanitizeString(formOptions[0].option_text) : '';
  formData.append('option1', opt1Text);
  
  // Option 2
  formData.append('option2Correct', (formOptions[1]?.is_correct ? '1' : '0'));
  const opt2Text = formOptions[1]?.option_text ? sanitizeString(formOptions[1].option_text) : '';
  formData.append('option2', opt2Text);
  
  // Option 3
  formData.append('option3Correct', (formOptions[2]?.is_correct ? '1' : '0'));
  const opt3Text = formOptions[2]?.option_text ? sanitizeString(formOptions[2].option_text) : '';
  formData.append('option3', opt3Text);
  
  // Option 4
  formData.append('option4Correct', (formOptions[3]?.is_correct ? '1' : '0'));
  const opt4Text = formOptions[3]?.option_text ? sanitizeString(formOptions[3].option_text) : '';
  formData.append('option4', opt4Text);
  
  // Explanation (note the spelling 'explaination' as per backend)
  formData.append('explaination', form.explanation && form.explanation.trim() 
    ? sanitizeString(form.explanation) 
    : '');
  
  // Option images (only append if files exist)
  if (formOptions[0]?.option_image) {
    validateImageFile(formOptions[0].option_image);
    formData.append('option1Image', formOptions[0].option_image);
  }
  if (formOptions[1]?.option_image) {
    validateImageFile(formOptions[1].option_image);
    formData.append('option2Image', formOptions[1].option_image);
  }
  if (formOptions[2]?.option_image) {
    validateImageFile(formOptions[2].option_image);
    formData.append('option3Image', formOptions[2].option_image);
  }
  if (formOptions[3]?.option_image) {
    validateImageFile(formOptions[3].option_image);
    formData.append('option4Image', formOptions[3].option_image);
  }
  
  // Explanation image last (only if exists)
  if (form.explanationImage) {
    validateImageFile(form.explanationImage);
    formData.append('explainationImage', form.explanationImage);
  }
  
  return formData;
};

// Send JSON without images since backend doesn't handle files properly yet
export const createQuestionPayloadWithoutImages = (form: QuestionForm): QuestionPayload => {
  const options = form.options.slice(0, 4);
  
  const payload: QuestionPayload = {
    subjectName: sanitizeString(form.subjectName),
    topicName: sanitizeString(form.topicName),
    difficultyLevel: form.difficultyLevel,
    questionText: sanitizeString(form.questionText),
    questionImage: '',
    option1: options[0]?.option_text ? sanitizeString(options[0].option_text) : '',
    option1Image: '',
    option1Correct: options[0]?.is_correct || false,
    option2: options[1]?.option_text ? sanitizeString(options[1].option_text) : '',
    option2Image: '',
    option2Correct: options[1]?.is_correct || false,
    option3: options[2]?.option_text ? sanitizeString(options[2].option_text) : '',
    option3Image: '',
    option3Correct: options[2]?.is_correct || false,
    option4: options[3]?.option_text ? sanitizeString(options[3].option_text) : '',
    option4Image: '',
    option4Correct: options[3]?.is_correct || false,
    explaination: form.explanation && form.explanation.trim() 
      ? sanitizeString(form.explanation) 
      : '',
    explainationImage: ''
  };
  
  return payload;
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
  createQuestionPayload,
  createQuestionPayloadWithoutImages,
  createQuestionFormData,
  validateImageFile,
  fileToBase64
};
