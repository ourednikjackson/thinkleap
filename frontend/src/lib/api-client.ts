import { useAuth } from '@clerk/nextjs';

interface ApiClientOptions {
  method?: string;
  body?: any;
  headers?: Record<string, string>;
}

export function useApiClient() {
  const { getToken } = useAuth();

  return async function request(endpoint: string, options: ApiClientOptions = {}) {
    const token = await getToken();

  const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}${endpoint}`, {
    method: options.method || 'GET',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...options.headers,
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message || 'API request failed');
  }

    return response.json();
  };
}
