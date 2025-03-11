// Type definitions for next-auth
// Stub file to fix TypeScript errors

import 'next-auth'
import { JWT } from 'next-auth/jwt'

declare module 'next-auth' {
  interface Session {
    user: {
      id: string
      name?: string | null
      email?: string | null
      image?: string | null
      role?: string
    }
  }

  interface User {
    id: string
    name?: string | null
    email?: string | null
    image?: string | null
    role?: string
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id?: string
    name?: string | null
    email?: string | null
    picture?: string | null
    role?: string
  }
}
