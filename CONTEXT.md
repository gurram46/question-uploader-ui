# Session Context

This file captures the current integration context so you can resume quickly.

## API

- Base: `REACT_APP_API_BASE_URL` (current: `https://docquest-questions-backend.onrender.com`)
- Endpoints:
  - POST ` /uploadquestion` (multipart/form-data)
  - GET  ` /getquestions`

## POST Schema (exact order)

1. `questionImage` (File, optional)
2. `subjectName` (String)
3. `topicName` (String)
4. `difficultyLevel` (String number "1"–"10")
5. `questionText` (String)
6. `option1Correct` ("1" or "0")
7. `option1` (String)
8. `option2Correct` ("1" or "0")
9. `option2` (String)
10. `option3Correct` ("1" or "0")
11. `option3` (String)
12. `option4Correct` ("1" or "0")
13. `option4` (String)
14. `explaination` (String; spelling as per backend)
15. `option1Image` (File, optional)
16. `option2Image` (File, optional)
17. `option3Image` (File, optional)
18. `option4Image` (File, optional)
19. `explainationImage` (File, optional)

Notes:
- Browser sets the multipart boundary automatically (no manual `Content-Type`).
- `difficultyLevel` coerced to integer 1–10 before appending.

## GET Mapping (UI normalization)

- Question text: `question_text` | `questionText`
- Subject/topic: `subject_name` | `subjectName`, `topic_name` | `topicName`
- Difficulty: coerced to number 1–10 if backend returns string
- Explanation text: `explaination` | `explanation` | variants; strings like "null" → hidden
- Images:
  - Question: `question_image`
  - Option: `option_image`
  - Explanation: `explanation_image` | `explainationImage`
  - If values are IDs/tokens, UI builds URLs via base env vars below

## Image URL Bases (env)

- `REACT_APP_IMAGE_BASE_URL` (generic fallback)
- `REACT_APP_QUESTION_IMAGE_BASE_URL` (optional, overrides for question images)
- `REACT_APP_OPTION_IMAGE_BASE_URL` (optional, overrides for option images)
- `REACT_APP_EXPLANATION_IMAGE_BASE_URL` (optional, overrides for explanation images)

If not set, generic fallback uses `${REACT_APP_API_BASE_URL}/image/{id}`.

## Files Touched

- `src/components/QuestionUploadForm.tsx` — uses `createQuestionFormData`, difficulty UI 1–10
- `src/services/uploadService.ts` — builds ordered FormData, `optionNCorrect` as 1/0
- `src/services/api.ts` — FormData header fix; safe FormData logger
- `src/components/QuestionsList.tsx` — shows explanation text/image; field normalization
- `src/utils/dataProcessing.ts` — groups rows; fills missing explanation/image; image URL resolver
- `BACKEND_FORMAT_TEST.md` — reference schema
- `backend-issues.md` — known backend issues and recommendations

## Known Gaps / Next Actions

- Explanation image display depends on the correct base route. Set:
  - `REACT_APP_EXPLANATION_IMAGE_BASE_URL` to your actual explanation image download path.
- If backend returns a different key name for explanation image, add that alias in `dataProcessing.ts`.
- Confirm GET returns explanation text for the rows created by POST; if not, backend needs to return it.

## How to Verify

1. Post a question with: text, one option marked correct, optional images, and `explaination` text.
2. Check DevTools → Network → `uploadquestion` → Form Data: field names and order match list above.
3. Reload list view: question, options, explanation text, and images should appear.
4. If images don’t load, set `REACT_APP_*_IMAGE_BASE_URL` envs and restart.

