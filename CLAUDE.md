# ThinkLeap Development Guide

## Commands
### Frontend
- `npm run dev`: Start Next.js dev server
- `npm run build`: Build Next.js app
- `npm run lint`: Run ESLint
- Run tests: `npx cypress run` (all) or `npx cypress run --spec "cypress/e2e/auth.cy.ts"` (specific)

### Backend
- `npm run dev`: Start dev server with hot reload
- `npm run build`: Build TypeScript

### Shared
- `npm run build`: Build TypeScript
- `npm run test`: Run Jest tests

## Code Style
- **Naming**: PascalCase for components/interfaces/types, camelCase for variables/functions
- **Files**: PascalCase for components, kebab-case for services/controllers
- **Imports**: Use absolute imports with aliases (`@/components`)
- **Types**: Strong typing required, avoid `any` type
- **Error Handling**: Use custom error classes, centralized error handling middleware
- **Structure**: Follow existing patterns for controllers/services/routes
- **Formatting**: Follow existing indentation and bracket style