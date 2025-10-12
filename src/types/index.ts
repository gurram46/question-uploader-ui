// Question types
export interface Option {
  option_text?: string;
  option_image?: string;
  is_correct: boolean;
}

export interface Question {
  subjectName: string;
  chapterName?: string;
  topicName: string;
  difficultyLevel: number;
  questionType: string;
  questionText: string;
  questionImage?: string;
  options: Option[];
  explanation?: string;
  explanationImage?: string;
}

// API Response types
export interface QuestionRow {
  question_id: string;
  subject_name: string;
  chapter_name?: string;
  topic_name: string;
  difficulty_id?: number | string; // Backend returns numeric id on /getquestions
  difficulty_level?: number | string; // Backend might send as string
  difficulty_type?: string; // Backend includes type on /getquestions
  question_type?: string;
  question_text: string;
  question_image?: string;
  option_id?: number;
  option_text?: string;
  option_image?: string;
  is_correct: boolean | string;
  explanation?: string;
  explaination?: string; // Backend spelling
  explanation_image?: string;
  explaination_image?: string; // Backend spelling
  created_at?: string;
}

export interface GroupedQuestion {
  question_id: string;
  subject_name: string;
  chapter_name?: string;
  topic_name: string;
  difficulty_level?: number;
  difficulty_type?: string;
  question_type?: string;
  question_text: string;
  question_image?: string;
  options: Array<{
    option_id?: number;
    option_text?: string;
    option_image?: string;
    is_correct: boolean;
  }>;
  explanation?: string;
  explanation_image?: string;
  created_at?: string;
}

// Difficulties
export interface Difficulty {
  difficulty_id?: number | string; // may be encoded string or raw number
  difficulty_id_raw?: number; // preferred raw numeric id if provided
  difficulty_level: number;
  difficulty_type: string;
}

// Question Types
export interface QuestionType {
  question_type: string;
}

// Form types
export interface FormOption {
  option_text: string;
  option_image: File | null;
  is_correct: boolean;
}

export interface QuestionForm {
  subjectName: string;
  chapterName: string;
  topicName: string;
  difficultyLevel: number;
  questionType: string;
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

// Backend payload types - exact format expected by backend
export interface QuestionPayload {
  subjectName: string;
  chapterName?: string;
  topicName: string;
  difficultyLevel: number;
  questionType: string;
  questionText: string;
  questionImage: string;
  option1: string;
  option1Image: string;
  option1Correct: boolean;
  option2: string;
  option2Image: string;
  option2Correct: boolean;
  option3: string;
  option3Image: string;
  option3Correct: boolean;
  option4: string;
  option4Image: string;
  option4Correct: boolean;
  explanation: string;
  explanationImage: string;
}
