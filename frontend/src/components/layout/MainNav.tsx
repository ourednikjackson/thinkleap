// src/components/layout/MainNav.tsx
import Link from 'next/link';
import { useAuth } from '@/lib/auth';
import { routes } from '@/config/routes';

export function MainNav() {
  const { user, logout } = useAuth();

  return (
    <nav className="border-b">
      <div className="flex h-16 items-center px-4 max-w-7xl mx-auto">
        <div className="flex items-center space-x-4">
          <Link 
            href={routes.home}
            className="text-xl font-bold"
          >
            ThinkLeap
          </Link>
        </div>

        <div className="ml-auto flex items-center space-x-4">
          {!user ? (
            <>
              <Link 
                href={routes.login}
                className="text-sm"
              >
                Sign in
              </Link>
              <Link 
                href={routes.signup}
                className="text-sm bg-black text-white px-4 py-2 rounded-md"
              >
                Get Started
              </Link>
            </>
          ) : (
            <>
              <Link 
                href={routes.dashboard}
                className="text-sm"
              >
                Dashboard
              </Link>
              <Link 
                href={routes.profile}
                className="text-sm"
              >
                Profile
              </Link>
              <button
                onClick={() => logout()}
                className="text-sm text-red-600"
              >
                Sign out
              </button>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}