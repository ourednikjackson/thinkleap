'use client';
import { useEffect, useState, useCallback } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';
import { toast } from 'sonner';
import { PlayIcon, PencilIcon, TrashIcon, CalendarIcon, HashIcon } from 'lucide-react';
import { SavedSearch } from '@thinkleap/shared/types/saved-search';

interface SavedSearchesListProps {
  sortBy: string;
}

export function SavedSearchesList({ sortBy }: SavedSearchesListProps) {
  const router = useRouter();
  const [searches, setSearches] = useState<SavedSearch[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [itemsPerPage] = useState(10);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchSearches = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch(
        `/api/saved-searches?page=${page}&limit=${itemsPerPage}&sortBy=${sortBy}`
      );
      
      if (!response.ok) {
        throw new Error('Failed to fetch saved searches');
      }
      
      const data = await response.json();
      setSearches(data.data);
      setTotalPages(Math.ceil(data.pagination.total / itemsPerPage));
    } catch (err) {
      toast.error('Failed to fetch saved searches');
    } finally {
      setLoading(false);
    }
  }, [page, sortBy, itemsPerPage]);

  useEffect(() => {
    fetchSearches();
  }, [page, sortBy, fetchSearches]);

  

  const executeSearch = async (id: string) => {
    try {
      setActionLoading(`execute-${id}`);
      const response = await fetch(`/api/saved-searches/${id}/execute`, {
        method: 'POST',
      });
      
      if (!response.ok) {
        throw new Error('Failed to execute search');
      }
      
      const data = await response.json();
      
      // Only navigate after successful response
      router.push(`/dashboard/search?q=${encodeURIComponent(data.data.query)}`);
      toast.success('Search executed successfully');
    } catch (err) {
      toast.error('Failed to execute search');
    } finally {
      setActionLoading(null);
    }
  };
  
  const deleteSearch = async (id: string) => {
    try {
      setActionLoading(`delete-${id}`);
      const response = await fetch(`/api/saved-searches/${id}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        throw new Error('Failed to delete search');
      }
      
      // Refresh the list only after successful deletion
      await fetchSearches();
      toast.success('Search deleted successfully');
    } catch (err) {
      toast.error('Failed to delete search');
    } finally {
      setActionLoading(null);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <Card key={i} className="p-6 animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-1/4 mb-4" />
            <div className="h-3 bg-gray-200 rounded w-1/2" />
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {!searches || searches.length === 0 ? (
        <Card className="p-6 text-center text-gray-500">
          No saved searches yet
        </Card>
      ) : (
        <>
          <div className="space-y-4">
            {searches.map((search) => (
              <Card key={search.id} className="p-6">
                <div className="flex items-start justify-between">
                  <div className="space-y-2">
                    <h3 className="font-medium">{search.name}</h3>
                    {search.description && (
                      <p className="text-sm text-gray-500">{search.description}</p>
                    )}
                    <div className="flex items-center gap-4 text-sm text-gray-500">
                      <span className="flex items-center gap-1">
                        <CalendarIcon className="h-4 w-4" />
                        Last executed: {search.lastExecutedAt 
                          ? new Date(search.lastExecutedAt).toLocaleDateString() 
                          : 'Never'}
                      </span>
                      <span className="flex items-center gap-1">
                        <HashIcon className="h-4 w-4" />
                        Used {search.executionCount} times
                      </span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => executeSearch(search.id)}
                    >
                      <PlayIcon className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => deleteSearch(search.id)}
                    >
                      <TrashIcon className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
          
          <Pagination>
  <PaginationContent>
    <PaginationItem>
      <Button
        onClick={() => setPage(p => Math.max(1, p - 1))}
        disabled={page === 1}
        variant="outline"
        size="sm"
      >
        <ChevronLeft className="h-4 w-4" />
        Previous
      </Button>
    </PaginationItem>
    
    {[...Array(totalPages)].map((_, i) => (
      <PaginationItem key={i + 1}>
        <Button
          onClick={() => setPage(i + 1)}
          variant={page === i + 1 ? "default" : "outline"}
          size="sm"
        >
          {i + 1}
        </Button>
      </PaginationItem>
    ))}
    
    <PaginationItem>
      <Button
        onClick={() => setPage(p => Math.min(totalPages, p + 1))}
        disabled={page === totalPages}
        variant="outline"
        size="sm"
      >
        Next
        <ChevronRight className="h-4 w-4" />
      </Button>
    </PaginationItem>
  </PaginationContent>
</Pagination>
        </>
      )}
    </div>
  );
}