import { ReactNode } from 'react';
import { AuthProvider } from '@/lib/auth';
import { PreferencesProvider } from '@/lib/preferences/PreferencesContext';
import { MainNav } from '@/components/layout/MainNav';
import { Toaster } from "@/components/ui/sonner";
import './globals.css';

export const metadata = {
  title: 'ThinkLeap',
  description: 'Research paper analysis platform',
};

interface RootLayoutProps {
  children: ReactNode;
}

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>
          <PreferencesProvider>
            <div className="min-h-screen flex flex-col">
              <MainNav />
              <div className="flex-1">
                {children}
              </div>
            </div>
            <Toaster />
          </PreferencesProvider>
        </AuthProvider>
      </body>
    </html>
  );
}