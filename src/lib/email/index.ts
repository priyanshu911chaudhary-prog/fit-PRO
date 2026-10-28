import fs from "fs";
import path from "path";
import Mailgen from "mailgen";
import nodemailer from "nodemailer";
import { MailtrapTransport } from "mailtrap";
import { env } from "../env";
import { logger } from "../logger";

export interface MailContent {
  body: {
    name: string;
    intro: string;
    action?: {
      instructions: string;
      button: {
        text: string;
        link: string;
        color?: string;
      };
    };
    outro?: string;
  };
}

let mailgenInstance: Mailgen | null = null;

function getMailGenerator(): Mailgen | null {
  if (mailgenInstance) return mailgenInstance;

  try {
    const defaultHtmlPath = path.join(
      process.cwd(),
      "node_modules",
      "mailgen",
      "themes",
      "default",
      "index.html"
    );
    const defaultTxtPath = path.join(
      process.cwd(),
      "node_modules",
      "mailgen",
      "themes",
      "default",
      "index.txt"
    );

    if (fs.existsSync(defaultHtmlPath)) {
      mailgenInstance = new Mailgen({
        theme: {
          path: defaultHtmlPath,
          plaintextPath: defaultTxtPath,
        },
        product: {
          name: "Fit-PRO",
          link: env.APP_URL,
        },
      });
      return mailgenInstance;
    }
  } catch {
    // Fall back to simple template if Mailgen theme files cannot be read in bundled environment
  }
  return null;
}

function generateFallbackEmail(content: MailContent): { text: string; html: string } {
  const { name, intro, action, outro } = content.body;
  const buttonHtml = action?.button
    ? `<div style="margin: 24px 0;">
        <a href="${action.button.link}" style="background-color: ${
        action.button.color || "#22BC66"
      }; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
          ${action.button.text}
        </a>
       </div>
       <p style="font-size: 13px; color: #666;">Or copy this link: <a href="${action.button.link}">${
        action.button.link
      }</a></p>`
    : "";

  const html = `
    <!DOCTYPE html>
    <html>
      <head><meta charset="utf-8"></head>
      <body style="font-family: sans-serif; background-color: #f7f9fa; padding: 24px; color: #333;">
        <div style="max-width: 560px; margin: 0 auto; background: white; border-radius: 8px; padding: 32px; box-shadow: 0 2px 4px rgba(0,0,0,0.05);">
          <h2 style="color: #111; margin-top: 0;">Fit-PRO</h2>
          <p>Hi ${name},</p>
          <p>${intro}</p>
          ${action ? `<p>${action.instructions}</p>` : ""}
          ${buttonHtml}
          ${outro ? `<p style="margin-top: 24px; color: #555;">${outro}</p>` : ""}
          <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;" />
          <p style="font-size: 12px; color: #999;">&copy; ${new Date().getFullYear()} Fit-PRO. All rights reserved.</p>
        </div>
      </body>
    </html>
  `;

  const text = `
Fit-PRO

Hi ${name},

${intro}

${action ? `${action.instructions}\n${action.button.text}: ${action.button.link}` : ""}

${outro || ""}

(c) ${new Date().getFullYear()} Fit-PRO
  `.trim();

  return { text, html };
}

export const emailVerificationTemplate = (username: string, verificationLink: string): MailContent => {
  return {
    body: {
      name: username,
      intro: "Welcome to Fit-PRO! We're excited to have you on board.",
      action: {
        instructions: "To get started, please verify your email address by clicking the button below:",
        button: {
          text: "Verify Your Email Address",
          link: verificationLink,
          color: "#22BC66",
        },
      },
      outro: "Need help or have questions? Just reply to this email and our team will get back to you as soon as possible.",
    },
  };
};

export const passwordResetTemplate = (username: string, resetLink: string): MailContent => {
  return {
    body: {
      name: username,
      intro: "You have requested to reset your password for your Fit-PRO account.",
      action: {
        instructions: "To reset your password, please click the button below:",
        button: {
          text: "Reset Your Password",
          link: resetLink,
          color: "#FF4136",
        },
      },
      outro: "If you did not request a password reset, please ignore this email or contact support if you have questions.",
    },
  };
};

export const wellnessEmailTemplate = (
  username: string,
  title: string,
  message: string,
  actionUrl: string,
  preferencesUrl: string,
  unsubscribeUrl?: string
): MailContent => {
  const outroText = unsubscribeUrl
    ? `You are receiving this wellness nudge because you enabled Fit-PRO wellness emails. You can adjust your notification preferences (${preferencesUrl}) or unsubscribe from wellness emails with one click: ${unsubscribeUrl}`
    : `You are receiving this wellness nudge because you enabled Fit-PRO wellness emails. You can adjust your reminders or unsubscribe at any time: ${preferencesUrl}`;

  return {
    body: {
      name: username,
      intro: message,
      action: {
        instructions: "Head over to Fit-PRO to view your progress:",
        button: {
          text: title,
          link: actionUrl,
          color: "#4F46E5",
        },
      },
      outro: outroText,
    },
  };
};

export interface SendEmailOptions {
  email: string;
  subject: string;
  mailgenContent: MailContent;
  stream?: "transactional" | "bulk";
}

export interface SendEmailResult {
  success: boolean;
  messageId?: string;
  simulated?: boolean;
}

/**
 * Delivers an email through Mailtrap's API transport (or mock simulation in dev/test).
 * All account verification, password resets, and wellness notifications are strictly Transactional.
 */
export async function sendEmail(options: SendEmailOptions): Promise<SendEmailResult> {
  let emailText = "";
  let emailHtml = "";

  const generator = getMailGenerator();
  if (generator) {
    try {
      emailText = generator.generatePlaintext(options.mailgenContent as unknown as Mailgen.Content);
      emailHtml = generator.generate(options.mailgenContent as unknown as Mailgen.Content);
    } catch {
      const fallback = generateFallbackEmail(options.mailgenContent);
      emailText = fallback.text;
      emailHtml = fallback.html;
    }
  } else {
    const fallback = generateFallbackEmail(options.mailgenContent);
    emailText = fallback.text;
    emailHtml = fallback.html;
  }

  const isMock = env.EMAIL_PROVIDER === "mock";

  if (isMock) {
    const mockMessageId = `mock-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    logger.info(`[MOCK EMAIL SIMULATION] To: ${options.email} | Subject: ${options.subject} | ID: ${mockMessageId}`);
    return {
      success: true,
      messageId: mockMessageId,
      simulated: true,
    };
  }

  if (!env.MAILTRAP_API_TOKEN) {
    throw new Error("Missing MAILTRAP_API_TOKEN for Mailtrap API delivery");
  }

  const isBulk = options.stream === "bulk";
  const transporter = nodemailer.createTransport(
    MailtrapTransport({
      token: env.MAILTRAP_API_TOKEN,
      bulk: isBulk,
    })
  );

  const mailOptions = {
    from: env.EMAIL_FROM,
    to: options.email,
    subject: options.subject,
    text: emailText,
    html: emailHtml,
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    let messageId: string | undefined;
    if ("message_ids" in info && Array.isArray(info.message_ids) && info.message_ids.length > 0) {
      messageId = info.message_ids[0];
    } else if ("messageId" in (info as Record<string, unknown>) && typeof (info as Record<string, unknown>).messageId === "string") {
      messageId = (info as Record<string, unknown>).messageId as string;
    } else {
      messageId = `mt-${Date.now()}`;
    }
    logger.info(`Email successfully dispatched via Mailtrap API to ${options.email}`, {
      messageId,
      stream: isBulk ? "bulk" : "transactional",
    });
    return {
      success: true,
      messageId,
      simulated: false,
    };
  } catch (error: unknown) {
    const rawMsg = error instanceof Error ? error.message : String(error);
    const sanitizedMsg = env.MAILTRAP_API_TOKEN
      ? rawMsg.replace(new RegExp(env.MAILTRAP_API_TOKEN, "g"), "[REDACTED_TOKEN]")
      : rawMsg;

    logger.error(`Failed to send email to ${options.email} via Mailtrap API:`, {
      error: sanitizedMsg,
      stream: isBulk ? "bulk" : "transactional",
    });
    throw new Error(`Failed to deliver email via Mailtrap API: ${sanitizedMsg}`);
  }
}
