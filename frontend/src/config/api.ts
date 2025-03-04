// API configuration
export const api = {
  // Base URL for backend API
  baseUrl: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000',
  
  // External APIs
  pubmed: {
    // PubMed E-utilities API
    baseUrl: 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils',
    key: process.env.PUBMED_API_KEY,
    
    // PubMed E-utilities endpoints
    endpoints: {
      search: '/esearch.fcgi',
      summary: '/esummary.fcgi',
      fetch: '/efetch.fcgi'
    },
    
    // Default parameters
    defaults: {
      db: 'pubmed',
      retmode: 'json',
      sort: 'relevance',
      usehistory: 'y'
    },
    
    // Rate limits
    rateLimits: {
      withKey: 10, // 10 requests/second with API key
      withoutKey: 3 // 3 requests/second without API key
    }
  }
};

// API endpoints for the application
export const API_ENDPOINTS = {
  AUTH: {
    LOGIN: '/auth/login',
    SIGNUP: '/auth/signup',
    LOGOUT: '/auth/logout',
    REFRESH: '/auth/refresh',
    FORGOT_PASSWORD: '/auth/forgot-password',
    RESET_PASSWORD: '/auth/reset-password'
  },
  USER: {
    PROFILE: '/user/profile',
    UPDATE: '/user/update'
  },
  SEARCH: {
    QUERY: '/search',
    SAVE: '/saved-searches',
    GET_SAVED: '/saved-searches',
    EXECUTE_SAVED: '/saved-searches/execute'
  },
  PREFERENCES: {
    GET: '/preferences',
    UPDATE: '/preferences',
    RESET: '/preferences/reset'
  }
};