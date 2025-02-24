import Link from 'next/link';
import { useAuth } from '@/lib/auth';
import { routes } from '@/config/routes';
import { Search, BookmarkIcon } from 'lucide-react';

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
          {user && (
            <div className="ml-6 flex items-center space-x-4">
              <Link
                href={routes.search}
                className="text-sm flex items-center"
              >
                <Search className="mr-2 h-4 w-4" />
                Search
              </Link>
              <Link
                href="/saved-searches"
                className="text-sm flex items-center"
              >
                <BookmarkIcon className="mr-2 h-4 w-4" />
                Saved Searches
              </Link>
            </div>
          )}
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