export const config = {
  apiBaseUrl: import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000',
  apiTimeout: Number(import.meta.env.VITE_API_TIMEOUT) || 30000,
  appVersion: import.meta.env.VITE_APP_VERSION || '1.0.0',
  appName: import.meta.env.VITE_APP_NAME || 'SOUSEI Admin',
  isDevelopment: import.meta.env.DEV,
  isProduction: import.meta.env.PROD,
  debug: import.meta.env.VITE_DEBUG === 'true',
} 
