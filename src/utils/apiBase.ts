const PROD_EXPRESS = 'https://docquest-express-l5mby46qbq-el.a.run.app';
const PROD_PYTHON = 'https://docquest-python-l5mby46qbq-el.a.run.app';

export function getExpressBase(): string {
  const env = process.env.REACT_APP_API_BASE_URL;
  if (env) return env;
  return PROD_EXPRESS;
}

export function getPythonBase(): string {
  const env = process.env.REACT_APP_PYTHON_API_BASE_URL;
  if (env) return env;
  return PROD_PYTHON;
}
