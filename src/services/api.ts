import axios, { AxiosResponse } from 'axios';
import { QuestionRow } from '../types';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:3001';

// Create axios instance with default config
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000, // 30 second timeout
});

// Request interceptor for logging and error handling
apiClient.interceptors.request.use(
  (config) => {
    console.log(`API Request: ${config.method?.toUpperCase()} ${config.url}`);
    return config;
  },
  (error) => {
    console.error('API Request Error:', error);
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
apiClient.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    console.error('API Response Error:', error);
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

// API functions
export const questionApi = {
  // Upload a new question with FormData or JSON payload
  uploadQuestion: async (questionData: any): Promise<any> => {
    try {
      // Determine if it's FormData or JSON
      const isFormData = questionData instanceof FormData;
      
      const response: AxiosResponse<any> = await apiClient.post(
        '/uploadquestion', 
        questionData,
        isFormData ? {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        } : {}
      );
      return response.data;
    } catch (error: any) {
      if (error.response?.data?.message) {
        throw new Error(error.response.data.message);
      }
      throw new Error(error.message || 'Failed to upload question');
    }
  },

  // Get all questions
  getQuestions: async (): Promise<QuestionRow[]> => {
    try {
      const response: AxiosResponse<QuestionRow[]> = await apiClient.get('/getquestions');
      return response.data;
    } catch (error: any) {
      if (error.response?.data?.message) {
        throw new Error(error.response.data.message);
      }
      throw new Error(error.message || 'Failed to fetch questions');
    }
  }
};

export default apiClient;
