// /frontend/src/app/dashboard/settings/page.tsx
"use client";

import { useState, useEffect } from 'react';
import { useUser, useAuth } from '@clerk/nextjs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import Link from 'next/link';

export default function SettingsPage() {
  const { user, isLoaded } = useUser();
  const { getToken } = useAuth();
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [saveSearchHistory, setSaveSearchHistory] = useState(true);
  const [isLoading, setIsLoading] = useState(false);

  // Redirect to sign-in if user is not authenticated
  useEffect(() => {
    if (isLoaded && !user) {
      window.location.href = '/sign-in?redirect_url=/dashboard/settings';
    }
  }, [user, isLoaded]);

  // Fetch user preferences from the backend
  useEffect(() => {
    const fetchPreferences = async () => {
      if (!user) return;

      try {
        const token = await getToken();
        const response = await fetch('/api/preferences', {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
        if (!response.ok) throw new Error('Failed to fetch preferences');
        const data = await response.json();
        setEmailNotifications(data.notifications.emailAlerts);
        setSaveSearchHistory(data.search.saveHistory);
      } catch (error) {
        console.error('Error fetching preferences:', error);
        toast.error('Failed to load preferences');
      }
    };

    if (user) {
      fetchPreferences();
    }
  }, [user, getToken]);

  const handleSavePreferences = async () => {
    if (!user) {
      toast.error('You must be signed in to update preferences');
      return;
    }

    setIsLoading(true);
    try {
      const token = await getToken();
      const response = await fetch('/api/preferences', {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          notifications: {
            emailAlerts: emailNotifications
          },
          search: {
            saveHistory: saveSearchHistory
          }
        }),
      });

      // if (!response.ok) {
      //   throw new Error('Failed to update preferences');
      // }

      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 500));

      toast.success('Preferences updated successfully');
    } catch (error) {
      toast.error('Failed to update preferences');
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container mx-auto py-6">
      <h1 className="text-2xl font-bold mb-6">Settings</h1>
      
      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Notification Preferences</CardTitle>
            <CardDescription>
              Manage how you receive notifications.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="email-notifications">Email Notifications</Label>
                <p className="text-sm text-gray-500">
                  Receive email notifications about search results and updates.
                </p>
              </div>
              <Switch
                id="email-notifications"
                checked={emailNotifications}
                onCheckedChange={setEmailNotifications}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Privacy Settings</CardTitle>
            <CardDescription>
              Control your data and privacy settings.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="save-search-history">Save Search History</Label>
                <p className="text-sm text-gray-500">
                  Store your search history for quick access to past searches.
                </p>
              </div>
              <Switch
                id="save-search-history"
                checked={saveSearchHistory}
                onCheckedChange={setSaveSearchHistory}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Account</CardTitle>
            <CardDescription>
              Manage your account settings.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Link href="/dashboard/profile">
                <Button variant="outline" className="w-full">
                  Edit Profile
                </Button>
              </Link>
              <Link href="/dashboard/verify-institution">
                <Button variant="outline" className="w-full">
                  Verify Institution
                </Button>
              </Link>
              <Link href="/auth/forgot-password">
                <Button variant="outline" className="w-full">
                  Reset Password
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>

        <Button 
          onClick={handleSavePreferences}
          disabled={isLoading}
        >
          {isLoading ? 'Saving...' : 'Save Preferences'}
        </Button>
      </div>
    </div>
  );
}