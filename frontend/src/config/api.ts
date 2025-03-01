// frontend/src/config/api.ts
export const API_ENDPOINTS = {
    // Auth endpoints
    AUTH: {
      BASE: '/api/auth',
      LOGIN: '/api/auth/login',
      SIGNUP: '/api/auth/signup',
      REFRESH: '/api/auth/refresh-token',
      LOGOUT: '/api/auth/logout',
      FORGOT_PASSWORD: '/api/auth/forgot-password',
      RESET_PASSWORD: '/api/auth/reset-password',
    },
    
    // User endpoints
    USER: {
      BASE: '/api/users',
      PROFILE: '/api/users/profile',
      ACCOUNT: '/api/users/account',
      ACTIVITY: '/api/users/activity',
      INSTITUTION: {
        VERIFY_REQUEST: '/api/users/institution/verify-request',
        VERIFY_CODE: '/api/users/institution/verify-code',
        STATUS: '/api/users/institution/status',
      },
    },
    
    // Search endpoints
    SEARCH: {
      BASE: '/api/search',
      EXECUTE: '/api/search',
    },
    
    // Saved searches endpoints
    SAVED_SEARCHES: {
      BASE: '/api/saved-searches',
      GET_ALL: '/api/saved-searches',
      EXECUTE: (id: string) => `/api/saved-searches/${id}/execute`,
      DELETE: (id: string) => `/api/saved-searches/${id}`,
    },
    
    // Preferences endpoints
    PREFERENCES: {
      BASE: '/api/preferences',
      GET: '/api/preferences',
      UPDATE: '/api/preferences',
      RESET: '/api/preferences/reset',
    },
  };