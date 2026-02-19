// In dev the Vite proxy forwards /api/* → ail.buyhatke.com (avoids CORS on localhost)
// In prod the browser calls ail.buyhatke.com directly (origin is in CORS allow-list)
const DEFAULT_BASE_URL = import.meta.env.DEV ? "/api" : "https://ail.buyhatke.com";

export const API_BASE_URL: string = (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? DEFAULT_BASE_URL;

export function apiUrl(pathname: string) {
  const base = API_BASE_URL.replace(/\/$/, "");
  const path = pathname.startsWith("/") ? pathname : `/${pathname}`;
  return `${base}${path}`;
}

/** Fetch wrapper that injects the JWT token into every request. */
export async function apiFetch(url: string, options: RequestInit = {}): Promise<Response> {
  const token = localStorage.getItem("hatke-ai-token");

  const headers = new Headers(options.headers as HeadersInit | undefined);
  if (token) headers.set("Authorization", `Bearer ${token}`);

  return fetch(url, { ...options, headers });
}
