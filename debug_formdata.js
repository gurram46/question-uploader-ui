// Debug script to show exactly what FormData we're sending
// Run this in browser console to see the FormData contents

function debugFormData() {
  // Sample form data that matches what our React app sends
  const formData = new FormData();
  
  formData.append('subjectName', 'Mathematics');
  formData.append('topicName', 'Algebra');
  formData.append('difficultyLevel', '5');
  formData.append('questionText', 'What is 2+2?');
  
  formData.append('option1', 'Three');
  formData.append('option1Correct', 'false');
  
  formData.append('option2', 'Four');
  formData.append('option2Correct', 'true');
  
  formData.append('option3', 'Five');
  formData.append('option3Correct', 'false');
  
  formData.append('option4', 'Six');
  formData.append('option4Correct', 'false');
  
  formData.append('explaination', 'Basic arithmetic');
  
  console.log('=== FormData Contents ===');
  for (const [key, value] of formData.entries()) {
    console.log(`${key}: ${value} (type: ${typeof value})`);
  }
}

// Run the debug function
debugFormData();
