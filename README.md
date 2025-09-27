# Question Uploader UI

React app for uploading questions to the backend with Google Cloud Storage for image access.

## Setup

1. Install deps: `npm install`
2. Start: `npm start`
3. Build: `npm run build`

## Backend API

Point to your backend in `.env`:
```
REACT_APP_API_BASE_URL=https://your-backend-url.com
```

## Image Handling

This application is configured to use Google Cloud Storage for image access:
- Images are served from: `https://storage.googleapis.com/docquest/images/:id`
- When the backend returns image IDs, they are automatically transformed to the GCS URL format
- For image IDs, the format used is: `https://storage.googleapis.com/docquest/images/{image-id}`

## Notes

- Check `backend-notes.md` for known backend issues
- Currently uploads text only (no images yet)
- Works with the backend at docquest-questions-backend.onrender.com
