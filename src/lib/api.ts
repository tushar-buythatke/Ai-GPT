const DEFAULT_BASE_URL = import.meta.env.DEV ? "/api" : "https://ail.buyhatke.com";

export const API_BASE_URL: string = (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? DEFAULT_BASE_URL;

export function apiUrl(pathname: string) {
  const base = API_BASE_URL.replace(/\/$/, "");
  const path = pathname.startsWith("/") ? pathname : `/${pathname}`;
  return `${base}${path}`;
}
