import { defineConfig } from 'cypress';

export default defineConfig({
  e2e: {
    baseUrl: 'http://localhost:3000',
    setupNodeEvents(on, config) {
      // implement node event listeners here
    },
  },
  env: {
    // Fallback values in case cypress.env.json is missing
    TEST_USER_EMAIL: 'test@example.com',
    TEST_USER_PASSWORD: 'password123',
    API_URL: 'http://localhost:3001'
  },
  viewportHeight: 800,
  viewportWidth: 1280
});