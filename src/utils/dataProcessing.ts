import { QuestionRow, GroupedQuestion } from '../types';

// Group flat question rows by question_id
export const groupQuestionsByQuestionId = (questionRows: QuestionRow[]): GroupedQuestion[] => {
  const questionMap = new Map<string, GroupedQuestion>();
  
  questionRows.forEach(row => {
    if (!questionMap.has(row.question_id)) {
      // Create new grouped question
      questionMap.set(row.question_id, {
        question_id: row.question_id,
        subject_name: row.subject_name,
        topic_name: row.topic_name,
        difficulty_level: row.difficulty_level,
        question_text: row.question_text,
        question_image: row.question_image,
        options: [],
        explanation: row.explanation,
        explanation_image: row.explanation_image,
        created_at: row.created_at
      });
    }
    
    // Add option to the grouped question
    const groupedQuestion = questionMap.get(row.question_id)!;
    
    // Parse option_text if it's a JSON string
    let parsedOptionText = row.option_text;
    let parsedOptionImage = row.option_image;
    let parsedIsCorrect = row.is_correct;
    
    if (row.option_text && typeof row.option_text === 'string' && row.option_text.startsWith('{')) {
      try {
        const parsed = JSON.parse(row.option_text);
        parsedOptionText = parsed.optionText || row.option_text;
        parsedOptionImage = parsed.optionImage || row.option_image;
        parsedIsCorrect = parsed.isCorrect !== undefined ? parsed.isCorrect : row.is_correct;
      } catch (e) {
        // If parsing fails, use the original text
        parsedOptionText = row.option_text;
      }
    }
    
    // Handle is_correct as string 'True'/'False' or boolean
    if (typeof parsedIsCorrect === 'string') {
      parsedIsCorrect = parsedIsCorrect.toLowerCase() === 'true';
    }
    
    groupedQuestion.options.push({
      option_id: row.option_id,
      option_text: parsedOptionText,
      option_image: parsedOptionImage,
      is_correct: parsedIsCorrect
    });
  });
  
  // Convert map values to array and sort by creation date (newest first) if available
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
export const getDifficultyInfo = (level: number): { text: string; color: string } => {
  switch (level) {
    case 1:
      return { text: 'Very Easy', color: 'bg-green-100 text-green-800' };
    case 2:
      return { text: 'Easy', color: 'bg-blue-100 text-blue-800' };
    case 3:
      return { text: 'Medium', color: 'bg-yellow-100 text-yellow-800' };
    case 4:
      return { text: 'Hard', color: 'bg-orange-100 text-orange-800' };
    case 5:
      return { text: 'Very Hard', color: 'bg-red-100 text-red-800' };
    default:
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
    
    // Difficulty filter
    const matchesDifficulty = difficultyFilter === null || question.difficulty_level === difficultyFilter;
    
    return matchesSearch && matchesSubject && matchesDifficulty;
  });
};

// Get unique subjects from questions
export const getUniqueSubjects = (questions: GroupedQuestion[]): string[] => {
  const subjects = questions.map(q => q.subject_name).filter(Boolean);
  return Array.from(new Set(subjects)).sort();
};

export default {
  groupQuestionsByQuestionId,
  formatDate,
  getDifficultyInfo,
  truncateText,
  generateId,
  debounce,
  filterQuestions,
  getUniqueSubjects
};
