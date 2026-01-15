/**
 * Logger utility for bookmark export operations
 * Provides structured logging with context and file output
 */

import { appendFileSync, existsSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';

export type LogLevel = 'info' | 'warn' | 'error';

export interface LogContext {
  operation?: string;
  bookmarkId?: string;
  userId?: string;
  analyzerName?: string;
  [key: string]: any;
}

export interface LoggerOptions {
  logFile?: string;
  console?: boolean;
}

/**
 * Logger class for structured logging
 */
export class Logger {
  private logEntries: Array<{
    timestamp: string;
    level: LogLevel;
    message: string;
    context?: LogContext;
  }> = [];

  private logFile?: string;
  private consoleEnabled: boolean;

  constructor(options: LoggerOptions = {}) {
    this.logFile = options.logFile;
    this.consoleEnabled = options.console !== false;

    // Ensure log directory exists if logFile is specified
    if (this.logFile) {
      const dir = dirname(this.logFile);
      if (!existsSync(dir)) {
        mkdirSync(dir, { recursive: true });
      }
    }
  }

  /**
   * Log an info message
   */
  info(message: string, context?: LogContext): void {
    this.log('info', message, context);
  }

  /**
   * Log a warning message
   */
  warn(message: string, context?: LogContext): void {
    this.log('warn', message, context);
  }

  /**
   * Log an error message
   */
  error(message: string, context?: LogContext): void {
    this.log('error', message, context);
  }

  /**
   * Internal log method
   */
  private log(level: LogLevel, message: string, context?: LogContext): void {
    const entry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      context,
    };

    this.logEntries.push(entry);

    const contextStr = context ? ` ${JSON.stringify(context)}` : '';
    const logMessage = `[${entry.timestamp}] ${level.toUpperCase()}: ${message}${contextStr}`;

    // Output to console if enabled
    if (this.consoleEnabled) {
      switch (level) {
        case 'error':
          console.error(logMessage);
          break;
        case 'warn':
          console.warn(logMessage);
          break;
        default:
          console.log(logMessage);
      }
    }

    // Write to file if configured
    if (this.logFile) {
      try {
        appendFileSync(this.logFile, `${logMessage}\n`, 'utf-8');
      } catch (error) {
        console.error(`Failed to write to log file ${this.logFile}:`, error);
      }
    }
  }

  /**
   * Get all log entries
   */
  getEntries(): Array<{
    timestamp: string;
    level: LogLevel;
    message: string;
    context?: LogContext;
  }> {
    return [...this.logEntries];
  }

  /**
   * Clear all log entries
   */
  clear(): void {
    this.logEntries = [];
  }
}

/**
 * Global logger instance for export operations
 */
export const logger = new Logger({ logFile: 'export.log' });
