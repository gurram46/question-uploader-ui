import { QuestionRow, GroupedQuestion } from '../types';

// Build a usable image URL from backend values that may be IDs or relative tokens
type ImageKind = 'question' | 'option' | 'explanation';
const resolveImageUrl = (value: any, kind: ImageKind = 'option'): string => {
  if (value === undefined || value === null) return '';
  const raw = String(value).trim();
  if (!raw) return '';
  if (/^(https?:)?\/\//i.test(raw) || raw.startsWith('data:')) return raw;
  // Allow kind-specific base URLs; fall back to generic
  const baseFromEnv = (
    (kind === 'question' && process.env.REACT_APP_QUESTION_IMAGE_BASE_URL) ||
    (kind === 'explanation' && process.env.REACT_APP_EXPLANATION_IMAGE_BASE_URL) ||
    (kind === 'option' && process.env.REACT_APP_OPTION_IMAGE_BASE_URL) ||
    process.env.REACT_APP_IMAGE_BASE_URL
  );
  let defaultPath = '/image';
  if (!baseFromEnv) {
    if (kind === 'question') defaultPath = '/question-image';
    else if (kind === 'explanation') defaultPath = '/explanation-image';
    else if (kind === 'option') defaultPath = '/option-image';
  }
  const base = (baseFromEnv || `${process.env.REACT_APP_API_BASE_URL || ''}${defaultPath}`).replace(/\/$/, '');
  return `${base}/${encodeURIComponent(raw)}`;
};

const normalizeText = (value: any): string => {
  if (value === undefined || value === null) return '';
  const raw = String(value).trim();
  if (!raw) return '';
  const lowered = raw.toLowerCase();
  if (lowered === 'null' || lowered === 'undefined' || lowered === 'nil' || lowered === 'none') {
    return '';
  }
  return raw;
};

export const groupQuestionsByQuestionId = (questionRows: QuestionRow[]): GroupedQuestion[] => {
  const questionMap = new Map<string, GroupedQuestion>();
  
  questionRows.forEach(row => {
    if (!questionMap.has(row.question_id)) {
      // Parse difficulty - backend may return different field names/types
      let difficultyLevel = 1;
      const rawDifficulty: any = (row as any).difficulty_level ?? (row as any).difficultyLevel ?? (row as any).difficulty ?? (row as any).level;
      if (rawDifficulty !== undefined && rawDifficulty !== null && rawDifficulty !== '') {
        const parsed = typeof rawDifficulty === 'string' ? parseInt(rawDifficulty, 10) : Number(rawDifficulty);
        if (!isNaN(parsed) && parsed >= 1 && parsed <= 10) {
          difficultyLevel = parsed;
        }
      }
      const difficultyType: string = normalizeText((row as any).difficulty_type ?? (row as any).difficultyType ?? '');
      
      // Normalize explanation fields (multiple spellings/styles)
      const explanation = normalizeText(
        (row as any).explanation 
        ?? (row as any).explaination 
        ?? (row as any).explanation_text 
        ?? (row as any).explaination_text 
        ?? (row as any).explainationText 
        ?? ''
      );
      const explanationImage = (row as any).explanation_image 
        ?? (row as any).explaination_image 
        ?? (row as any).explanationImage 
        ?? (row as any).explainationImage 
        ?? '';
      const questionImage = (row as any).question_image ?? (row as any).questionImage ?? '';
      
      questionMap.set(row.question_id, {
        question_id: row.question_id,
        subject_name: row.subject_name,
        chapter_name: (row as any).chapter_name ?? (row as any).chapterName,
        topic_name: row.topic_name,
        difficulty_level: difficultyLevel,
        difficulty_type: difficultyType || undefined,
        question_text: (row as any).question_text ?? (row as any).questionText ?? '',
        question_image: resolveImageUrl(questionImage, 'question'),
        options: [],
        explanation: explanation,
        explanation_image: resolveImageUrl(explanationImage, 'explanation'),
        created_at: row.created_at
      });
    }
    
    const groupedQuestion = questionMap.get(row.question_id);
    if (!groupedQuestion) return;

    // If explanation/image/question image were missing on the first row, fill them from subsequent rows
    const rowExplanation = normalizeText(
      (row as any).explanation 
      ?? (row as any).explaination 
      ?? (row as any).explanation_text 
      ?? (row as any).explaination_text 
      ?? (row as any).explainationText 
      ?? ''
    );
    const rowExplanationImage = (row as any).explanation_image 
      ?? (row as any).explaination_image 
      ?? (row as any).explanationImage 
      ?? (row as any).explainationImage 
      ?? '';
    const rowQuestionImage = (row as any).question_image ?? (row as any).questionImage ?? '';
    if ((!groupedQuestion.explanation || groupedQuestion.explanation === '') && rowExplanation) {
      groupedQuestion.explanation = rowExplanation;
    }
    if ((!groupedQuestion.explanation_image || groupedQuestion.explanation_image === '') && rowExplanationImage) {
      groupedQuestion.explanation_image = resolveImageUrl(rowExplanationImage, 'explanation');
    }
    if ((!groupedQuestion.question_image || groupedQuestion.question_image === '') && rowQuestionImage) {
      groupedQuestion.question_image = resolveImageUrl(rowQuestionImage, 'question');
    }
    
    let parsedOptionText = (row as any).option_text;
    let parsedOptionImage = (row as any).option_image;
    let parsedIsCorrect = (row as any).is_correct;
    
    // If API returns aggregated option1..option4 on a single row, expand once
    if (
      parsedOptionText === undefined &&
      groupedQuestion.options.length === 0 &&
      ((row as any).option1 !== undefined || (row as any).option1Text !== undefined)
    ) {
      const toBool = (v: any): boolean => {
        if (typeof v === 'boolean') return v;
        if (typeof v === 'number') return v === 1;
        if (typeof v === 'string') return v.toLowerCase() === 'true' || v === '1';
        return false;
      };
      for (let i = 1; i <= 4; i++) {
        const text = (row as any)[`option${i}Text`] ?? (row as any)[`option${i}`] ?? '';
        const image = (row as any)[`option${i}Image`] ?? '';
        const correct = toBool((row as any)[`option${i}Correct`]);
        if (text || image) {
          groupedQuestion.options.push({
            option_id: i,
            option_text: text || '',
            option_image: resolveImageUrl(image || '', 'option'),
            is_correct: correct
          });
        }
      }
      return; // already populated for this row
    }
    
    // Allow for backend that encodes option as JSON in option_text
    if ((row as any).option_text && typeof (row as any).option_text === 'string' && (row as any).option_text.trim().startsWith('{')) {
      try {
        const parsed = JSON.parse((row as any).option_text);
        parsedOptionText = parsed.optionText ?? parsed.option_text ?? (row as any).option_text;
        parsedOptionImage = parsed.optionImage ?? parsed.option_image ?? (row as any).option_image;
        parsedIsCorrect = parsed.isCorrect ?? parsed.is_correct ?? (row as any).is_correct;
      } catch (e) {
        parsedOptionText = (row as any).option_text;
      }
    }
    
    // Normalize booleans and undefineds
    if (typeof parsedIsCorrect === 'string') {
      parsedIsCorrect = parsedIsCorrect.toLowerCase() === 'true' || parsedIsCorrect === '1';
    }
    if (parsedIsCorrect === undefined || parsedIsCorrect === null) {
      parsedIsCorrect = false;
    }
    
    // Only push row-based option when present
    if (parsedOptionText !== undefined || parsedOptionImage !== undefined || parsedIsCorrect !== undefined) {
      groupedQuestion.options.push({
        option_id: (row as any).option_id,
        option_text: parsedOptionText || '',
        option_image: resolveImageUrl(parsedOptionImage || '', 'option'),
        is_correct: !!parsedIsCorrect
      });
    }
  });
  
  return Array.from(questionMap.values()).sort((a, b) => {
    if (!a.created_at || !b.created_at) return 0;
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });
};

// Format date for display
export const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

// Get difficulty level text and color
export const getDifficultyInfo = (level: number | undefined): { text: string; color: string } => {
  const actualLevel = level || 1; // Default to 1 if undefined
  if (actualLevel <= 2) {
    return { text: `Level ${actualLevel}`, color: 'bg-green-100 text-green-800' };
  } else if (actualLevel <= 4) {
    return { text: `Level ${actualLevel}`, color: 'bg-blue-100 text-blue-800' };
  } else if (actualLevel <= 6) {
    return { text: `Level ${actualLevel}`, color: 'bg-yellow-100 text-yellow-800' };
  } else if (actualLevel <= 8) {
    return { text: `Level ${actualLevel}`, color: 'bg-orange-100 text-orange-800' };
  } else if (actualLevel <= 10) {
    return { text: `Level ${actualLevel}`, color: 'bg-red-100 text-red-800' };
  } else {
    return { text: 'Unknown', color: 'bg-gray-100 text-gray-800' };
  }
};

// Truncate text for display
export const truncateText = (text: string, maxLength: number = 100): string => {
  if (text.length <= maxLength) {
    return text;
  }
  return text.substring(0, maxLength) + '...';
};

// Generate unique ID for components
export const generateId = (): string => {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
};

// Debounce function for search/filtering
export const debounce = <T extends (...args: any[]) => void>(
  func: T,
  delay: number
): ((...args: Parameters<T>) => void) => {
  let timeoutId: NodeJS.Timeout;
  
  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func(...args), delay);
  };
};

// Filter questions by search criteria
export const filterQuestions = (
  questions: GroupedQuestion[],
  searchTerm: string,
  subjectFilter: string,
  chapterFilter: string | undefined | null,
  difficultyFilter: number | null
): GroupedQuestion[] => {
  return questions.filter(question => {
    // Search term filter (case-insensitive)
    const matchesSearch = !searchTerm || 
      question.question_text.toLowerCase().includes(searchTerm.toLowerCase()) ||
      question.subject_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      question.topic_name.toLowerCase().includes(searchTerm.toLowerCase());
    
    // Subject filter
    const matchesSubject = !subjectFilter || question.subject_name === subjectFilter;
    // Chapter filter
    const matchesChapter = !chapterFilter || (question.chapter_name || '') === chapterFilter;
    
    // Difficulty filter
    const matchesDifficulty = difficultyFilter === null || question.difficulty_level === difficultyFilter;
    
    return matchesSearch && matchesSubject && matchesChapter && matchesDifficulty;
  });
};

// Get unique subjects from questions
export const getUniqueSubjects = (questions: GroupedQuestion[]): string[] => {
  const subjects = questions.map(q => q.subject_name).filter(Boolean);
  return Array.from(new Set(subjects)).sort();
};

// Get unique chapters, optionally narrowed by subject
export const getUniqueChapters = (questions: GroupedQuestion[], subject?: string): string[] => {
  const filtered = subject ? questions.filter(q => q.subject_name === subject) : questions;
  const chapters = filtered.map(q => q.chapter_name || '').filter(Boolean);
  return Array.from(new Set(chapters)).sort();
};

export default {
  groupQuestionsByQuestionId,
  formatDate,
  getDifficultyInfo,
  truncateText,
  generateId,
  debounce,
  filterQuestions,
  getUniqueSubjects,
  getUniqueChapters
};
