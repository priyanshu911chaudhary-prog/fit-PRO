import { describe, it, expect } from "vitest";
import { formatDob } from "@/features/profile/lib/formatters";

describe("Profile formatters", () => {
  it("formats date of birth safely", () => {
    expect(formatDob(undefined)).toBe("N/A");
    expect(formatDob("not-a-date")).toBe("not-a-date");

    const validDate = new Date("1998-05-20T00:00:00Z");
    const formatted = formatDob(validDate);
    expect(formatted).toContain("1998");
  });
});
