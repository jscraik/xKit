/**
 * Logger utility for bookmark analysis operations
 * Re-exports Logger class from bookmark-export with analysis-specific instance
 */

export { type LogContext, Logger, type LoggerOptions, type LogLevel } from '../bookmark-export/logger.js';

import { Logger } from '../bookmark-export/logger.js';

/**
 * Global logger instance for analysis operations
 */
export const logger = new Logger({ logFile: 'analysis.log' });
