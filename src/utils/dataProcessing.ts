import { QuestionRow, GroupedQuestion } from '../types';

// Group flat question rows by question_id
export const groupQuestionsByQuestionId = (questionRows: QuestionRow[]): GroupedQuestion[] => {
  const questionMap = new Map<number, GroupedQuestion>();
  
  questionRows.forEach(row => {
    if (!questionMap.has(row.question_id)) {
      // Create new grouped question
      questionMap.set(row.question_id, {
        question_id: row.question_id,
        subjectName: row.subjectName,
        topicName: row.topicName,
        difficultyLevel: row.difficultyLevel,
        questionText: row.questionText,
        questionImage: row.questionImage,
        options: [],
        explanation: row.explanation,
        explanationImage: row.explanationImage,
        created_at: row.created_at
      });
    }
    
    // Add option to the grouped question
    const groupedQuestion = questionMap.get(row.question_id)!;
    groupedQuestion.options.push({
      option_id: row.option_id,
      option_text: row.option_text,
      option_image: row.option_image,
      is_correct: row.is_correct
    });
  });
  
  // Convert map values to array and sort by creation date (newest first)
  return Array.from(questionMap.values()).sort((a, b) => 
    new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );
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
      question.questionText.toLowerCase().includes(searchTerm.toLowerCase()) ||
      question.subjectName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      question.topicName.toLowerCase().includes(searchTerm.toLowerCase());
    
    // Subject filter
    const matchesSubject = !subjectFilter || question.subjectName === subjectFilter;
    
    // Difficulty filter
    const matchesDifficulty = difficultyFilter === null || question.difficultyLevel === difficultyFilter;
    
    return matchesSearch && matchesSubject && matchesDifficulty;
  });
};

// Get unique subjects from questions
export const getUniqueSubjects = (questions: GroupedQuestion[]): string[] => {
  const subjects = questions.map(q => q.subjectName);
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
