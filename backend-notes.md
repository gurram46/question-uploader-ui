# Backend Integration Notes

## Current Issues

### 1. Difficulty Level Not Saving
The backend doesn't save or return the difficulty level when fetching questions. We're sending it correctly but it's not coming back in the GET response. Defaulting to level 1 for now.

### 2. Image Uploads
Backend returns 500 errors when we try to send actual image files. Currently sending empty strings for all image fields until this is fixed.

### 3. Field Naming
Backend expects some weird field names:
- `explaination` (yes, with that spelling)
- `explainationImage` (same spelling issue)

Just rolling with it for now.

## What's Working
- Text-only question uploads work fine
- Question listing works
- Options are being saved correctly

## API Endpoints
- POST `/uploadquestion` - Upload new question
- GET `/getquestions` - Get all questions

## Payload Format
Backend wants options as separate JSON objects:
```json
{
  "option1": { "optionText": "...", "optionImage": "", "isCorrect": false },
  "option2": { "optionText": "...", "optionImage": "", "isCorrect": false },
  // etc
}
```

## Testing
Test with text-only questions for now. Don't try uploading images until backend fixes the 500 error.
