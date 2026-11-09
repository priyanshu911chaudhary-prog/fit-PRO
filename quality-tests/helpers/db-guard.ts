/**
 * Database safety guard for quality-tests.
 * Refuses to run if MONGODB_URI_TEST is missing, points to production,
 * or lacks an unmistakable test database name.
 */
export function assertSafeTestDatabase(uri?: string): string {
  if (!uri || typeof uri !== "string" || !uri.trim()) {
    throw new Error(
      "SAFETY ABORT: MONGODB_URI_TEST environment variable is missing or empty. " +
      "Quality tests must only run against an explicit test database."
    );
  }

  const trimmed = uri.trim();

  // Parse URI to check database name
  let dbName = "";
  try {
    // Replace mongodb+srv or mongodb scheme with http for URL parsing if needed
    const normalized = trimmed.replace(/^mongodb(\+srv)?:\/\//, "http://");
    const parsed = new URL(normalized);
    dbName = parsed.pathname.replace(/^\//, "").split("?")[0];
  } catch {
    // If URL parsing fails, extract path segment manually
    const withoutQuery = trimmed.split("?")[0];
    const segments = withoutQuery.split("/");
    dbName = segments[segments.length - 1] || "";
  }

  if (!dbName) {
    throw new Error(
      `SAFETY ABORT: MONGODB_URI_TEST does not specify a database name: "${trimmed}". ` +
      "A dedicated test database name (e.g. fit-PRO-test) is required."
    );
  }

  const lower = dbName.toLowerCase();
  const hasTestSuffix = lower.includes("test") || lower.endsWith("-test") || lower.endsWith("_test");

  if (!hasTestSuffix) {
    throw new Error(
      `SAFETY ABORT: MONGODB_URI_TEST points to database "${dbName}" which does not contain "test". ` +
      "Refusing to run tests against a potentially non-test database."
    );
  }

  // Refuse known production-like keywords
  if (lower.includes("prod") && !lower.includes("test")) {
    throw new Error(
      `SAFETY ABORT: MONGODB_URI_TEST database "${dbName}" appears to be a production database.`
    );
  }

  return trimmed;
}

