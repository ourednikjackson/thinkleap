'use client';
import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { usePreferences } from '@/lib/preferences/PreferencesContext';

export default function PreferencesPage() {
  const { preferences, updatePreference, resetPreferences, isLoading } = usePreferences();
  const [isResetting, setIsResetting] = useState(false);

  if (isLoading) {
    return <div>Loading preferences...</div>;
  }

  const handleReset = async () => {
    try {
      setIsResetting(true);
      await resetPreferences();
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Preferences</h1>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="outline">Reset to Defaults</Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Reset Preferences</AlertDialogTitle>
              <AlertDialogDescription>
                This will reset all your preferences to their default values. This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleReset} disabled={isResetting}>
                {isResetting ? 'Resetting...' : 'Reset'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>

      <Card className="p-6">
        <h2 className="text-lg font-semibold mb-4">Search Preferences</h2>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Results Per Page</Label>
            <Select
              value={preferences.search.resultsPerPage.toString()}
              onValueChange={(value) => 
                updatePreference(['search', 'resultsPerPage'], parseInt(value))
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[10, 20, 50, 100].map((number) => (
                  <SelectItem key={number} value={number.toString()}>
                    {number} results
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Default Sort Order</Label>
            <Select
              value={preferences.search.defaultSortOrder}
              onValueChange={(value) => 
                updatePreference(['search', 'defaultSortOrder'], value)
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="relevance">Relevance</SelectItem>
                <SelectItem value="date">Date</SelectItem>
                <SelectItem value="citations">Citations</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </Card>

      <Card className="p-6">
        <h2 className="text-lg font-semibold mb-4">Display Preferences</h2>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Theme</Label>
            <Select
              value={preferences.display.theme}
              onValueChange={(value) => 
                updatePreference(['display', 'theme'], value)
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="light">Light</SelectItem>
                <SelectItem value="dark">Dark</SelectItem>
                <SelectItem value="system">System</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Density</Label>
            <Select
              value={preferences.display.density}
              onValueChange={(value) => 
                updatePreference(['display', 'density'], value)
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="comfortable">Comfortable</SelectItem>
                <SelectItem value="compact">Compact</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </Card>

      <Card className="p-6">
        <h2 className="text-lg font-semibold mb-4">Notification Preferences</h2>
        <div className="space-y-4">
          {Object.entries(preferences.notifications).map(([key, value]) => (
            <div key={key} className="flex items-center justify-between">
              <Label htmlFor={key} className="cursor-pointer">
                {key.split(/(?=[A-Z])/).join(' ')}
              </Label>
              <Switch
                id={key}
                checked={value}
                onCheckedChange={(checked) =>
                  updatePreference(['notifications', key], checked)
                }
              />
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}