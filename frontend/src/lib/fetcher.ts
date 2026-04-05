const basePath = process.env.NEXT_PUBLIC_BASE_PATH || '';

export async function fetcher(url: string, options?: RequestInit) {
  // Prefix basePath for relative API calls
  const prefixedUrl = url.startsWith('/') ? `${basePath}${url}` : url;

  const headers: any = {
    "Content-Type": "application/json",
    ...options?.headers,
  };

  if (typeof window !== 'undefined') {
    const token = localStorage.getItem("tc_token");
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }
  }

  const res = await fetch(prefixedUrl, {
    credentials: "include",
    ...options,
    headers,
  });

  if (res.status === 401) {
    if (typeof window !== 'undefined') {
      window.location.href = `${basePath}/login`;
    }
    throw new Error('Unauthorized');
  }

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || errorData.message || "API error");
  }

  return res.json();
}
