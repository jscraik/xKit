/**
 * Centralized logging system for xKit
 * Provides consistent, structured logging across the codebase
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'silent';

export interface LogMeta {
    [key: string]: unknown;
}

export interface LogEntry {
    timestamp: string;
    level: LogLevel;
    context: string;
    message: string;
    meta?: LogMeta;
}

/**
 * Logger configuration
 */
export interface LoggerConfig {
    level?: LogLevel;
    output?: 'console' | 'file' | 'both';
    filePath?: string;
    includeTimestamp?: boolean;
    includeContext?: boolean;
    jsonFormat?: boolean;
}

/**
 * Global logger configuration
 */
let globalConfig: LoggerConfig = {
    level: 'info',
    output: 'console',
    includeTimestamp: true,
    includeContext: true,
    jsonFormat: false,
};

/**
 * Set global logger configuration
 */
export function configureLogger(config: LoggerConfig): void {
    globalConfig = { ...globalConfig, ...config };
}

/**
 * Get global logger configuration
 */
export function getLoggerConfig(): LoggerConfig {
    return { ...globalConfig };
}

/**
 * Log level priority for filtering
 */
const LOG_LEVEL_PRIORITY: Record<LogLevel, number> = {
    debug: 0,
    info: 1,
    warn: 2,
    error: 3,
    silent: 4,
};

/**
 * Check if a log level should be output
 */
function shouldLog(level: LogLevel): boolean {
    const currentLevel = globalConfig.level || 'info';
    return LOG_LEVEL_PRIORITY[level] >= LOG_LEVEL_PRIORITY[currentLevel];
}

/**
 * Format log entry for output
 */
function formatLogEntry(entry: LogEntry): string {
    const { timestamp, level, context, message, meta } = entry;

    const timestampStr = globalConfig.includeTimestamp ? timestamp : '';
    const contextStr = globalConfig.includeContext ? `[${context}]` : '';
    const levelStr = level.toUpperCase().padEnd(5);
    const metaStr = meta ? ` ${JSON.stringify(meta)}` : '';

    if (globalConfig.jsonFormat) {
        return JSON.stringify(entry);
    }

    return `[${timestampStr}] ${levelStr} ${contextStr} ${message}${metaStr}`;
}

/**
 * Centralized Logger class
 */
export class Logger {
    private context: string;

    constructor(context: string, private level?: LogLevel) {
        this.context = context;
    }

    /**
     * Log debug message
     */
    debug(message: string, meta?: LogMeta): void {
        this.log('debug', message, meta);
    }

    /**
     * Log info message
     */
    info(message: string, meta?: LogMeta): void {
        this.log('info', message, meta);
    }

    /**
     * Log warning message
     */
    warn(message: string, meta?: LogMeta): void {
        this.log('warn', message, meta);
    }

    /**
     * Log error message
     */
    error(message: string, meta?: LogMeta): void {
        this.log('error', message, meta);
    }

    /**
     * Internal log method
     */
    private log(level: LogLevel, message: string, meta?: LogMeta): void {
        // Check if this level should be logged
        if (this.level && !shouldLog(this.level)) {
            return;
        }
        if (!this.level && !shouldLog(level)) {
            return;
        }

        const entry: LogEntry = {
            timestamp: new Date().toISOString(),
            level,
            context: this.context,
            message,
            meta,
        };

        const formatted = formatLogEntry(entry);

        // Output to appropriate destination
        if (globalConfig.output === 'console' || globalConfig.output === 'both') {
            const stream = level === 'error' ? console.error : console.log;
            stream(formatted);
        }

        if ((globalConfig.output === 'file' || globalConfig.output === 'both') && globalConfig.filePath) {
            const { writeFileSync } = require('node:fs');
            const { appendFileSync } = require('node:fs');
            try {
                appendFileSync(globalConfig.filePath, formatted + '\n', 'utf8');
            } catch {
                // Fail silently if file logging fails
            }
        }
    }

    /**
     * Create a child logger with additional context
     */
    child(childContext: string): Logger {
        return new Logger(`${this.context}:${childContext}`, this.level);
    }
}

/**
 * Create a logger instance for a given context
 */
export function createLogger(context: string, level?: LogLevel): Logger {
    return new Logger(context, level);
}

/**
 * Convenience function for quick logging
 */
export const log = {
    debug: (message: string, meta?: LogMeta) => createLogger('app').debug(message, meta),
    info: (message: string, meta?: LogMeta) => createLogger('app').info(message, meta),
    warn: (message: string, meta?: LogMeta) => createLogger('app').warn(message, meta),
    error: (message: string, meta?: LogMeta) => createLogger('app').error(message, meta),
};
