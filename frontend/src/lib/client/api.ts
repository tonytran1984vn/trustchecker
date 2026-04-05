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
 * clientApi: A secure wrapper for React Client Components to make frontend-proxied API calls.
 * Uses Next.js API rewrites (`/trustchecker/api/*` -> `http://localhost:4000/api/*`).
 * Browsers automatically forward the `tc_token` cookie based on standard credentials policy.
 */
export const clientApi = {
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
  // Client makes requests to the relative proxy path
  // Since trustchecker frontend lives under /trustchecker path on reverse proxy,
  // we hit `/trustchecker/api` instead of `http://backend/...`
  const baseUrl = '/trustchecker/api';

  const headers = new Headers(options.headers);
  headers.set('Content-Type', 'application/json');

  // Handle Query Params
  let url = `${baseUrl}${endpoint}`;
  if (options.params) {
    const searchParams = new URLSearchParams(options.params);
    url += `?${searchParams.toString()}`;
  }

  try {
    const res = await fetch(url, {
      ...options,
      headers,
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
    // Handle network errors
    throw new ApiError(500, error instanceof Error ? error.message : 'Network Error');
  }
}
