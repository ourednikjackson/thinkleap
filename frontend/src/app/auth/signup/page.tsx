// src/app/auth/signup/page.tsx
import { SignupForm } from '@/components/auth/SignupForm';
import Link from 'next/link';

export default function SignupPage() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-4">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold">Create your account</h1>
          <p className="mt-2 text-gray-600">
            Join ThinkLeap to start your research journey
          </p>
        </div>

        <SignupForm />

        <div className="text-center text-sm">
          <span className="text-gray-600">
            Already have an account?{' '}
            <Link 
              href="/auth/login" 
              className="text-blue-600 hover:text-blue-700"
            >
              Sign in
            </Link>
          </span>
        </div>
      </div>
    </main>
  );
}