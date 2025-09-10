import axios from 'axios';
import { questionApi } from './api';

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

// Generate unique filename
const generateFileName = (file: File): string => {
  const timestamp = Date.now();
  const randomString = Math.random().toString(36).substring(2, 15);
  const extension = file.name.split('.').pop() || 'jpg';
  return `${timestamp}-${randomString}.${extension}`;
};

// Upload file to S3 using pre-signed URL
export const uploadFileToS3 = async (file: File): Promise<string> => {
  try {
    // Validate file first
    validateImageFile(file);
    
    // Generate unique filename
    const fileName = generateFileName(file);
    
    // Get pre-signed URL from backend
    const { presignedUrl, publicUrl } = await questionApi.getPreSignedUrl(fileName, file.type);
    
    // Upload file to S3 using pre-signed URL
    await axios.put(presignedUrl, file, {
      headers: {
        'Content-Type': file.type,
      },
      timeout: 60000, // 60 second timeout for file uploads
    });
    
    return publicUrl;
  } catch (error: any) {
    console.error('S3 Upload Error:', error);
    
    if (error.code === 'ECONNABORTED') {
      throw new Error('File upload timeout. Please try again with a smaller file.');
    }
    
    if (error.response?.status === 403) {
      throw new Error('Upload permission denied. Please check your S3 configuration.');
    }
    
    if (error.response?.status === 400) {
      throw new Error('Invalid file or upload request.');
    }
    
    throw new Error(error.message || 'Failed to upload file');
  }
};

// Upload multiple files
export const uploadMultipleFiles = async (files: (File | null)[]): Promise<(string | null)[]> => {
  const uploadPromises = files.map(async (file) => {
    if (!file) return null;
    return uploadFileToS3(file);
  });
  
  return Promise.all(uploadPromises);
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
  uploadFileToS3,
  uploadMultipleFiles,
  validateImageFile,
  fileToBase64
};
