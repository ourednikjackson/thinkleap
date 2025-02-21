// src/app/dashboard/layout.tsx
import { ReactNode } from 'react';
import Link from 'next/link';
import { routes } from '@/config/routes';

interface DashboardLayoutProps {
  children: ReactNode;
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  return (
    <div className="flex min-h-screen">
      {/* Sidebar */}
      <aside className="w-64 border-r bg-gray-50">
        <div className="flex flex-col h-full p-4">
          <nav className="space-y-2">
            <Link 
              href={routes.dashboard}
              className="block p-2 rounded-md hover:bg-gray-100"
            >
              Overview
            </Link>
            <Link 
              href={routes.projects}
              className="block p-2 rounded-md hover:bg-gray-100"
            >
              Projects
            </Link>
            <Link 
              href={routes.profile}
              className="block p-2 rounded-md hover:bg-gray-100"
            >
              Settings
            </Link>
          </nav>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 p-8">
        {children}
      </main>
    </div>
  );
}