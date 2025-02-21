// src/config/routes.ts
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
    },
  } as const;
  
  type RouteValue = typeof routes;
  type PublicPaths = RouteValue['home'] | RouteValue['about'] | RouteValue['login'] | RouteValue['signup'] | RouteValue['forgotPassword'];
  type AuthPaths = RouteValue['login'] | RouteValue['signup'] | RouteValue['forgotPassword'];
  
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