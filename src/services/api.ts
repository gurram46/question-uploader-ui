import axios, { AxiosResponse } from 'axios';
import { QuestionRow, ApiResponse, QuestionPayload } from '../types';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:3001';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
});

apiClient.interceptors.request.use(
  (config) => {
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

apiClient.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    if (error.response?.status === 429) {
      throw new Error('Too many requests. Please wait and try again.');
    }
    if (error.response?.status >= 500) {
      throw new Error('Server error. Please try again later.');
    }
    if (error.code === 'ECONNABORTED') {
      throw new Error('Request timeout. Please check your connection.');
    }
    throw error;
  }
);

export const questionApi = {
  uploadQuestion: async (questionData: FormData | QuestionPayload): Promise<ApiResponse<any>> => {
    try {
      const isFormData = questionData instanceof FormData;
      
      // Log FormData contents for debugging
      if (isFormData && process.env.NODE_ENV === 'development') {
        console.log('Sending FormData with fields:');
        const entries: Array<{ key: string; value: string }> = [];
        (questionData as FormData).forEach((value, key) => {
          const v = value instanceof File ? `File: ${value.name} (${value.size} bytes)` : String(value);
          entries.push({ key, value: v });
        });
        console.log(entries);
      }
      
      // For FormData in browsers, do NOT set Content-Type manually; let the browser add the correct boundary.
      const response: AxiosResponse<ApiResponse<any>> = await apiClient.post(
        '/uploadquestion', 
        questionData
      );
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        // Log full error details in development
        if (process.env.NODE_ENV === 'development') {
          console.error('Upload error:', {
            status: error.response?.status,
            data: error.response?.data,
            message: error.message
          });
        }
        
        if (error.response?.data?.message) {
          throw new Error(error.response.data.message);
        }
        if (error.response?.data?.error) {
          throw new Error(error.response.data.error);
        }
        if (error.response?.status === 400) {
          throw new Error('Bad request: Please check all required fields are filled correctly.');
        }
        if (error.response?.status === 500) {
          throw new Error('Server error: The backend encountered an error processing your request.');
        }
        throw new Error(error.message || 'Failed to upload question');
      }
      throw new Error('Failed to upload question');
    }
  },

  getQuestions: async (): Promise<QuestionRow[]> => {
    try {
      const response: AxiosResponse<QuestionRow[]> = await apiClient.get('/getquestions');
      
      // Log the raw response in development
      if (process.env.NODE_ENV === 'development' && response.data.length > 0) {
        console.log('Raw GET response sample:', response.data[0]);
        console.log('Full response:', response.data);
      }
      
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.data?.message) {
        throw new Error(error.response.data.message);
      }
      throw new Error('Failed to fetch questions');
    }
  }
  ,
  deleteQuestion: async (questionId: string): Promise<ApiResponse<any>> => {
    try {
      const response: AxiosResponse<ApiResponse<any>> = await apiClient.delete('/deletequestion', {
        data: { questionId }
      });
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        if (process.env.NODE_ENV === 'development') {
          console.error('Delete error:', {
            status: error.response?.status,
            data: error.response?.data,
            message: error.message
          });
        }
        if (error.response?.data?.message) {
          throw new Error(error.response.data.message);
        }
        if (error.response?.data?.error) {
          throw new Error(error.response.data.error);
        }
      }
      throw new Error('Failed to delete question');
    }
  }
};

export default apiClient;
