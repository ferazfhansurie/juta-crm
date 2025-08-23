// Backend API Configuration
export const BACKEND_CONFIG = {
  // Development
  development: {
    baseUrl: 'https://juta-dev.ngrok.dev',
    apiUrl: 'https://juta-dev.ngrok.dev/api'
  },
  // Production - replace with your actual Neon backend URL
  production: {
    baseUrl: 'https://juta-dev.ngrok.dev',
    apiUrl: 'https://juta-dev.ngrok.dev/api'
  }
};

// Get current environment
const isDevelopment = process.env.NODE_ENV === 'development' || !process.env.NODE_ENV;

// Export current config
export const BACKEND_URL = isDevelopment ? BACKEND_CONFIG.development : BACKEND_CONFIG.production;

// API endpoints
export const API_ENDPOINTS = {
  login: `${BACKEND_URL.apiUrl}/login`,
  forgotPassword: `${BACKEND_URL.apiUrl}/forgot-password`,
  resetPassword: `${BACKEND_URL.apiUrl}/reset-password`,
  userData: `${BACKEND_URL.apiUrl}/user-data`,
  userCompanyData: `${BACKEND_URL.apiUrl}/user-company-data`,
  companies: `${BACKEND_URL.apiUrl}/companies`,
  uploadFile: `${BACKEND_URL.apiUrl}/upload-file`,
  assistantFiles: `${BACKEND_URL.apiUrl}/assistant-files`,
  health: `${BACKEND_URL.apiUrl}/health`
};
