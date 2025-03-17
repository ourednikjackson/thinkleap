'use client';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { SaveIcon } from 'lucide-react';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useUser, SignedIn } from '@clerk/nextjs';

interface SaveSearchButtonProps {
  query: string;
  filters: Record<string, any>;
}

export function SaveSearchButton({ query, filters }: SaveSearchButtonProps) {
  const { user } = useUser();
  const [isOpen, setIsOpen] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    if (!user) {
      setError('You must be signed in to save searches');
      return;
    }

    try {
      setIsSaving(true);
      setError(null);
  
      const response = await fetch('/api/saved-searches', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name,
          description,
          query,
          filters,
          userId: user.id,
        }),
      });
  
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to save search');
      }
  
      await response.json();
  
      toast.success("Search Saved", {
        description: "Your search has been saved successfully."
      });
  
      setIsOpen(false);
      setName('');
      setDescription('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save search');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <SaveIcon className="h-4 w-4 mr-2" />
          Save Search
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Save Search</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter a name for this search"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Description (optional)</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Add a description"
            />
          </div>
          <Button
            onClick={handleSave}
            disabled={!name.trim() || isSaving}
            className="w-full"
          >
            {isSaving ? 'Saving...' : 'Save Search'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}