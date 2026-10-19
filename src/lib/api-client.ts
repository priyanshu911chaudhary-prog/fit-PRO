/**
 * Fit-PRO Client-side API Fetcher
 * - Automatic X-Timezone header
 * - Single-flight refresh on 401 with rotation grace window
 * - Unified envelope handling
 */

let refreshPromise: Promise<boolean> | null = null;

export interface ClientApiResponse<T = unknown> {
  statusCode: number;
  message: string;
  data: T;
  success: boolean;
  errors?: unknown[];
}

export async function apiClient<T = unknown>(
  url: string,
  options: RequestInit = {}
): Promise<ClientApiResponse<T>> {
  const headers = new Headers(options.headers || {});

  // Add default content type if sending body
  if (options.body && typeof options.body === "string" && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  // Automatic timezone header
  if (!headers.has("X-Timezone") && typeof Intl !== "undefined") {
    try {
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
      if (tz) headers.set("X-Timezone", tz);
    } catch {
      // Fallback
    }
  }

  const finalOptions: RequestInit = {
    ...options,
    headers,
    credentials: options.credentials ?? "same-origin",
  };

  let res = await fetch(url, finalOptions);

  // If 401 and not an auth attempt endpoint, try single-flight refresh
  const isAuthBypassUrl =
    url.includes("/api/auth/me") ||
    url.includes("/api/auth/login") ||
    url.includes("/api/auth/register") ||
    url.includes("/api/auth/refresh") ||
    url.includes("/api/auth/forgot-password") ||
    url.includes("/api/auth/reset-password") ||
    url.includes("/api/auth/resend-verification");

  if (res.status === 401 && !isAuthBypassUrl) {
    if (!refreshPromise) {
      refreshPromise = (async () => {
        try {
          const refreshRes = await fetch("/api/auth/refresh", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "same-origin",
          });
          return refreshRes.ok;
        } catch {
          return false;
        } finally {
          // Grace window to prevent thrashing
          setTimeout(() => {
            refreshPromise = null;
          }, 2000);
        }
      })();
    }

    const refreshSuccess = await refreshPromise;

    if (refreshSuccess) {
      // Retry original request once
      res = await fetch(url, finalOptions);
    } else {
      // Refresh failed, session expired: only redirect if user is on a protected route
      if (typeof window !== "undefined") {
        const isPublicRoute =
          window.location.pathname === "/" ||
          window.location.pathname.startsWith("/login") ||
          window.location.pathname.startsWith("/register") ||
          window.location.pathname.startsWith("/forgot-password") ||
          window.location.pathname.startsWith("/reset-password") ||
          window.location.pathname.startsWith("/verify-email");

        if (!isPublicRoute) {
          window.location.href = `/login?redirect=${encodeURIComponent(window.location.pathname)}`;
        }
      }
    }
  }

  let json: ClientApiResponse<T>;
  try {
    json = await res.json();
  } catch {
    json = {
      statusCode: res.status,
      message: res.statusText || "An unexpected error occurred",
      data: null as unknown as T,
      success: false,
    };
  }

  if (!res.ok) {
    const error = new Error(json.message || `Request failed with status ${res.status}`);
    (error as unknown as { response: ClientApiResponse<T> }).response = json;
    throw error;
  }

  return json;
}
