// Type definitions for next-auth/jwt
// Stub file to fix TypeScript errors

declare module 'next-auth/jwt' {
  export interface JWT {
    id?: string;
    name?: string | null;
    email?: string | null;
    picture?: string | null;
    role?: string;
  }
}
