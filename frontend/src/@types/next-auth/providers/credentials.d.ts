// Type definitions for next-auth/providers/credentials
// Stub file to fix TypeScript errors

declare module 'next-auth/providers/credentials' {
  interface CredentialsConfig {
    name?: string;
    credentials?: Record<string, {
      label?: string;
      type?: string;
      placeholder?: string;
    }>;
    authorize: (credentials: Record<string, string> | undefined) => Promise<any | null>;
  }

  export default function Credentials(config: CredentialsConfig): any;
}
