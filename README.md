# Question Uploader UI

A secure React frontend application for uploading and managing questions in an internal database. This application works with a backend API deployed on Render and provides a user-friendly interface for question management with secure file handling.

## Recent Updates

- Renamed `.env.example` to `.env` for easier configuration
- Updated file upload service module name for clarity
- Added technical issues report identifying areas for improvement
- Security analysis completed and documented

## Setup Instructions

1. Copy `.env.example` to `.env` and update with your values
2. Install dependencies: `npm install`
3. Start development server: `npm start`

## Technical Documentation

See `technical_issues_report.md` for a comprehensive analysis of identified issues and recommendations for improvement.

## Implementation Notes

- The application sends question data as JSON payloads (not multipart/form-data)
- Image fields are included as empty strings in the JSON when no images are selected
- This design choice ensures compatibility with the backend API

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `REACT_APP_API_BASE_URL` | Backend API base URL | Yes |
| `REACT_APP_ENVIRONMENT` | Environment identifier | Optional |