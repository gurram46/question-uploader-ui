import React, { useState } from 'react';
import QuestionUploadForm from './components/QuestionUploadForm';
import QuestionsList from './components/QuestionsList';
import ToastContainer from './components/ToastContainer';
import { useToast } from './hooks/useToast';
import './App.css';
import { QuestionFormProvider } from './context/QuestionFormContext';

type View = 'upload' | 'list';

function App() {
  const [currentView, setCurrentView] = useState<View>('upload');
  const { toasts, removeToast } = useToast();
  console.log("API Base URL:", process.env.REACT_APP_API_BASE_URL);
  console.log("Environment:", process.env.REACT_APP_ENVIRONMENT);

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Navigation */}
      <nav className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-20">
        <div className="max-w-6xl mx-auto px-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:justify-between sm:items-center sm:h-16 py-2">
            <div className="flex items-baseline justify-between">
              <h1 className="text-lg sm:text-xl font-bold text-gray-900 leading-tight">Question Uploader</h1>
              <span className="ml-2 hidden sm:inline text-sm text-gray-500">Internal Database</span>
            </div>

            <div className="flex space-x-1 overflow-x-auto no-scrollbar py-1">
              <button
                onClick={() => setCurrentView('upload')}
                className={`px-3 py-1.5 sm:px-4 sm:py-2 text-sm font-medium rounded-md transition-colors ${
                  currentView === 'upload'
                    ? 'bg-primary-100 text-primary-700 border border-primary-200'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                }`}
              >
                Upload Question
              </button>
              <button
                onClick={() => setCurrentView('list')}
                className={`px-3 py-1.5 sm:px-4 sm:py-2 text-sm font-medium rounded-md transition-colors ${
                  currentView === 'list'
                    ? 'bg-primary-100 text-primary-700 border border-primary-200'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                }`}
              >
                View Questions
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <QuestionFormProvider>
        <main className="py-8">
          {currentView === 'upload' && <QuestionUploadForm />}
          {currentView === 'list' && <QuestionsList />}
        </main>
      </QuestionFormProvider>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 py-6 mt-12">
        <div className="max-w-6xl mx-auto px-4 text-center">
          <p className="text-sm text-gray-500">
            Secure Question Uploader • Internal Database Management System
          </p>
          <p className="text-xs text-gray-400 mt-1">
            Environment: {process.env.REACT_APP_ENVIRONMENT || 'development'}
          </p>
        </div>
      </footer>

      {/* Toast Notifications */}
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </div>
  );
}

export default App;
