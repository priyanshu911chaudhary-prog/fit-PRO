
import "server-only";

import pino from "pino";

export interface LogMeta {
  requestId?: string;
  method?: string;
  path?: string;
  status?: number;
  durationMs?: number;
  userId?: string;
  [key: string]: unknown;
}

const isDevelopment = process.env.NODE_ENV === "development";

const pinoLogger = pino({
  level:
    process.env.LOG_LEVEL ??
    (isDevelopment ? "debug" : "info"),

  base: {
    service: "fit-pro",
  },

  timestamp: pino.stdTimeFunctions.isoTime,

  // Prevent common credentials and personal identifiers from
  // appearing in structured log metadata.
  redact: {
    paths: [
      "password",
      "*.password",
      "token",
      "*.token",
      "accessToken",
      "*.accessToken",
      "refreshToken",
      "*.refreshToken",
      "authorization",
      "*.authorization",
      "headers.authorization",
      "cookie",
      "*.cookie",
      "apiKey",
      "*.apiKey",
      "secret",
      "*.secret",
      "email",
      "*.email",
      "userId",
      "*.userId",
    ],
    censor: "[REDACTED]",
  },

  ...(isDevelopment
    ? {
        transport: {
          target: "pino-pretty",
          options: {
            colorize: true,
            translateTime: "SYS:standard",
            ignore: "pid,hostname",
          },
        },
      }
    : {}),
});

export const logger = {
  info(message: string, meta?: LogMeta) {
    if (meta) {
      pinoLogger.info(meta, message);
    } else {
      pinoLogger.info(message);
    }
  },

  warn(message: string, meta?: LogMeta) {
    if (meta) {
      pinoLogger.warn(meta, message);
    } else {
      pinoLogger.warn(message);
    }
  },

  error(message: string, meta?: LogMeta) {
    if (meta) {
      pinoLogger.error(meta, message);
    } else {
      pinoLogger.error(message);
    }
  },

  debug(message: string, meta?: LogMeta) {
    if (meta) {
      pinoLogger.debug(meta, message);
    } else {
      pinoLogger.debug(message);
    }
  },
};

export default logger;
