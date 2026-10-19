type LogLevel = "info" | "warn" | "error" | "debug";

interface LogMeta {
  requestId?: string;
  method?: string;
  path?: string;
  status?: number;
  durationMs?: number;
  userId?: string;
  [key: string]: unknown;
}

class Logger {
  private formatMessage(level: LogLevel, message: string, meta?: LogMeta): string {
    const timestamp = new Date().toISOString();
    const metaString = meta && Object.keys(meta).length > 0 ? ` ${JSON.stringify(meta)}` : "";
    return `[${timestamp}] [${level.toUpperCase()}] ${message}${metaString}`;
  }

  info(message: string, meta?: LogMeta) {
    console.log(this.formatMessage("info", message, meta));
  }

  warn(message: string, meta?: LogMeta) {
    console.warn(this.formatMessage("warn", message, meta));
  }

  error(message: string, meta?: LogMeta) {
    console.error(this.formatMessage("error", message, meta));
  }

  debug(message: string, meta?: LogMeta) {
    if (process.env.NODE_ENV !== "production") {
      console.debug(this.formatMessage("debug", message, meta));
    }
  }
}

export const logger = new Logger();
export default logger;
