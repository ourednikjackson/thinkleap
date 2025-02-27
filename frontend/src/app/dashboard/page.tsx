// frontend/src/app/dashboard/page.tsx
"use client";

import { useAuth } from '@/lib/auth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { routes } from '@/config/routes';
import Link from 'next/link';
import { SearchIcon, BookmarkIcon, UserIcon, Settings2Icon } from 'lucide-react';

export default function DashboardPage() {
  const { user } = useAuth();

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Dashboard</h1>
      </div>

      {/* Welcome Card */}
      <Card>
        <CardHeader>
          <CardTitle>Welcome{user?.fullName ? `, ${user.fullName}` : ''}!</CardTitle>
          <CardDescription>
            Access your ThinkLeap tools and resources
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            Get started by searching academic papers, managing your saved searches, or updating your profile.
          </p>
        </CardContent>
      </Card>

      {/* Quick Access Cards */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        <DashboardCard
          title="Search"
          description="Search academic databases and find relevant papers"
          icon={<SearchIcon className="h-6 w-6" />}
          href={routes.search}
        />
        <DashboardCard
          title="Saved Searches"
          description="Access and manage your saved searches"
          icon={<BookmarkIcon className="h-6 w-6" />}
          href={routes.savedSearches}
        />
        <DashboardCard
          title="Profile"
          description="View and update your profile information"
          icon={<UserIcon className="h-6 w-6" />}
          href={routes.profile}
        />
        <DashboardCard
          title="Settings"
          description="Configure your preferences and settings"
          icon={<Settings2Icon className="h-6 w-6" />}
          href="/dashboard/settings"
        />
        
        {/* If user is not verified, show verification card */}
        {user && !user.emailVerified && (
          <DashboardCard
            title="Verify Institution"
            description="Verify your institution to access additional features"
            icon={<UserIcon className="h-6 w-6" />}
            href="/dashboard/verify-institution"
            highlight
          />
        )}
      </div>
    </div>
  );
}

// Reusable card component for dashboard links
function DashboardCard({ 
  title, 
  description, 
  icon, 
  href,
  highlight = false
}: { 
  title: string; 
  description: string; 
  icon: React.ReactNode; 
  href: string;
  highlight?: boolean;
}) {
  return (
    <Link href={href}>
      <Card className={`h-full transition-all hover:shadow-md ${highlight ? 'border-primary' : ''}`}>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-lg font-medium">{title}</CardTitle>
          {icon}
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">{description}</p>
        </CardContent>
      </Card>
    </Link>
  );
}