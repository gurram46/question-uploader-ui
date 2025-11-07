import axios, { AxiosResponse } from 'axios';
import { QuestionRow, ApiResponse, QuestionPayload, Difficulty, QuestionType } from '../types';

// ✅ Base URL automatically picked from .env
const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:3001';

// Log the base URL for verification (only in development)
if (process.env.NODE_ENV === 'development') {
  console.log('✅ Using API Base URL:', API_BASE_URL);
}

// ✅ Create an Axios instance
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
});

// Request interceptor
apiClient.interceptors.request.use(
  (config) => config,
  (error) => Promise.reject(error)
);

// Response interceptor
apiClient.interceptors.response.use(
  (response) => response,
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

// ✅ Question APIs
export const questionApi = {
  // Upload question
  uploadQuestion: async (questionData: FormData | QuestionPayload): Promise<ApiResponse<any>> => {
    try {
      const isFormData = questionData instanceof FormData;

      if (isFormData && process.env.NODE_ENV === 'development') {
        const entries: Array<{ key: string; value: string }> = [];
        (questionData as FormData).forEach((value, key) => {
          const v = value instanceof File ? `File: ${value.name} (${value.size} bytes)` : String(value);
          entries.push({ key, value: v });
        });
        console.log('🧾 Sending FormData:', entries);
      }

      const response: AxiosResponse<ApiResponse<any>> = await apiClient.post('/uploadquestion', questionData);
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        if (process.env.NODE_ENV === 'development') {
          console.error('❌ Upload error:', {
            status: error.response?.status,
            data: error.response?.data,
            message: error.message,
          });
        }

        if (error.response?.data?.message) throw new Error(error.response.data.message);
        if (error.response?.data?.error) throw new Error(error.response.data.error);
        if (error.response?.status === 400) throw new Error('Bad request: Please check all required fields.');
        if (error.response?.status === 500) throw new Error('Server error: The backend failed to process your request.');
        throw new Error(error.message || 'Failed to upload question');
      }
      throw new Error('Failed to upload question');
    }
  },

  // Get all questions
  getQuestions: async (): Promise<QuestionRow[]> => {
    try {
      const response: AxiosResponse<QuestionRow[]> = await apiClient.get('/questionswithoptions');
      if (process.env.NODE_ENV === 'development' && response.data.length > 0) {
        console.log('🧩 Sample Question:', response.data[0]);
      }
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.data?.message) {
        throw new Error(error.response.data.message);
      }
      throw new Error('Failed to fetch questions');
    }
  },

  // Delete question
  deleteQuestion: async (questionId: string): Promise<ApiResponse<any>> => {
    try {
      const response: AxiosResponse<ApiResponse<any>> = await apiClient.delete('/deletequestion', {
        data: { questionId },
      });
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        if (process.env.NODE_ENV === 'development') {
          console.error('🗑️ Delete error:', {
            status: error.response?.status,
            data: error.response?.data,
            message: error.message,
          });
        }

        if (error.response?.data?.message) throw new Error(error.response.data.message);
        if (error.response?.data?.error) throw new Error(error.response.data.error);
      }
      throw new Error('Failed to delete question');
    }
  },
};

export default apiClient;


// ✅ Difficulty APIs (fixed routes)
export const difficultyApi = {
  getDifficulties: async (): Promise<Difficulty[]> => {
    try {
      const response: AxiosResponse<any[]> = await apiClient.get('/difficulties');
      const raw = response.data || [];
      return raw.map((d: any): Difficulty => ({
        difficulty_level: Number(d?.difficulty_level),
        difficulty_type: String(d?.difficulty_type ?? ''),
        difficulty_id: d?.difficulty_id,
        difficulty_id_raw: Number.isFinite(Number(d?.difficulty_id_raw)) ? Number(d?.difficulty_id_raw) : undefined,
      }));
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.data?.message) {
        throw new Error(error.response.data.message);
      }
      throw new Error('Failed to fetch difficulties');
    }
  },

  createDifficulty: async (difficultyLevel: number, difficultyType: string): Promise<ApiResponse<any>> => {
    try {
      const response: AxiosResponse<ApiResponse<any>> = await apiClient.post('/createdifficulty', {
        difficultyLevel,
        difficultyType,
      });
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        if (error.response?.data?.message) throw new Error(error.response.data.message);
        if (error.response?.data?.error) throw new Error(error.response.data.error);
      }
      throw new Error('Failed to create difficulty');
    }
  },
};

// ✅ Question Type APIs (fixed route)
export const questionTypeApi = {
  getQuestionTypes: async (): Promise<QuestionType[]> => {
    try {
      const response: AxiosResponse<QuestionType[]> = await apiClient.get('/types');
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.data?.message) {
        throw new Error(error.response.data.message);
      }
      throw new Error('Failed to fetch question types');
    }
  },
};
