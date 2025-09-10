// Question types
export interface Option {
  option_text?: string;
  option_image?: string;
  is_correct: boolean;
}

export interface Question {
  subjectName: string;
  topicName: string;
  difficultyLevel: number;
  questionText: string;
  questionImage?: string;
  options: Option[];
  explanation?: string;
  explanationImage?: string;
}

// API Response types
export interface QuestionRow {
  question_id: number;
  subjectName: string;
  topicName: string;
  difficultyLevel: number;
  questionText: string;
  questionImage?: string;
  option_id: number;
  option_text?: string;
  option_image?: string;
  is_correct: boolean;
  explanation?: string;
  explanationImage?: string;
  created_at: string;
}

export interface GroupedQuestion {
  question_id: number;
  subjectName: string;
  topicName: string;
  difficultyLevel: number;
  questionText: string;
  questionImage?: string;
  options: Array<{
    option_id: number;
    option_text?: string;
    option_image?: string;
    is_correct: boolean;
  }>;
  explanation?: string;
  explanationImage?: string;
  created_at: string;
}

// Form types
export interface FormOption {
  option_text: string;
  option_image: File | null;
  is_correct: boolean;
}

export interface QuestionForm {
  subjectName: string;
  topicName: string;
  difficultyLevel: number;
  questionText: string;
  questionImage: File | null;
  options: FormOption[];
  explanation: string;
  explanationImage: File | null;
}

// API types
export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data?: T;
}

export interface PreSignedUrlResponse {
  presignedUrl: string;
  publicUrl: string;
}

// Toast notification types
export interface Toast {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  message: string;
  duration?: number;
}

// Validation error types
export interface ValidationError {
  field: string;
  message: string;
}
