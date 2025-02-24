export const routes = {
  // Public routes
  home: '/',
  about: '/about',

  // Auth routes
  login: '/auth/login',
  signup: '/auth/signup',
  forgotPassword: '/auth/forgot-password',

  // Protected routes
  dashboard: '/dashboard',
  profile: '/dashboard/profile',
  projects: '/dashboard/projects',
  search: '/dashboard/search',
  savedSearches: '/dashboard/saved-searches',

  // API routes
  api: {
    auth: {
      login: '/api/auth/login',
      signup: '/api/auth/signup',
      logout: '/api/auth/logout',
      refresh: '/api/auth/refresh-token',
    },
    users: {
      profile: '/api/users/profile',
    },
    search: {
      exec: '/api/search',
      saved: '/api/saved-searches',
    },
  },
} as const;

type RouteValue = typeof routes;
type PublicPaths = RouteValue['home'] | RouteValue['about'] | RouteValue['login'] | RouteValue['signup'] | RouteValue['forgotPassword'];
type AuthPaths = RouteValue['login'] | RouteValue['signup'] | RouteValue['forgotPassword'];
type ProtectedPaths = RouteValue['dashboard'] | RouteValue['profile'] | RouteValue['projects'] | RouteValue['search'] | RouteValue['savedSearches'];

// Helper to check if a route is public
export function isPublicRoute(path: string): path is PublicPaths {
  const publicPaths: readonly string[] = [
    routes.home,
    routes.about,
    routes.login,
    routes.signup,
    routes.forgotPassword,
  ];
  return publicPaths.includes(path);
}

// Helper to check if a route is an auth route
export function isAuthRoute(path: string): path is AuthPaths {
  const authPaths: readonly string[] = [
    routes.login,
    routes.signup,
    routes.forgotPassword,
  ];
  return authPaths.includes(path);
}

// Helper to check if a route is protected
export function isProtectedRoute(path: string): path is ProtectedPaths {
  const protectedPaths: readonly string[] = [
    routes.dashboard,
    routes.profile,
    routes.projects,
    routes.search,
    routes.savedSearches,
  ];
  return protectedPaths.includes(path);
}