export function getSafeRedirectUrl(target: string | null | undefined, reqUrl: string): URL {
  const defaultFallback = new URL("/dashboard", reqUrl);

  if (!target || typeof target !== "string") {
    return defaultFallback;
  }

  const trimmed = target.trim();

  // Must start with exactly one leading slash; reject protocol-relative (//) and backslash (\)
  if (
    !trimmed.startsWith("/") ||
    trimmed.startsWith("//") ||
    trimmed.startsWith("/\\") ||
    trimmed.startsWith("\\")
  ) {
    return defaultFallback;
  }

  try {
    const candidate = new URL(trimmed, reqUrl);
    const base = new URL(reqUrl);

    // Strict origin and protocol comparison
    if (candidate.origin !== base.origin) {
      return defaultFallback;
    }

    if (candidate.protocol !== "http:" && candidate.protocol !== "https:") {
      return defaultFallback;
    }

    // Ensure username or password is not embedded
    if (candidate.username || candidate.password) {
      return defaultFallback;
    }

    return candidate;
  } catch {
    return defaultFallback;
  }
}

export function afterLogin(hasProfile: boolean, target?: string | null) {
  if (!hasProfile) return "/onboarding";
  const url = getSafeRedirectUrl(target, "https://fit-pro.invalid");
  if (["/login", "/register"].includes(url.pathname)) return "/dashboard";
  return url.pathname + url.search + url.hash;
}
