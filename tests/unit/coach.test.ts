import { describe, expect, it } from "vitest";
import { PROMPT_SUGGESTIONS, DEFAULT_WELCOME_MESSAGE } from "@/features/coach/lib/constants";

describe("Coach Feature Constants and Configuration", () => {
  it("provides valid prompt suggestions with non-empty queries", () => {
    expect(PROMPT_SUGGESTIONS.length).toBeGreaterThan(0);
    PROMPT_SUGGESTIONS.forEach((s) => {
      expect(s.label).toBeTruthy();
      expect(s.query).toBeTruthy();
      expect(s.icon).toBeDefined();
    });
  });

  it("contains calibrated default welcome message from assistant", () => {
    expect(DEFAULT_WELCOME_MESSAGE.role).toBe("assistant");
    expect(DEFAULT_WELCOME_MESSAGE.content).toContain("fit-PRO Biomechanics");
    expect(DEFAULT_WELCOME_MESSAGE.id).toBe("welcome");
  });
});
