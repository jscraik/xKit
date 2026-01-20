/**
 * Structured logging with Pino
 * Provides JSON logging with pretty-printing for development
 */

import pino from 'pino';

const logLevel = process.env.LOG_LEVEL || 'info';

/**
 * Create a pino logger instance
 * In development: use pino-pretty for human-readable output
 * In production: use JSON for machine parsing
 */
export const logger = pino({
  level: logLevel,
  // Redact sensitive values from logs
  redact: {
    paths: ['cookies.authToken', 'cookies.ct0', 'apiKey', 'apiKeys'],
    remove: true,
  },
  // In development, use pretty printing
  ...(process.env.NODE_ENV !== 'production' && {
    transport: {
      target: 'pino-pretty',
      options: {
        colorize: true,
        translateTime: 'HH:MM:ss Z',
        ignore: 'pid,hostname',
      },
    },
  }),
});

/**
 * Create child logger with additional context
 */
export function createChildLogger(context: Record<string, unknown>) {
  return logger.child(context);
}

/**
 * Log levels
 */
export const logLevels = {
  trace: 'trace',
  debug: 'debug',
  info: 'info',
  warn: 'warn',
  error: 'error',
  fatal: 'fatal',
} as const;
