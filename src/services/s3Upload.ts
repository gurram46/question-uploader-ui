import { QuestionForm } from '../types';
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
    console.error('File upload failed:', error);
    // For now, return empty string if upload fails
    // In production, you'd want to handle this properly
    return '';
  }
};

// Create JSON payload from question form matching backend schema
export const createQuestionPayload = async (form: QuestionForm): Promise<any> => {
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
  for (let i = 0; i < 4; i++) {
    // eslint-disable-next-line security/detect-object-injection
    if (form.options[i]?.option_image) {
      // eslint-disable-next-line security/detect-object-injection
      validateImageFile(form.options[i].option_image!);
      // eslint-disable-next-line security/detect-object-injection
      optionImageUrls[i] = await uploadFileToBackend(form.options[i].option_image!);
    }
  }
  
  // Create the JSON payload matching backend schema (flat structure)
  const payload: any = {
    subjectName: sanitizeString(form.subjectName),
    topicName: sanitizeString(form.topicName),
    difficultyLevel: form.difficultyLevel,
    questionText: sanitizeString(form.questionText),
    questionImage: questionImageUrl || '',
  };
  
  // Add options as flat fields
  for (let i = 0; i < 4; i++) {
    // eslint-disable-next-line security/detect-object-injection
    const option = form.options[i];
    const optionNum = i + 1;
    
    // Add option text
    payload[`option${optionNum}`] = option?.option_text ? sanitizeString(option.option_text) : '';
    
    // Add option correct status
    payload[`option${optionNum}Correct`] = option?.is_correct || false;
    
    // Add option image
    // eslint-disable-next-line security/detect-object-injection
    payload[`option${optionNum}Image`] = optionImageUrls[i] || '';
  }
  
  // Add explanation (note the spelling 'explaination' as per backend)
  payload.explaination = form.explanation && form.explanation.trim() 
    ? sanitizeString(form.explanation) 
    : '';
  
  // Add explanation image (note the spelling 'explainationImage')
  payload.explainationImage = explanationImageUrl || '';
  
  return payload;
};

// For cases where backend doesn't have separate image upload endpoint
// We'll send the JSON directly without images (text only)
export const createQuestionPayloadWithoutImages = (form: QuestionForm): any => {
  const payload: any = {
    subjectName: sanitizeString(form.subjectName),
    topicName: sanitizeString(form.topicName),
    difficultyLevel: form.difficultyLevel,
    questionText: sanitizeString(form.questionText),
  };
  
  // Add questionImage if exists (would be empty string for now since no file upload)
  payload.questionImage = '';
  
  // Add options as flat fields: option1, option1Correct, option1Image, etc.
  for (let i = 0; i < 4; i++) {
    // eslint-disable-next-line security/detect-object-injection
    const option = form.options[i];
    const optionNum = i + 1;
    
    // Add option text
    payload[`option${optionNum}`] = option?.option_text ? sanitizeString(option.option_text) : '';
    
    // Add option correct status
    payload[`option${optionNum}Correct`] = option?.is_correct || false;
    
    // Add option image (empty string for now)
    payload[`option${optionNum}Image`] = '';
  }
  
  // Add explanation (note the spelling 'explaination' as per backend)
  if (form.explanation && form.explanation.trim()) {
    payload.explaination = sanitizeString(form.explanation);
  } else {
    payload.explaination = '';
  }
  
  // Add explanation image (note the spelling 'explainationImage')
  payload.explainationImage = '';
  
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
  validateImageFile,
  fileToBase64
};
