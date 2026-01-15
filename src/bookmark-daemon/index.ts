/**
 * Daemon/watch mode module
 * Continuous bookmark archiving with scheduling
 */

export { BookmarkDaemon } from './daemon.js';
export type {
  DaemonConfig,
  DaemonEvent,
  DaemonEventHandler,
  DaemonStatus,
} from './types.js';
