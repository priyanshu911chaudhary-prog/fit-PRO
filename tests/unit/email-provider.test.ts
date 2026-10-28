import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  sendEmail,
  emailVerificationTemplate,
  passwordResetTemplate,
  wellnessEmailTemplate,
} from "@/lib/email";
import * as envModule from "@/lib/env";
import nodemailer from "nodemailer";
import * as mailtrapModule from "mailtrap";
import { logger } from "@/lib/logger";

describe("Email Provider — Mailtrap API Transport & Stream Routing", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    vi.restoreAllMocks();
  });

  describe("Mock Mode & Test Safety", () => {
    it("mock mode generates deterministic IDs and never executes HTTP calls or requires a token", async () => {
      const sendMailSpy = vi.fn();
      vi.spyOn(nodemailer, "createTransport").mockReturnValue({
        sendMail: sendMailSpy,
      } as any);

      // Force mock mode
      vi.spyOn(envModule, "env", "get").mockReturnValue({
        ...envModule.env,
        EMAIL_PROVIDER: "mock",
        MAILTRAP_API_TOKEN: undefined,
      });

      const result = await sendEmail({
        email: "athlete@example.com",
        subject: "Verify Your Email Address",
        mailgenContent: emailVerificationTemplate("Athlete", "https://fitpro.local/verify?token=123"),
      });

      expect(result.success).toBe(true);
      expect(result.simulated).toBe(true);
      expect(result.messageId).toMatch(/^mock-\d+-[a-z0-9]+$/);
      expect(sendMailSpy).not.toHaveBeenCalled();
    });

    it("prevents real transport selection during automated test runs without explicit opt-in", async () => {
      // In tests, default is mock mode
      expect(envModule.env.EMAIL_PROVIDER).toBe("mock");
    });
  });

  describe("Mailtrap API Transport Configuration & Stream Routing", () => {
    it("routes transactional email to Mailtrap with default transactional configuration", async () => {
      const mockSendMail = vi.fn().mockResolvedValue({
        messageId: "mt-txn-msg-999",
      });

      const createTransportSpy = vi.spyOn(nodemailer, "createTransport").mockImplementation(((transportOpts: any) => {
        return {
          sendMail: mockSendMail,
        } as any;
      }) as any);

      const mailtrapTransportSpy = vi.spyOn(mailtrapModule, "MailtrapTransport");

      vi.spyOn(envModule, "env", "get").mockReturnValue({
        ...envModule.env,
        EMAIL_PROVIDER: "mailtrap",
        MAILTRAP_API_TOKEN: "valid_mailtrap_token_12345",
        EMAIL_FROM: "Fit-PRO <hello@fit-pro.publicvm.com>",
      });

      const result = await sendEmail({
        email: "verified-user@example.com",
        subject: "Verify Your Email Address",
        mailgenContent: emailVerificationTemplate("Jane Doe", "https://fit-pro.publicvm.com/verify-email/test-token"),
      });

      expect(result.success).toBe(true);
      expect(result.simulated).toBe(false);
      expect(result.messageId).toBe("mt-txn-msg-999");

      // Verify MailtrapTransport initialized without bulk flag (Transactional stream)
      expect(mailtrapTransportSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          token: "valid_mailtrap_token_12345",
          bulk: false,
        })
      );

      // Verify message payload passed to Nodemailer
      expect(mockSendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          from: "Fit-PRO <hello@fit-pro.publicvm.com>",
          to: "verified-user@example.com",
          subject: "Verify Your Email Address",
          text: expect.stringContaining("Welcome to Fit-PRO!"),
          html: expect.stringContaining("Fit-PRO"),
        })
      );
    });

    it("guarantees account verification and password resets cannot accidentally use the Bulk stream", async () => {
      const mailtrapTransportSpy = vi.spyOn(mailtrapModule, "MailtrapTransport");
      vi.spyOn(nodemailer, "createTransport").mockReturnValue({
        sendMail: vi.fn().mockResolvedValue({ messageId: "mt-txn-msg-001" }),
      } as any);

      vi.spyOn(envModule, "env", "get").mockReturnValue({
        ...envModule.env,
        EMAIL_PROVIDER: "mailtrap",
        MAILTRAP_API_TOKEN: "valid_mailtrap_token_12345",
      });

      // Verification email
      await sendEmail({
        email: "user@example.com",
        subject: "Verify Your Email Address",
        mailgenContent: emailVerificationTemplate("User", "https://fitpro.local/verify"),
      });

      expect(mailtrapTransportSpy).toHaveBeenLastCalledWith(
        expect.objectContaining({ bulk: false })
      );

      // Password reset email
      await sendEmail({
        email: "user@example.com",
        subject: "Reset Your Password",
        mailgenContent: passwordResetTemplate("User", "https://fitpro.local/reset"),
      });

      expect(mailtrapTransportSpy).toHaveBeenLastCalledWith(
        expect.objectContaining({ bulk: false })
      );
    });

    it("supports explicit Bulk stream selection when explicitly requested for promotional campaigns", async () => {
      const mailtrapTransportSpy = vi.spyOn(mailtrapModule, "MailtrapTransport");
      vi.spyOn(nodemailer, "createTransport").mockReturnValue({
        sendMail: vi.fn().mockResolvedValue({ messageId: "mt-bulk-msg-002" }),
      } as any);

      vi.spyOn(envModule, "env", "get").mockReturnValue({
        ...envModule.env,
        EMAIL_PROVIDER: "mailtrap",
        MAILTRAP_API_TOKEN: "valid_mailtrap_token_12345",
      });

      const result = await sendEmail({
        email: "newsletter-subscriber@example.com",
        subject: "Monthly Fitness Protocol Dispatch",
        mailgenContent: {
          body: {
            name: "Subscriber",
            intro: "Here are your monthly fitness updates.",
          },
        },
        stream: "bulk",
      });

      expect(result.success).toBe(true);
      expect(mailtrapTransportSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          token: "valid_mailtrap_token_12345",
          bulk: true,
        })
      );
    });

    it("throws a clear actionable configuration error if Mailtrap provider is active but token is missing", async () => {
      vi.spyOn(envModule, "env", "get").mockReturnValue({
        ...envModule.env,
        EMAIL_PROVIDER: "mailtrap",
        MAILTRAP_API_TOKEN: undefined,
      });

      await expect(
        sendEmail({
          email: "user@example.com",
          subject: "Test",
          mailgenContent: emailVerificationTemplate("User", "https://link"),
        })
      ).rejects.toThrow(/Missing MAILTRAP_API_TOKEN for Mailtrap API delivery/);
    });
  });

  describe("Provider Error Handling & Redaction", () => {
    it("handles unauthorized 401 error and classifies it cleanly", async () => {
      vi.spyOn(nodemailer, "createTransport").mockReturnValue({
        sendMail: vi.fn().mockRejectedValue(new Error("Request failed with status code 401: Unauthorized")),
      } as any);

      vi.spyOn(envModule, "env", "get").mockReturnValue({
        ...envModule.env,
        EMAIL_PROVIDER: "mailtrap",
        MAILTRAP_API_TOKEN: "invalid_secret_token_abc",
      });

      await expect(
        sendEmail({
          email: "user@example.com",
          subject: "Test",
          mailgenContent: emailVerificationTemplate("User", "https://link"),
        })
      ).rejects.toThrow(/Failed to deliver email via Mailtrap API.*401/);
    });

    it("handles rate limiting (429 Too Many Requests)", async () => {
      vi.spyOn(nodemailer, "createTransport").mockReturnValue({
        sendMail: vi.fn().mockRejectedValue(new Error("Request failed with status code 429: Too Many Requests")),
      } as any);

      vi.spyOn(envModule, "env", "get").mockReturnValue({
        ...envModule.env,
        EMAIL_PROVIDER: "mailtrap",
        MAILTRAP_API_TOKEN: "valid_token",
      });

      await expect(
        sendEmail({
          email: "user@example.com",
          subject: "Test",
          mailgenContent: emailVerificationTemplate("User", "https://link"),
        })
      ).rejects.toThrow(/429/);
    });

    it("handles transient network failures and request timeouts", async () => {
      vi.spyOn(nodemailer, "createTransport").mockReturnValue({
        sendMail: vi.fn().mockRejectedValue(new Error("connect ETIMEDOUT 18.156.128.12:443")),
      } as any);

      vi.spyOn(envModule, "env", "get").mockReturnValue({
        ...envModule.env,
        EMAIL_PROVIDER: "mailtrap",
        MAILTRAP_API_TOKEN: "valid_token",
      });

      await expect(
        sendEmail({
          email: "user@example.com",
          subject: "Test",
          mailgenContent: emailVerificationTemplate("User", "https://link"),
        })
      ).rejects.toThrow(/ETIMEDOUT/);
    });

    it("redacts sensitive API tokens from logged and thrown errors", async () => {
      const secretToken = "super_secret_mailtrap_token_xyz999";
      vi.spyOn(nodemailer, "createTransport").mockReturnValue({
        sendMail: vi.fn().mockRejectedValue(new Error(`Failed request with token ${secretToken} to endpoint`)),
      } as any);

      vi.spyOn(envModule, "env", "get").mockReturnValue({
        ...envModule.env,
        EMAIL_PROVIDER: "mailtrap",
        MAILTRAP_API_TOKEN: secretToken,
      });

      const loggerSpy = vi.spyOn(logger, "error");

      let thrownErr: Error | null = null;
      try {
        await sendEmail({
          email: "user@example.com",
          subject: "Test",
          mailgenContent: emailVerificationTemplate("User", "https://link"),
        });
      } catch (err: any) {
        thrownErr = err;
      }

      expect(thrownErr).not.toBeNull();
      // Token must not be present in thrown error message
      expect(thrownErr?.message).not.toContain(secretToken);
      expect(thrownErr?.message).toContain("[REDACTED_TOKEN]");

      // Token must not be present in logger call
      const loggedError = loggerSpy.mock.calls[0]?.[1];
      expect(JSON.stringify(loggedError)).not.toContain(secretToken);
      expect(JSON.stringify(loggedError)).toContain("[REDACTED_TOKEN]");
    });
  });

  describe("Template Construction & Content Rendering", () => {
    it("renders verification email template with recipient name and verification link", async () => {
      const content = emailVerificationTemplate("Alex Champion", "https://fitpro.local/verify?token=tok123");
      expect(content.body.name).toBe("Alex Champion");
      expect(content.body.action?.button.link).toBe("https://fitpro.local/verify?token=tok123");
      expect(content.body.action?.button.text).toBe("Verify Your Email Address");
    });

    it("renders password reset email template with recipient name and reset link", async () => {
      const content = passwordResetTemplate("Jordan Smith", "https://fitpro.local/reset-password?token=reset456");
      expect(content.body.name).toBe("Jordan Smith");
      expect(content.body.action?.button.link).toBe("https://fitpro.local/reset-password?token=reset456");
      expect(content.body.action?.button.text).toBe("Reset Your Password");
    });

    it("renders wellness notification template with custom action and unsubscribe link", async () => {
      const content = wellnessEmailTemplate(
        "Athlete Taylor",
        "Hydration Reminder",
        "You are halfway to your daily goal!",
        "https://fitpro.local/dashboard",
        "https://fitpro.local/settings/notifications",
        "https://fitpro.local/notifications/unsubscribe?token=unsub789"
      );
      expect(content.body.name).toBe("Athlete Taylor");
      expect(content.body.intro).toBe("You are halfway to your daily goal!");
      expect(content.body.action?.button.link).toBe("https://fitpro.local/dashboard");
      expect(content.body.outro).toContain("https://fitpro.local/notifications/unsubscribe?token=unsub789");
    });
  });
});

