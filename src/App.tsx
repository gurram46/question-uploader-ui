import React, { useState } from 'react';
import QuestionUploadForm from './components/QuestionUploadForm';
import QuestionsList from './components/QuestionsList';
import ToastContainer from './components/ToastContainer';
import { useToast } from './hooks/useToast';
import './App.css';
import { QuestionFormProvider } from './context/QuestionFormContext';
import ReviewApp from './ReviewApp';
import { getExpressBase } from './utils/apiBase';
import AISimplifiedAutomation from './components/AISimplifiedAutomation';
import EasyModeScreen from './components/EasyModeScreen';

type View = 'login' | 'select' | 'upload' | 'list' | 'ai' | 'aiSimplified' | 'easyMode';
const formControlClass =
  'w-full border border-gray-300 rounded-md px-3 py-2 bg-white text-slate-900 placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-primary-200';

function App() {
  const [currentView, setCurrentView] = useState<View>('login');
  const [loginUser, setLoginUser] = useState('');
  const [loginPass, setLoginPass] = useState('');
  const [loginError, setLoginError] = useState('');
  const [authUser, setAuthUser] = useState(localStorage.getItem('username') || '');
  const [registerMode, setRegisterMode] = useState(false);
  const [registerUser, setRegisterUser] = useState('');
  const [registerEmail, setRegisterEmail] = useState('');
  const [registerPass, setRegisterPass] = useState('');
  const [registerPass2, setRegisterPass2] = useState('');
  const [registerRole, setRegisterRole] = useState('student');
  const [registerError, setRegisterError] = useState('');
  const { toasts, removeToast } = useToast();
  console.log("API Base URL:", process.env.REACT_APP_API_BASE_URL);
  console.log("Environment:", process.env.REACT_APP_ENVIRONMENT);
  const isAiView = currentView === 'ai';

  const EXPRESS_BASE = getExpressBase();

  React.useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) return;
    fetch(`${EXPRESS_BASE}/auth/me`, { headers: { Authorization: `Bearer ${token}` } })
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        const meUser = data?.user?.username || data?.username;
        if (meUser) {
          setAuthUser(meUser);
          localStorage.setItem('username', meUser);
          setCurrentView('select');
        }
      })
      .catch(() => {});
  }, [EXPRESS_BASE]);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    if (!loginUser.trim() || !loginPass.trim()) {
      setLoginError('Enter username and password.');
      return;
    }
    setLoginError('');
    const loginId = loginUser.trim();
    try {
      const attempts: Record<string, string>[] = loginId.includes('@')
        ? [
            { identifier: loginId, email: loginId, password: loginPass },
            { email: loginId, password: loginPass }
          ]
        : [
            { identifier: loginId, username: loginId, password: loginPass },
            { username: loginId, password: loginPass },
            { identifier: loginId.toLowerCase(), username: loginId.toLowerCase(), password: loginPass }
          ];

      let lastError = 'Login failed.';
      let data: any = null;
      let ok = false;

      for (const payload of attempts) {
        const res = await fetch(`${EXPRESS_BASE}/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        const raw = await res.text();
        if (res.ok) {
          try {
            data = raw ? JSON.parse(raw) : {};
          } catch {
            data = {};
          }
          ok = true;
          break;
        }
        try {
          const parsed = raw ? JSON.parse(raw) : {};
          lastError = parsed?.error || parsed?.detail || lastError;
        } catch {
          lastError = raw || lastError;
        }
      }

      if (!ok) {
        setLoginError(lastError);
        return;
      }
      if (data?.token) {
        localStorage.setItem('token', data.token);
      }
      const loggedInUser = data?.user?.username || data?.username;
      if (loggedInUser) {
        localStorage.setItem('username', loggedInUser);
        setAuthUser(loggedInUser);
      }
      setCurrentView('select');
    } catch {
      setLoginError('Login failed.');
    }
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    if (!registerUser.trim() || !registerEmail.trim() || !registerPass.trim()) {
      setRegisterError('Enter username, email and password.');
      return;
    }
    if (registerPass !== registerPass2) {
      setRegisterError('Passwords do not match.');
      return;
    }
    setRegisterError('');
    const payload = {
      username: registerUser.trim(),
      email: registerEmail.trim(),
      password: registerPass,
      role: registerRole
    };
    try {
      const res = await fetch(`${EXPRESS_BASE}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (!res.ok) {
        const msg = await res.text();
        setRegisterError(msg || 'Registration failed.');
        return;
      }
      setRegisterMode(false);
      setLoginUser(registerUser);
      setLoginPass(registerPass);
      setLoginError('');
    } catch {
      setRegisterError('Registration failed.');
    }
  }

  function handleLogout() {
    setLoginUser('');
    setLoginPass('');
    setLoginError('');
    setAuthUser('');
    localStorage.removeItem('token');
    localStorage.removeItem('username');
    setCurrentView('login');
    fetch(`${EXPRESS_BASE}/auth/logout`, { method: 'POST' }).catch(() => {});
  }

  function handleResetAppData() {
    localStorage.clear();
    sessionStorage.clear();
    setLoginUser('');
    setLoginPass('');
    setLoginError('');
    setAuthUser('');
    setCurrentView('login');
    window.location.reload();
  }

  return (
    <div className={`min-h-screen app-root ${isAiView ? 'ai-mode' : 'bg-gray-100'}`}>
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
                  onClick={() => setCurrentView('easyMode')}
                  className={`px-3 py-1.5 sm:px-4 sm:py-2 text-sm font-medium rounded-md transition-colors ${
                    currentView === 'easyMode'
                      ? 'bg-primary-100 text-primary-700 border border-primary-200'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                  }`}
                >
                  Easy Mode
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
        <main className={isAiView ? 'ai-full' : 'py-8'}>
          {currentView === 'login' && (
            <div className="max-w-md mx-auto px-4">
              <div className="bg-white shadow-sm border border-gray-200 rounded-lg p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-2">{registerMode ? 'Create Account' : 'Login'}</h2>
                <p className="text-sm text-gray-500 mb-6">
                  {registerMode ? 'Create a new DocQuest account.' : 'Use your DocQuest credentials to continue.'}
                </p>
                {!registerMode ? (
                  <form onSubmit={handleLogin} className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Username or Email</label>
                      <input
                        value={loginUser}
                        onChange={e => setLoginUser(e.target.value)}
                        className={formControlClass}
                        placeholder="Enter username or email"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                      <input
                        type="password"
                        value={loginPass}
                        onChange={e => setLoginPass(e.target.value)}
                        className={formControlClass}
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
                    <button
                      type="button"
                      className="w-full text-xs text-gray-400 hover:text-gray-200"
                      onClick={handleResetAppData}
                    >
                      Reset app data
                    </button>
                    <div className="text-center">
                      <button
                        type="button"
                        className="text-sm text-primary-600 hover:text-primary-700"
                        onClick={() => {
                          setRegisterMode(true);
                          setRegisterError('');
                          setLoginError('');
                        }}
                      >
                        Create account
                      </button>
                    </div>
                  </form>
                ) : (
                  <form onSubmit={handleRegister} className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Username</label>
                      <input
                        value={registerUser}
                        onChange={e => setRegisterUser(e.target.value)}
                        className={formControlClass}
                        placeholder="Enter username"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                      <input
                        value={registerEmail}
                        onChange={e => setRegisterEmail(e.target.value)}
                        className={formControlClass}
                        placeholder="Enter email"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                      <input
                        type="password"
                        value={registerPass}
                        onChange={e => setRegisterPass(e.target.value)}
                        className={formControlClass}
                        placeholder="Enter password"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Confirm password</label>
                      <input
                        type="password"
                        value={registerPass2}
                        onChange={e => setRegisterPass2(e.target.value)}
                        className={formControlClass}
                        placeholder="Confirm password"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                      <select
                        value={registerRole}
                        onChange={e => setRegisterRole(e.target.value)}
                        className={formControlClass}
                      >
                        <option value="student">Student</option>
                        <option value="admin">Admin</option>
                        <option value="college">College</option>
                        <option value="super_admin">Super Admin</option>
                        <option value="sub_admin">Sub Admin</option>
                      </select>
                    </div>
                    {registerError && <div className="text-sm text-red-600">{registerError}</div>}
                    <button
                      type="submit"
                      className="w-full bg-primary-600 text-white py-2 rounded-md hover:bg-primary-700 transition-colors"
                    >
                      Create account
                    </button>
                    <div className="text-center">
                      <button
                        type="button"
                        className="text-sm text-primary-600 hover:text-primary-700"
                        onClick={() => {
                          setRegisterMode(false);
                          setRegisterError('');
                          setLoginError('');
                        }}
                      >
                        Back to login
                      </button>
                    </div>
                  </form>
                )}
              </div>
            </div>
          )}
          {currentView === 'select' && (
            <div className="workflow-shell max-w-6xl mx-auto px-4">
              <section className="workflow-hero">
                <div className="workflow-hero-copy">
                  <p className="workflow-eyebrow">Choose a workflow</p>
                  <h2 className="workflow-title">Start with the simplest path that still gets the job done</h2>
                  <p className="workflow-copy">
                    Most operators should start with Easy Mode. Use the heavier screens only when you need more review control,
                    batch debugging, or manual cleanup.
                  </p>
                  <div className="workflow-hero-pills">
                    <span>Fastest for daily work</span>
                    <span>Less confusion on screen</span>
                    <span>Full tools still available</span>
                  </div>
                </div>
                <div className="workflow-highlight">
                  <span>Recommended first stop</span>
                  <strong>Easy Mode</strong>
                  <p>Upload, review the answer key, fix flagged items, add metadata, and commit in the shortest path.</p>
                  <button onClick={() => setCurrentView('easyMode')} className="workflow-btn primary">
                    Open Easy Mode
                  </button>
                </div>
              </section>

              <section className="workflow-decision-strip">
                <div className="workflow-decision-card">
                  <span>Need speed?</span>
                  <strong>Choose Easy Mode</strong>
                  <p>Best when the goal is to finish batches quickly with fewer decisions.</p>
                </div>
                <div className="workflow-decision-card">
                  <span>Need control?</span>
                  <strong>Choose AI Automation</strong>
                  <p>Best for deep cleanup, debugging extraction, and advanced review work.</p>
                </div>
                <div className="workflow-decision-card">
                  <span>Need a middle ground?</span>
                  <strong>Choose AI Simplified</strong>
                  <p>Best when Easy Mode is too light but AI Automation feels too dense.</p>
                </div>
              </section>

              <section className="workflow-grid">
                <article className="workflow-card">
                  <div className="workflow-card-top">
                    <p className="workflow-card-label">Manual</p>
                    <h3>Manual Entry</h3>
                  </div>
                  <div className="workflow-card-meta">
                    <span>Slowest</span>
                    <span>Most manual</span>
                  </div>
                  <p className="workflow-card-copy">
                    Best when you already know the question data and want to enter it carefully by hand.
                  </p>
                  <ul className="workflow-card-points">
                    <li>Full manual control</li>
                    <li>Best for one-off questions</li>
                    <li>Slowest workflow</li>
                  </ul>
                  <button onClick={() => setCurrentView('upload')} className="workflow-btn secondary">
                    Start Manual Entry
                  </button>
                </article>

                <article className="workflow-card">
                  <div className="workflow-card-top">
                    <p className="workflow-card-label">Advanced</p>
                    <h3>AI Automation</h3>
                  </div>
                  <div className="workflow-card-meta">
                    <span>Most powerful</span>
                    <span>Dense UI</span>
                  </div>
                  <p className="workflow-card-copy">
                    Best for power users who need the full review surface, batch controls, and deep cleanup tools.
                  </p>
                  <ul className="workflow-card-points">
                    <li>Most powerful workflow</li>
                    <li>Best for debugging extraction</li>
                    <li>Dense interface</li>
                  </ul>
                  <button onClick={() => setCurrentView('ai')} className="workflow-btn secondary">
                    Open AI Automation
                  </button>
                </article>

                <article className="workflow-card">
                  <div className="workflow-card-top">
                    <p className="workflow-card-label">Bridge</p>
                    <h3>AI Simplified Automation</h3>
                  </div>
                  <div className="workflow-card-meta">
                    <span>Balanced</span>
                    <span>Diagram aware</span>
                  </div>
                  <p className="workflow-card-copy">
                    Best when you want a lighter automation workspace but still need more visible controls than Easy Mode.
                  </p>
                  <ul className="workflow-card-points">
                    <li>Guided upload flow</li>
                    <li>Answer-key review</li>
                    <li>Diagram-aware editing</li>
                  </ul>
                  <button onClick={() => setCurrentView('aiSimplified')} className="workflow-btn secondary">
                    Open AI Simplified
                  </button>
                </article>

                <article className="workflow-card workflow-card--featured">
                  <div className="workflow-badge">Recommended</div>
                  <div className="workflow-card-top">
                    <p className="workflow-card-label">Fastest</p>
                    <h3>Easy Mode</h3>
                  </div>
                  <div className="workflow-card-meta">
                    <span>Fastest</span>
                    <span>Least confusing</span>
                  </div>
                  <p className="workflow-card-copy">
                    Best for operators who need the fastest guided flow with fewer decisions on screen.
                  </p>
                  <ul className="workflow-card-points">
                    <li>One flagged question at a time</li>
                    <li>Top-first metadata</li>
                    <li>Mobile-friendly workflow</li>
                  </ul>
                  <button onClick={() => setCurrentView('easyMode')} className="workflow-btn primary">
                    Open Easy Mode
                  </button>
                </article>
              </section>
            </div>
          )}
          {currentView === 'upload' && <QuestionUploadForm />}
          {currentView === 'list' && <QuestionsList />}
          {currentView === 'ai' && <ReviewApp bootUser={authUser} showTitle={false} onLogout={handleLogout} />}
          {currentView === 'aiSimplified' && <AISimplifiedAutomation />}
          {currentView === 'easyMode' && <EasyModeScreen />}
        </main>
      </QuestionFormProvider>

      {/* Footer */}
      {!isAiView && <footer className="bg-white border-t border-gray-200 py-6 mt-12">
        <div className="max-w-6xl mx-auto px-4 text-center">
          <p className="text-sm text-gray-700">
            Secure Question Uploader • Internal Database Management System
          </p>
          <p className="text-xs text-gray-600 mt-1">
            Environment: {process.env.REACT_APP_ENVIRONMENT || 'development'}
          </p>
        </div>
      </footer>}

      {/* Toast Notifications */}
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </div>
  );
}

export default App;
