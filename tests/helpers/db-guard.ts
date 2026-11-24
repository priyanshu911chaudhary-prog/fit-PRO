/** Require an explicitly named test database before running suites that remove fixtures. */
export function assertSafeTestDatabase(uri?: string): string {
  const value = uri?.trim();
  const match = value?.match(/^mongodb(?:\+srv)?:\/\/[^/?#]+\/([\w.-]+)(?:\?[^#]*)?$/i);
  if (!value || !match || !/(?:^|[-_.])test(?:$|[-_.])/i.test(match[1])) {
    throw new Error("Set MONGODB_URI_TEST to a dedicated database named e.g. fit-PRO-test.");
  }
  return value;
}
