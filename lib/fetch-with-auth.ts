/**
 * Fetch wrapper that automatically includes credentials for authentication.
 * Use this instead of raw fetch() calls for API requests.
 */
export async function fetchWithAuth(
  input: RequestInfo | URL,
  init?: RequestInit,
): Promise<Response> {
  return fetch(input, {
    ...init,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...init?.headers,
    },
  });
}

/**
 * Convenience wrapper for GET requests with automatic JSON parsing
 */
export async function get<T = unknown>(url: string): Promise<T> {
  const response = await fetchWithAuth(url);
  if (!response.ok) {
    throw new Error(`GET ${url} failed: ${response.statusText}`);
  }
  return response.json();
}

/**
 * Convenience wrapper for POST requests with automatic JSON parsing
 */
export async function post<T = unknown>(url: string, data?: unknown): Promise<T> {
  const response = await fetchWithAuth(url, {
    method: "POST",
    body: data ? JSON.stringify(data) : undefined,
  });
  if (!response.ok) {
    throw new Error(`POST ${url} failed: ${response.statusText}`);
  }
  return response.json();
}

/**
 * Convenience wrapper for PATCH requests with automatic JSON parsing
 */
export async function patch<T = unknown>(url: string, data?: unknown): Promise<T> {
  const response = await fetchWithAuth(url, {
    method: "PATCH",
    body: data ? JSON.stringify(data) : undefined,
  });
  if (!response.ok) {
    throw new Error(`PATCH ${url} failed: ${response.statusText}`);
  }
  return response.json();
}

/**
 * Convenience wrapper for DELETE requests with automatic JSON parsing
 */
export async function del<T = unknown>(url: string): Promise<T> {
  const response = await fetchWithAuth(url, {
    method: "DELETE",
  });
  if (!response.ok) {
    throw new Error(`DELETE ${url} failed: ${response.statusText}`);
  }
  return response.json();
}
