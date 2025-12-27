type ApiMode = 'prod' | 'local';

const MODE_KEY = 'dq_api_mode';
const PROD_EXPRESS = 'https://docquest-express-l5mby46qbq-el.a.run.app';
const PROD_PYTHON = 'https://docquest-python-l5mby46qbq-el.a.run.app';
const LOCAL_EXPRESS = 'http://localhost:3000';
const LOCAL_PYTHON = 'http://localhost:8000';

export function getApiMode(): ApiMode | null {
  try {
    const stored = localStorage.getItem(MODE_KEY);
    if (stored === 'prod' || stored === 'local') {
      return stored;
    }
  } catch {
    return null;
  }
  return null;
}

export function setApiMode(mode: ApiMode): void {
  try {
    localStorage.setItem(MODE_KEY, mode);
  } catch {
    // Ignore storage failures in restricted environments.
  }
}

export function getExpressBase(): string {
  const env = process.env.REACT_APP_API_BASE_URL;
  if (env) return env;
  return getApiMode() === 'local' ? LOCAL_EXPRESS : PROD_EXPRESS;
}

export function getPythonBase(): string {
  const env = process.env.REACT_APP_PYTHON_API_BASE_URL;
  if (env) return env;
  return getApiMode() === 'local' ? LOCAL_PYTHON : PROD_PYTHON;
}

export function getModeLabel(): string {
  const mode = getApiMode();
  return mode === 'local' ? 'Local' : 'Production';
}
