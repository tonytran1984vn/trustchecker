import { cookies } from 'next/headers';

type FetchOptions = RequestInit & {
  params?: Record<string, string>;
};

export class ApiError extends Error {
  status: number;
  data: any;

  constructor(status: number, message: string, data?: any) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
  }
}

/**
 * serverApi: A secure wrapper for React Server Components (RSC) to make backend API calls.
 * Automatically handles cookie extraction and forwarding.
 */
export const serverApi = {
  get: (endpoint: string, options?: FetchOptions) => request(endpoint, { ...options, method: 'GET' }),
  post: (endpoint: string, data?: any, options?: FetchOptions) =>
    request(endpoint, {
      ...options,
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    }),
  put: (endpoint: string, data?: any, options?: FetchOptions) =>
    request(endpoint, {
      ...options,
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    }),
  delete: (endpoint: string, options?: FetchOptions) => request(endpoint, { ...options, method: 'DELETE' }),
};

async function request(endpoint: string, options: FetchOptions = {}) {
  const backendUrl = process.env.API_URL || 'http://localhost:4000/api';
  
  // Extract token from Next.js cookies (Server Side)
  const cookieStore = await cookies();
  const token = cookieStore.get('tc_token')?.value || cookieStore.get('token')?.value;

  const headers = new Headers(options.headers);
  headers.set('Content-Type', 'application/json');
  if (token) {
    headers.set('Cookie', `tc_token=${token}`);
    // Optional fallback header
    headers.set('Authorization', `Bearer ${token}`);
  }

  // Handle Query Params
  let url = `${backendUrl}${endpoint}`;
  if (options.params) {
    const searchParams = new URLSearchParams(options.params);
    url += `?${searchParams.toString()}`;
  }

  try {
    const res = await fetch(url, {
      ...options,
      headers,
      // Always prevent caching for secure data by default unless overridden
      cache: options.cache || 'no-store',
    });

    // Extract JSON Safely
    let data;
    const contentType = res.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      data = await res.json();
    } else {
      data = await res.text();
    }

    if (!res.ok) {
      // Normalize error message
      const errorMsg = data?.error || res.statusText || 'Unknown Backend Error';
      throw new ApiError(res.status, errorMsg, data);
    }

    return data;
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    // Handle network errors (e.g., connection refused)
    throw new ApiError(500, error instanceof Error ? error.message : 'Network Error');
  }
}
