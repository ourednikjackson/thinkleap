// Type definitions for next-auth
// Project: https://next-auth.js.org/
// Stub file to fix TypeScript errors

declare module 'next-auth' {
  export interface Session {
    user: {
      id: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
      role?: string;
    };
  }

  export interface User {
    id: string;
    name?: string | null;
    email?: string | null;
    image?: string | null;
    role?: string;
  }

  export type NextAuthOptions = {
    providers: any[];
    session?: any;
    callbacks?: any;
    pages?: any;
    debug?: boolean;
  };

  export function getServerSession(...args: any[]): Promise<Session | null>;
}
