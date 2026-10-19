import fs from "fs";
import path from "path";
import Mailgen from "mailgen";
import nodemailer from "nodemailer";
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
          name: "AI Fitness",
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
          <h2 style="color: #111; margin-top: 0;">AI Fitness</h2>
          <p>Hi ${name},</p>
          <p>${intro}</p>
          ${action ? `<p>${action.instructions}</p>` : ""}
          ${buttonHtml}
          ${outro ? `<p style="margin-top: 24px; color: #555;">${outro}</p>` : ""}
          <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;" />
          <p style="font-size: 12px; color: #999;">&copy; ${new Date().getFullYear()} AI Fitness. All rights reserved.</p>
        </div>
      </body>
    </html>
  `;

  const text = `
AI Fitness

Hi ${name},

${intro}

${action ? `${action.instructions}\n${action.button.text}: ${action.button.link}` : ""}

${outro || ""}

(c) ${new Date().getFullYear()} AI Fitness
  `.trim();

  return { text, html };
}

export const emailVerificationTemplate = (username: string, verificationLink: string): MailContent => {
  return {
    body: {
      name: username,
      intro: "Welcome to AI Fitness! We're excited to have you on board.",
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
      intro: "You have requested to reset your password for your AI Fitness account.",
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

export interface SendEmailOptions {
  email: string;
  subject: string;
  mailgenContent: MailContent;
}

export async function sendEmail(options: SendEmailOptions): Promise<void> {
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

  // In dev without SMTP credentials, log the email action for instant local verification
  if (!env.SMTP_USER && env.NODE_ENV !== "production") {
    logger.info(`[DEV EMAIL SIMULATION] To: ${options.email} | Subject: ${options.subject}`);
    logger.info(`[DEV EMAIL SIMULATION] Content:\n${emailText}`);
    return;
  }

  const transporter = nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    auth:
      env.SMTP_USER && env.SMTP_PASS
        ? {
            user: env.SMTP_USER,
            pass: env.SMTP_PASS,
          }
        : undefined,
  });

  const mailOptions = {
    from: env.EMAIL_FROM,
    to: options.email,
    subject: options.subject,
    text: emailText,
    html: emailHtml,
  };

  try {
    await transporter.sendMail(mailOptions);
    logger.info(`Email successfully sent to ${options.email}`);
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    logger.error(`Failed to send email to ${options.email}:`, {
      error: errorMsg,
    });
    throw new Error(`Failed to deliver notification email: ${errorMsg}`);
  }
}
