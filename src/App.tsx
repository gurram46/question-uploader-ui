import React, { useState } from 'react';
import QuestionUploadForm from './components/QuestionUploadForm';
import QuestionsList from './components/QuestionsList';
import ToastContainer from './components/ToastContainer';
import { useToast } from './hooks/useToast';
import './App.css';
import { QuestionFormProvider } from './context/QuestionFormContext';

type View = 'login' | 'select' | 'upload' | 'list' | 'ai';

function App() {
  const [currentView, setCurrentView] = useState<View>('login');
  const [loginUser, setLoginUser] = useState('');
  const [loginPass, setLoginPass] = useState('');
  const [loginError, setLoginError] = useState('');
  const { toasts, removeToast } = useToast();
  console.log("API Base URL:", process.env.REACT_APP_API_BASE_URL);
  console.log("Environment:", process.env.REACT_APP_ENVIRONMENT);
  const aiUrl = process.env.REACT_APP_AI_AUTOMATION_URL || 'http://localhost:5173';

  function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    if (!loginUser.trim() || !loginPass.trim()) {
      setLoginError('Enter username and password.');
      return;
    }
    setLoginError('');
    setCurrentView('select');
  }

  function handleLogout() {
    setLoginUser('');
    setLoginPass('');
    setLoginError('');
    setCurrentView('login');
  }

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

            {currentView !== 'login' && (
              <div className="flex space-x-1 overflow-x-auto no-scrollbar py-1">
                <button
                  onClick={() => setCurrentView('select')}
                  className={`px-3 py-1.5 sm:px-4 sm:py-2 text-sm font-medium rounded-md transition-colors ${
                    currentView === 'select'
                      ? 'bg-primary-100 text-primary-700 border border-primary-200'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                  }`}
                >
                  Choose Mode
                </button>
                <button
                  onClick={() => setCurrentView('upload')}
                  className={`px-3 py-1.5 sm:px-4 sm:py-2 text-sm font-medium rounded-md transition-colors ${
                    currentView === 'upload'
                      ? 'bg-primary-100 text-primary-700 border border-primary-200'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                  }`}
                >
                  Manual Entry
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
                <button
                  onClick={() => setCurrentView('ai')}
                  className={`px-3 py-1.5 sm:px-4 sm:py-2 text-sm font-medium rounded-md transition-colors ${
                    currentView === 'ai'
                      ? 'bg-primary-100 text-primary-700 border border-primary-200'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                  }`}
                >
                  AI Automation
                </button>
                <button
                  onClick={handleLogout}
                  className="px-3 py-1.5 sm:px-4 sm:py-2 text-sm font-medium rounded-md text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                >
                  Logout
                </button>
              </div>
            )}
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <QuestionFormProvider>
        <main className="py-8">
          {currentView === 'login' && (
            <div className="max-w-md mx-auto px-4">
              <div className="bg-white shadow-sm border border-gray-200 rounded-lg p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-2">Login</h2>
                <p className="text-sm text-gray-500 mb-6">Use your DocQuest credentials to continue.</p>
                <form onSubmit={handleLogin} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Username</label>
                    <input
                      value={loginUser}
                      onChange={e => setLoginUser(e.target.value)}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-200"
                      placeholder="Enter username"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                    <input
                      type="password"
                      value={loginPass}
                      onChange={e => setLoginPass(e.target.value)}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-200"
                      placeholder="Enter password"
                    />
                  </div>
                  {loginError && <div className="text-sm text-red-600">{loginError}</div>}
                  <button
                    type="submit"
                    className="w-full bg-primary-600 text-white py-2 rounded-md hover:bg-primary-700 transition-colors"
                  >
                    Login
                  </button>
                </form>
              </div>
            </div>
          )}
          {currentView === 'select' && (
            <div className="max-w-5xl mx-auto px-4">
              <h2 className="text-xl font-semibold text-gray-900 mb-6">Choose a workflow</h2>
              <div className="grid gap-6 md:grid-cols-2">
                <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Manual Entry</h3>
                  <p className="text-sm text-gray-600 mb-4">
                    Upload questions manually, review and edit metadata, then save to the database.
                  </p>
                  <button
                    onClick={() => setCurrentView('upload')}
                    className="bg-primary-600 text-white px-4 py-2 rounded-md hover:bg-primary-700 transition-colors"
                  >
                    Start Manual Entry
                  </button>
                </div>
                <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">AI Automation</h3>
                  <p className="text-sm text-gray-600 mb-4">
                    Review AI-extracted questions, verify answers, and commit in bulk.
                  </p>
                  <button
                    onClick={() => setCurrentView('ai')}
                    className="bg-primary-600 text-white px-4 py-2 rounded-md hover:bg-primary-700 transition-colors"
                  >
                    Open AI Automation
                  </button>
                </div>
              </div>
            </div>
          )}
          {currentView === 'upload' && <QuestionUploadForm />}
          {currentView === 'list' && <QuestionsList />}
          {currentView === 'ai' && (
            <div className="max-w-6xl mx-auto px-4">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-gray-900">AI Automation Review</h2>
                <a
                  href={aiUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-sm text-primary-700 hover:text-primary-900"
                >
                  Open in new tab
                </a>
              </div>
              <div className="ai-frame-wrapper">
                <iframe title="AI Automation" src={aiUrl} className="ai-frame" />
              </div>
            </div>
          )}
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
