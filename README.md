# Question Uploader UI

A secure React frontend application for uploading and managing questions in an internal database. This application works with a backend API deployed on Render and provides a user-friendly interface for question management with secure file handling via AWS S3.

## Features

### 🔐 Security First
- **No AWS credentials in frontend** - Uses pre-signed URLs for secure S3 uploads
- **Input sanitization** - All user input is sanitized to prevent XSS attacks
- **ESLint security rules** - Enforced security best practices in code
- **Type-safe** - Built with TypeScript for enhanced security and reliability

### 📝 Question Management
- **Upload Questions** - Create questions with multiple choice answers
- **Rich Options** - Support for text and image options (at least 2 required)
- **Multiple Correct Answers** - Checkboxes allow multiple correct options
- **Explanations** - Optional explanations with text and images
- **Validation** - Comprehensive client-side validation

### 🖼️ File Handling
- **Secure S3 Integration** - Images uploaded via pre-signed URLs
- **File Validation** - Supports JPG, PNG, WebP formats (max 5MB)
- **Error Handling** - Proper error messages for upload failures

### 📊 Question Display
- **Smart Grouping** - Groups flat API responses by question_id
- **Search & Filter** - Filter by subject, topic, or difficulty level
- **Expandable Cards** - Click to view full question details
- **Responsive Design** - Works on desktop and mobile devices

## Tech Stack

- **React 18** with functional components and hooks
- **TypeScript** for type safety
- **Tailwind CSS** for styling
- **Axios** for API communication
- **ESLint** with security plugins
- **Custom hooks** for state management

## Prerequisites

- Node.js 16+ and npm
- Access to the backend API (deployed on Render)
- AWS S3 bucket configured for image storage

## Installation

1. **Clone and setup the project:**
```bash
git clone <repository-url>
cd question-uploader-ui
npm install
```

2. **Environment Configuration:**
Copy `.env.example` to `.env` and update with your values:
```bash
cp .env.example .env
```

Edit `.env` file:
```env
# API Configuration
REACT_APP_API_BASE_URL=https://docquest-questions-backend.onrender.com

# Environment
REACT_APP_ENVIRONMENT=development
```

3. **Install Tailwind CSS:**
```bash
npm install -D tailwindcss postcss autoprefixer
npx tailwindcss init -p
```

## Usage

### Development
```bash
npm start
```
The application will open at `http://localhost:3000`

### Production Build
```bash
npm run build
```

### Linting
```bash
npm run lint          # Check for issues
npm run lint:fix      # Auto-fix issues
```

### Testing
```bash
npm test
```

## API Integration

The frontend integrates with the DocQuest backend deployed at `https://docquest-questions-backend.onrender.com` with two main API endpoints:

### POST /uploadquestion
Uploads a new question with the following payload structure:
```typescript
{
  subjectName: string;           // Letters only, required
  topicName: string;             // Letters & numbers, required  
  difficultyLevel: number;       // 1-5, required
  questionText: string;          // Required
  questionImage?: string;        // S3 URL, optional
  options: Array<{
    option_text?: string;        // Optional but at least 2 options must have text or image
    option_image?: string;       // S3 URL, optional
    is_correct: boolean;         // At least 1 must be true
  }>;
  explanation?: string;          // Optional
  explanationImage?: string;     // S3 URL, optional
}
```

### GET /getquestions
Returns all questions in flat format (one row per option). The frontend groups these by `question_id`.

## File Upload Process

1. **Validation** - Files are validated for type (JPG, PNG, WebP) and size (≤5MB)
2. **FormData Creation** - Question data and files are packaged into FormData
3. **Direct Upload** - FormData is sent directly to backend API
4. **Backend Processing** - Backend handles S3 upload and database storage

## Security Features

### Input Sanitization
All text inputs are sanitized to prevent XSS:
```typescript
const sanitizeString = (input: string): string => {
  return input
    .trim()
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
};
```

### Validation Rules
- **Subject Name**: Letters and spaces only, 2-50 characters
- **Topic Name**: Letters, numbers, and spaces, 2-50 characters
- **Difficulty Level**: Integer between 1-5
- **Question Text**: 10-1000 characters required
- **Options**: At least 2 must have content, at least 1 must be correct
- **Explanation**: Optional, max 1000 characters

### ESLint Security Rules
- Detects potential security vulnerabilities
- Prevents dangerous patterns like `eval()` and `innerHTML`
- Enforces React security best practices

## Project Structure

```
src/
├── components/           # React components
│   ├── QuestionUploadForm.tsx
│   ├── QuestionsList.tsx
│   ├── Toast.tsx
│   └── ToastContainer.tsx
├── hooks/               # Custom React hooks
│   └── useToast.ts
├── services/            # API and external service integration
│   ├── api.ts
│   └── s3Upload.ts
├── types/               # TypeScript type definitions
│   └── index.ts
├── utils/               # Utility functions
│   ├── validation.ts
│   └── dataProcessing.ts
├── App.tsx              # Main application component
├── App.css              # Styles with Tailwind imports
└── index.tsx            # Application entry point
```

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `REACT_APP_API_BASE_URL` | Backend API base URL | Yes |
| `REACT_APP_ENVIRONMENT` | Environment identifier | Optional |

## Error Handling

The application includes comprehensive error handling:

- **Network Errors** - Timeout and connection handling
- **Validation Errors** - Client-side form validation
- **Upload Errors** - File upload error messages
- **API Errors** - Backend error message display
- **Toast Notifications** - User-friendly error/success messages

## Browser Compatibility

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

## Contributing

1. Follow the existing code structure and patterns
2. Run `npm run lint` before committing
3. Ensure all form validations work properly
4. Test file uploads with various image formats
5. Verify error handling for network issues

## Deployment

### Frontend Deployment (Netlify/Vercel)
1. Build the project: `npm run build`
2. Deploy the `build` folder
3. Configure environment variables in deployment platform

### Environment-Specific Configuration
- **Development**: Local API server
- **Staging**: Staging API on Render
- **Production**: Production API on Render

## Troubleshooting

### Common Issues

**File Upload Fails**
- Check backend API connectivity
- Verify file format is supported (JPG, PNG, WebP)
- Ensure file size is under 5MB

**API Errors**
- Verify `REACT_APP_API_BASE_URL` is correct
- Check network connectivity
- Confirm backend API is running

**Validation Errors**
- Review form requirements in UI
- Check console for detailed validation messages

**Build Errors**
- Run `npm install` to ensure all dependencies
- Check TypeScript errors with `npm run lint`

## License

Internal use only - Proprietary software for company database management.

## Support

For technical support, please contact the development team or create an issue in the internal repository.
