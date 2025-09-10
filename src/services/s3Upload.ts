import { QuestionForm, QuestionPayload } from '../types';
import { sanitizeString } from '../utils/validation';
import axios from 'axios';

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

// Upload file to backend and get S3 URL
const uploadFileToBackend = async (file: File): Promise<string> => {
  const formData = new FormData();
  formData.append('file', file);
  
  // Upload to your backend's file upload endpoint
  // The backend should handle S3 upload and return the public URL
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
    // File upload errors are handled by returning empty string
    // In production, this could be enhanced with proper error reporting
    return '';
  }
};

// Create JSON payload from question form matching backend schema
export const createQuestionPayload = async (form: QuestionForm): Promise<QuestionPayload> => {
  // Upload images first and get their S3 URLs
  let questionImageUrl = '';
  let explanationImageUrl = '';
  const optionImageUrls: (string | null)[] = [null, null, null, null];
  
  // Upload question image if exists
  if (form.questionImage) {
    validateImageFile(form.questionImage);
    questionImageUrl = await uploadFileToBackend(form.questionImage);
  }
  
  // Upload explanation image if exists
  if (form.explanationImage) {
    validateImageFile(form.explanationImage);
    explanationImageUrl = await uploadFileToBackend(form.explanationImage);
  }
  
  // Upload option images
  const safeOptions = form.options.slice(0, 4); // Ensure max 4 options
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
  
  // Create the JSON payload matching backend schema
  const payload: QuestionPayload = {
    subjectName: sanitizeString(form.subjectName),
    topicName: sanitizeString(form.topicName),
    difficultyLevel: form.difficultyLevel,
    questionText: sanitizeString(form.questionText),
    questionImage: questionImageUrl || '',
    option1: { optionText: '', optionImage: '', isCorrect: false },
    option2: { optionText: '', optionImage: '', isCorrect: false },
    option3: { optionText: '', optionImage: '', isCorrect: false },
    option4: { optionText: '', optionImage: '', isCorrect: false },
    explaination: '',
    explainationImage: ''
  };
  
  // Add options as JSON objects with optionText, optionImage, isCorrect
  const options = form.options.slice(0, 4);
  if (options[0]) {
    payload.option1 = {
      optionText: options[0].option_text ? sanitizeString(options[0].option_text) : '',
      optionImage: optionImageUrls[0] || '',
      isCorrect: options[0].is_correct || false
    };
  }
  if (options[1]) {
    payload.option2 = {
      optionText: options[1].option_text ? sanitizeString(options[1].option_text) : '',
      optionImage: optionImageUrls[1] || '',
      isCorrect: options[1].is_correct || false
    };
  }
  if (options[2]) {
    payload.option3 = {
      optionText: options[2].option_text ? sanitizeString(options[2].option_text) : '',
      optionImage: optionImageUrls[2] || '',
      isCorrect: options[2].is_correct || false
    };
  }
  if (options[3]) {
    payload.option4 = {
      optionText: options[3].option_text ? sanitizeString(options[3].option_text) : '',
      optionImage: optionImageUrls[3] || '',
      isCorrect: options[3].is_correct || false
    };
  }
  
  // Add explanation (note the spelling 'explaination' as per backend)
  payload.explaination = form.explanation && form.explanation.trim() 
    ? sanitizeString(form.explanation) 
    : '';
  
  // Add explanation image (note the spelling 'explainationImage')
  payload.explainationImage = explanationImageUrl || '';
  
  return payload;
};

// Create FormData with actual files for backend upload
export const createQuestionFormData = (form: QuestionForm): FormData => {
  const formData = new FormData();
  
  // Add text fields (exact case as backend expects)
  formData.append('subjectName', sanitizeString(form.subjectName));
  formData.append('topicName', sanitizeString(form.topicName));
  formData.append('difficultyLevel', form.difficultyLevel.toString());
  formData.append('questionText', sanitizeString(form.questionText));
  
  // Add question image if exists (actual file, not empty string)
  if (form.questionImage) {
    validateImageFile(form.questionImage);
    formData.append('questionImage', form.questionImage);
  } else {
    formData.append('questionImage', '');
  }
  
  // Add options as flat fields with actual files
  const formOptions = form.options.slice(0, 4);
  
  // Option 1
  if (formOptions[0]) {
    formData.append('option1', formOptions[0].option_text ? sanitizeString(formOptions[0].option_text) : '');
    formData.append('option1Correct', (formOptions[0].is_correct || false).toString());
    if (formOptions[0].option_image) {
      validateImageFile(formOptions[0].option_image);
      formData.append('option1Image', formOptions[0].option_image);
    } else {
      formData.append('option1Image', '');
    }
  }
  
  // Option 2
  if (formOptions[1]) {
    formData.append('option2', formOptions[1].option_text ? sanitizeString(formOptions[1].option_text) : '');
    formData.append('option2Correct', (formOptions[1].is_correct || false).toString());
    if (formOptions[1].option_image) {
      validateImageFile(formOptions[1].option_image);
      formData.append('option2Image', formOptions[1].option_image);
    } else {
      formData.append('option2Image', '');
    }
  }
  
  // Option 3
  if (formOptions[2]) {
    formData.append('option3', formOptions[2].option_text ? sanitizeString(formOptions[2].option_text) : '');
    formData.append('option3Correct', (formOptions[2].is_correct || false).toString());
    if (formOptions[2].option_image) {
      validateImageFile(formOptions[2].option_image);
      formData.append('option3Image', formOptions[2].option_image);
    } else {
      formData.append('option3Image', '');
    }
  }
  
  // Option 4
  if (formOptions[3]) {
    formData.append('option4', formOptions[3].option_text ? sanitizeString(formOptions[3].option_text) : '');
    formData.append('option4Correct', (formOptions[3].is_correct || false).toString());
    if (formOptions[3].option_image) {
      validateImageFile(formOptions[3].option_image);
      formData.append('option4Image', formOptions[3].option_image);
    } else {
      formData.append('option4Image', '');
    }
  }
  
  // Add explanation (note the spelling 'explaination' as per backend)
  formData.append('explaination', form.explanation && form.explanation.trim() 
    ? sanitizeString(form.explanation) 
    : '');
  
  // Add explanation image (actual file if exists)
  if (form.explanationImage) {
    validateImageFile(form.explanationImage);
    formData.append('explainationImage', form.explanationImage);
  } else {
    formData.append('explainationImage', '');
  }
  
  return formData;
};

// For cases where backend doesn't have separate image upload endpoint
// We'll send the JSON directly without images (text only)
export const createQuestionPayloadWithoutImages = (form: QuestionForm): QuestionPayload => {
  const payload: QuestionPayload = {
    subjectName: sanitizeString(form.subjectName),
    topicName: sanitizeString(form.topicName),
    difficultyLevel: form.difficultyLevel,
    questionText: sanitizeString(form.questionText),
    questionImage: '',
    option1: { optionText: '', optionImage: '', isCorrect: false },
    option2: { optionText: '', optionImage: '', isCorrect: false },
    option3: { optionText: '', optionImage: '', isCorrect: false },
    option4: { optionText: '', optionImage: '', isCorrect: false },
    explaination: '',
    explainationImage: ''
  };
  
  // Add options as JSON objects with optionText, optionImage, isCorrect
  const payloadOptions = form.options.slice(0, 4);
  
  if (payloadOptions[0]) {
    payload.option1 = {
      optionText: payloadOptions[0].option_text ? sanitizeString(payloadOptions[0].option_text) : '',
      optionImage: '',
      isCorrect: payloadOptions[0].is_correct || false
    };
  }
  if (payloadOptions[1]) {
    payload.option2 = {
      optionText: payloadOptions[1].option_text ? sanitizeString(payloadOptions[1].option_text) : '',
      optionImage: '',
      isCorrect: payloadOptions[1].is_correct || false
    };
  }
  if (payloadOptions[2]) {
    payload.option3 = {
      optionText: payloadOptions[2].option_text ? sanitizeString(payloadOptions[2].option_text) : '',
      optionImage: '',
      isCorrect: payloadOptions[2].is_correct || false
    };
  }
  if (payloadOptions[3]) {
    payload.option4 = {
      optionText: payloadOptions[3].option_text ? sanitizeString(payloadOptions[3].option_text) : '',
      optionImage: '',
      isCorrect: payloadOptions[3].is_correct || false
    };
  }
  
  // Add explanation (note the spelling 'explaination' as per backend)
  payload.explaination = form.explanation && form.explanation.trim() 
    ? sanitizeString(form.explanation) 
    : '';
  
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
