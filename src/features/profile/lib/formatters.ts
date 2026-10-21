export function formatDob(dob?: string | Date): string {
  if (!dob) return "N/A";
  try {
    const d = new Date(dob);
    if (isNaN(d.getTime())) return String(dob);
    return d.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
  } catch {
    return String(dob);
  }
}
