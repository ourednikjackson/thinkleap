// src/app/auth/login/page.tsx
import { LoginForm } from '@/components/auth/LoginForm';
import Link from 'next/link';

export default function LoginPage() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-4">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold">Sign in to ThinkLeap</h1>
          <p className="mt-2 text-gray-600">
            Start exploring academic research
          </p>
        </div>

        <LoginForm />

        <div className="text-center text-sm">
          <span className="text-gray-600">
            Don't have an account?{' '}
            <Link 
              href="/auth/signup" 
              className="text-blue-600 hover:text-blue-700"
            >
              Sign up
            </Link>
          </span>
        </div>

        <div className="text-center text-sm">
          <Link 
            href="/auth/forgot-password" 
            className="text-blue-600 hover:text-blue-700"
          >
            Forgot your password?
          </Link>
        </div>
      </div>
    </main>
  );
}