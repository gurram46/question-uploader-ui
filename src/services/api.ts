import axios, { AxiosResponse } from 'axios';
import { QuestionRow, ApiResponse, QuestionPayload, Difficulty, QuestionType } from '../types';

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
    const tryEndpoint = async (path: string) => {
      const resp: AxiosResponse<QuestionRow[]> = await apiClient.get(path);
      return resp.data;
    };
    try {
      // Prefer new endpoint if backend updated
      let data: QuestionRow[] = [];
      try {
        data = await tryEndpoint('/getuploadedquestions');
      } catch (e) {
        // Fallback to legacy route
        data = await tryEndpoint('/getquestions');
      }

      if (process.env.NODE_ENV === 'development' && data.length > 0) {
        console.log('Raw GET response sample:', data[0]);
        console.log('Full response:', data);
      }
      return data;
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

// Difficulty APIs
export const difficultyApi = {
  getDifficulties: async (): Promise<Difficulty[]> => {
    try {
      const response: AxiosResponse<any[]> = await apiClient.get('/getdifficulties');
      const raw = response.data || [];
      // Normalize: support both encoded and raw ids
      return raw.map((d: any): Difficulty => {
        const level = Number(d?.difficulty_level);
        const type = String(d?.difficulty_type ?? '');
        const rawIdCandidate = d?.difficulty_id_raw ?? (typeof d?.difficulty_id === 'number' ? d.difficulty_id : undefined);
        const difficulty_id_raw = Number.isFinite(Number(rawIdCandidate)) ? Number(rawIdCandidate) : undefined;
        const difficulty_id = typeof d?.difficulty_id === 'string' || typeof d?.difficulty_id === 'number' ? d.difficulty_id : undefined;
        return {
          difficulty_level: level,
          difficulty_type: type,
          difficulty_id,
          difficulty_id_raw,
        };
      });
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.data?.message) {
        throw new Error(error.response.data.message);
      }
      throw new Error('Failed to fetch difficulties');
    }
  },

  createDifficulty: async (difficultyLevel: number, difficultyType: string): Promise<ApiResponse<any>> => {
    try {
      const response: AxiosResponse<ApiResponse<any>> = await apiClient.post(
        '/createdifficulty',
        // Some backends expect headers only; send both headers and a minimal body
        { difficultyLevel, difficultyType },
        { headers: { difficultyLevel: String(difficultyLevel), difficultyType } }
      );
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        if (error.response?.data?.message) {
          throw new Error(error.response.data.message);
        }
        if (error.response?.data?.error) {
          throw new Error(error.response.data.error);
        }
      }
      throw new Error('Failed to create difficulty');
    }
  },
};

// Question Type APIs
export const questionTypeApi = {
  getQuestionTypes: async (): Promise<QuestionType[]> => {
    try {
      const response: AxiosResponse<QuestionType[]> = await apiClient.get('/gettypes');
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.data?.message) {
        throw new Error(error.response.data.message);
      }
      throw new Error('Failed to fetch question types');
    }
  },
};
