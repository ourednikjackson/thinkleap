'use client';
import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';

export default function ProjectsPage() {
  const [loading, setLoading] = useState(false);

  return (
    <div className="container mx-auto py-6 space-y-6">
      <h1 className="text-2xl font-bold">Projects</h1>
      
      <Card className="p-6">
        <p className="text-gray-500">Project management features coming soon...</p>
      </Card>
    </div>
  );
}