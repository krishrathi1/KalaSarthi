/**
 * URL utilities for handling server-side and client-side requests
 */

/**
 * Resolves a relative API URL to an absolute URL
 * Works in both server-side and client-side contexts
 */
export function resolveApiUrl(path: string): string {
  // Remove leading slash if present
  const cleanPath = path.startsWith('/') ? path.slice(1) : path;
  
  if (typeof window !== 'undefined') {
    // Client-side: use window.location.origin
    return `${window.location.origin}/${cleanPath}`;
  } else {
    // Server-side: construct from environment or default
    const protocol = process.env.NODE_ENV === 'production' ? 'https' : 'http';
    const host = process.env.VERCEL_URL 
      ? process.env.VERCEL_URL 
      : process.env.NEXT_PUBLIC_APP_URL?.replace(/^https?:\/\//, '') 
      || 'localhost:9003';
    
    return `${protocol}://${host}/${cleanPath}`;
  }
}

/**
 * Makes a fetch request with proper URL resolution
 */
export async function fetchApi(path: string, options?: RequestInit): Promise<Response> {
  const url = resolveApiUrl(path);
  return fetch(url, options);
}