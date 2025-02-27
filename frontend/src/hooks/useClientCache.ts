import { useState, useEffect } from 'react';

interface CacheOptions {
  ttl?: number; // Time to live in milliseconds
  revalidateOnFocus?: boolean;
}

export function useClientCache<T>(
  key: string,
  fetchFn: () => Promise<T>,
  options: CacheOptions = {}
): [T | null, boolean, Error | null, () => Promise<void>] {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);
  
  async function fetchData(force = false) {
    setLoading(true);
    setError(null);
    
    try {
      // Try to get from local storage if not forcing refresh
      if (!force) {
        const cached = localStorage.getItem(key);
        
        if (cached) {
          const { value, expires } = JSON.parse(cached);
          
          // If not expired, use cached data
          if (!expires || expires > Date.now()) {
            setData(value);
            setLoading(false);
            return;
          }
        }
      }
      
      // Fetch fresh data
      const result = await fetchFn();
      
      // Cache the result
      const ttl = options.ttl || 5 * 60 * 1000; // Default 5 minutes
      localStorage.setItem(
        key,
        JSON.stringify({
          value: result,
          expires: ttl ? Date.now() + ttl : null
        })
      );
      
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('An unknown error occurred'));
    } finally {
      setLoading(false);
    }
  }
  
  useEffect(() => {
    fetchData();
    
    // Revalidate on window focus if enabled
    if (options.revalidateOnFocus) {
      const handleFocus = () => fetchData();
      window.addEventListener('focus', handleFocus);
      return () => window.removeEventListener('focus', handleFocus);
    }
  }, [key]);
  
  // Return data, loading state, error, and refetch function
  return [data, loading, error, () => fetchData(true)];
}