# Backend FormData Format

## What the Frontend Now Sends

The frontend now sends data as **FormData** (multipart/form-data) with these exact field names:

```
subjectName: "Mathematics"
topicName: "Algebra"
difficultyLevel: "5"
questionText: "What is 2+2?"
questionImage: [File] (if uploaded, otherwise empty)

option1: "3"
option1Correct: "false"
option1Image: [File] (if uploaded, otherwise empty)

option2: "4"
option2Correct: "true"
option2Image: [File] (if uploaded, otherwise empty)

option3: "5"
option3Correct: "false"
option3Image: [File] (if uploaded, otherwise empty)

option4: "6"
option4Correct: "false"
option4Image: [File] (if uploaded, otherwise empty)

explanation: "Basic arithmetic"
explanationImage: [File] (if uploaded, otherwise empty)
```

## Changes Made

1. **Updated QuestionUploadForm.tsx**: Now uses `createQuestionFormData()` instead of JSON payload
2. **Updated uploadService.ts**: Fixed `createQuestionFormData()` to use the exact field names your backend expects
3. **Form submission**: Now sends as FormData with `multipart/form-data` content type
4. **API service**: Already supported both FormData and JSON - no changes needed

## Backend Compatibility

This exactly matches the current backend format:
- `option1`, `option1Image`, `option1Correct` (not nested objects)
- `subjectName`, `topicName`, `difficultyLevel`
- `questionText`, `questionImage`
- `explanation`, `explanationImage`

The frontend will work with your existing backend without any backend changes needed.
