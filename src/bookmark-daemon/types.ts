/**
 * Types for daemon/watch mode
 */

export interface DaemonConfig {
  interval: number; // milliseconds
  enabled: boolean;
  runOnStart: boolean;
  maxRetries: number;
  retryDelay: number;
}

export interface DaemonStatus {
  running: boolean;
  lastRun?: string;
  nextRun?: string;
  runCount: number;
  errorCount: number;
  lastError?: string;
}

export type DaemonEvent = 'start' | 'stop' | 'run' | 'error' | 'success';

export type DaemonEventHandler = (event: DaemonEvent, data?: unknown) => void | Promise<void>;
