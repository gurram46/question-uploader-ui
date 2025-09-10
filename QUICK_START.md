# Quick Start

## Run the app

```bash
npm install
npm start
```

App runs on http://localhost:3000

## Test with your backend

Already configured to use: https://docquest-questions-backend.onrender.com

If you need to change it, edit `.env`:
```
REACT_APP_API_BASE_URL=your-url-here
```

## Current status

✅ Working:
- Question upload (text only)
- Question listing
- Filtering & search

⚠️ Backend issues:
- Difficulty level not being saved/returned
- Image uploads cause 500 errors
- Field naming: needs "explaination" (with that spelling)

Check `backend-notes.md` for details.

## Build for production

```bash
npm run build
```

Outputs to `/build` folder.
