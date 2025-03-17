"use client";

import Link from 'next/link';
import { UserButton, SignedIn, SignedOut, SignInButton } from '@clerk/nextjs';
import { routes } from '@/config/routes';
import { Search, BookmarkIcon } from 'lucide-react';

export function MainNav() {
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
          <SignedIn>
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
          </SignedIn>
        </div>
        <div className="ml-auto flex items-center space-x-4">
          <SignedIn>
            <Link
              href={routes.dashboard}
              className="text-sm hover:text-primary transition-colors"
            >
              Dashboard
            </Link>
            <Link
              href={routes.profile}
              className="text-sm hover:text-primary transition-colors"
            >
              Profile
            </Link>
            <UserButton
              afterSignOutUrl="/"
              appearance={{
                elements: {
                  avatarBox: "w-8 h-8",
                  userButtonTrigger: "hover:opacity-80 transition-opacity"
                }
              }}
            />
          </SignedIn>
          <SignedOut>
            <SignInButton mode="modal">
              <button className="text-sm hover:text-primary transition-colors">
                Sign in
              </button>
            </SignInButton>
            <Link
              href="/sign-up"
              className="text-sm bg-primary text-primary-foreground px-4 py-2 rounded-md hover:bg-primary/90 transition-colors"
            >
              Get Started
            </Link>
          </SignedOut>
        </div>
      </div>
    </nav>
  );
}