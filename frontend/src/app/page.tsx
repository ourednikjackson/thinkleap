// src/app/page.tsx
import Link from 'next/link';
import { routes } from '@/config/routes';

export default function HomePage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-4rem)] p-4">
      <div className="max-w-2xl text-center space-y-6">
        <h1 className="text-4xl font-bold sm:text-6xl">
          Welcome to ThinkLeap
        </h1>
        <p className="text-xl text-gray-600">
          Your research paper analysis platform
        </p>
        <div className="flex justify-center gap-4">
          <Link
            href={routes.signup}
            className="bg-black text-white px-6 py-3 rounded-md text-lg"
          >
            Get Started
          </Link>
          <Link
            href={routes.login}
            className="bg-gray-100 px-6 py-3 rounded-md text-lg"
          >
            Sign in
          </Link>
        </div>
      </div>
    </div>
  );
}