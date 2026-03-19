const PROD_EXPRESS = 'https://docquest-express-63254362392.asia-south1.run.app'
const PROD_PYTHON = 'https://docquest-python-63254362392.asia-south1.run.app'

export function getExpressBase(): string {
  const env = process.env.REACT_APP_API_BASE_URL
  if (env) return env
  return PROD_EXPRESS
}

export function getPythonBase(): string {
  const env = process.env.REACT_APP_PYTHON_API_BASE_URL
  if (env) return env
  return PROD_PYTHON
}
