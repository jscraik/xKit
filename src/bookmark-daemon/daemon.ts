/**
 * Daemon/watch mode for continuous bookmark archiving
 */

import type { DaemonConfig, DaemonEventHandler, DaemonStatus } from './types.js';

// Logger will be imported from a shared utilities module
// Using a placeholder that should be replaced with the actual logger import
// For example: import logger from '../utils/logger.js';
const logger = {
  info: (meta: Record<string, unknown>, msg: string) => {
    console.log(JSON.stringify({ ...meta, level: 'info', message: msg }));
  },
  error: (meta: Record<string, unknown>, msg: string) => {
    console.error(JSON.stringify({ ...meta, level: 'error', message: msg }));
  },
};

export class BookmarkDaemon {
  private config: DaemonConfig;
  private status: DaemonStatus;
  private intervalId?: NodeJS.Timeout;
  private eventHandlers: DaemonEventHandler[] = [];
  private runTask?: () => Promise<void>;

  constructor(config: Partial<DaemonConfig> = {}) {
    this.config = {
      interval: config.interval ?? 30 * 60 * 1000, // 30 minutes default
      enabled: config.enabled ?? true,
      runOnStart: config.runOnStart ?? false,
      maxRetries: config.maxRetries ?? 3,
      retryDelay: config.retryDelay ?? 5000,
    };

    this.status = {
      running: false,
      runCount: 0,
      errorCount: 0,
    };
  }

  /**
   * Set the task to run
   */
  setTask(task: () => Promise<void>): void {
    this.runTask = task;
  }

  /**
   * Add event handler
   */
  on(handler: DaemonEventHandler): void {
    this.eventHandlers.push(handler);
  }

  /**
   * Emit event
   */
  private async emit(event: 'start' | 'stop' | 'run' | 'error' | 'success', data?: unknown): Promise<void> {
    for (const handler of this.eventHandlers) {
      try {
        await handler(event, data);
      } catch (error) {
        console.error('Event handler error:', error);
      }
    }
  }

  /**
   * Start daemon
   */
  async start(): Promise<void> {
    if (this.status.running) {
      logger.info({
        event: 'daemon_already_running',
      }, 'Daemon already running');
      return;
    }

    if (!this.runTask) {
      throw new Error('No task set. Call setTask() first.');
    }

    this.status.running = true;
    await this.emit('start');

    const formattedInterval = this.formatInterval(this.config.interval);
    logger.info({
      event: 'daemon_started',
      interval: this.config.interval,
      formattedInterval,
      runOnStart: this.config.runOnStart,
    }, `Daemon started (interval: ${formattedInterval})`);

    // Run immediately if configured
    if (this.config.runOnStart) {
      await this.runOnce();
    }

    // Schedule periodic runs
    this.intervalId = setInterval(() => {
      this.runOnce().catch((error) => {
        const errorMessage = error instanceof Error ? error.message : String(error);
        logger.error({
          event: 'daemon_scheduled_run_failed',
          error: errorMessage,
        }, 'Scheduled run failed');
      });
    }, this.config.interval);

    // Calculate next run
    this.updateNextRun();
  }

  /**
   * Stop daemon
   */
  async stop(): Promise<void> {
    if (!this.status.running) {
      logger.info({
        event: 'daemon_not_running',
      }, 'Daemon not running');
      return;
    }

    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = undefined;
    }

    this.status.running = false;
    this.status.nextRun = undefined;
    await this.emit('stop');

    logger.info({
      event: 'daemon_stopped',
    }, 'Daemon stopped');
  }

  /**
   * Run task once
   */
  async runOnce(): Promise<void> {
    if (!this.runTask) {
      throw new Error('No task set');
    }

    await this.emit('run');

    let retries = 0;
    let success = false;

    while (retries <= this.config.maxRetries && !success) {
      try {
        await this.runTask();

        this.status.runCount++;
        this.status.lastRun = new Date().toISOString();
        this.updateNextRun();

        await this.emit('success');
        success = true;
      } catch (error) {
        retries++;
        this.status.errorCount++;
        this.status.lastError = error instanceof Error ? error.message : String(error);

        await this.emit('error', error);

        if (retries <= this.config.maxRetries) {
          logger.info({
            event: 'daemon_retry_attempt',
            attempt: retries,
            maxRetries: this.config.maxRetries,
            retryDelay: this.config.retryDelay,
          }, `Retry ${retries}/${this.config.maxRetries} in ${this.config.retryDelay}ms...`);
          await this.sleep(this.config.retryDelay);
        } else {
          const errorMessage = error instanceof Error ? error.message : String(error);
          logger.error({
            event: 'daemon_max_retries_reached',
            retries,
            maxRetries: this.config.maxRetries,
            lastError: errorMessage,
          }, 'Max retries reached');
          throw error;
        }
      }
    }
  }

  /**
   * Get daemon status
   */
  getStatus(): DaemonStatus {
    return { ...this.status };
  }

  /**
   * Update next run time
   */
  private updateNextRun(): void {
    if (this.status.running) {
      const nextRun = new Date(Date.now() + this.config.interval);
      this.status.nextRun = nextRun.toISOString();
    }
  }

  /**
   * Format interval for display
   */
  private formatInterval(ms: number): string {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    if (hours > 0) {
      return `${hours}h`;
    }
    if (minutes > 0) {
      return `${minutes}m`;
    }
    return `${seconds}s`;
  }

  /**
   * Sleep helper
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Format status for display
   */
  formatStatus(): string {
    const lines = [
      '🤖 Daemon Status',
      '─────────────────',
      `Status: ${this.status.running ? '🟢 Running' : '🔴 Stopped'}`,
      `Interval: ${this.formatInterval(this.config.interval)}`,
      `Run Count: ${this.status.runCount}`,
      `Error Count: ${this.status.errorCount}`,
    ];

    if (this.status.lastRun) {
      const lastRun = new Date(this.status.lastRun);
      lines.push(`Last Run: ${lastRun.toLocaleString()}`);
    }

    if (this.status.nextRun && this.status.running) {
      const nextRun = new Date(this.status.nextRun);
      lines.push(`Next Run: ${nextRun.toLocaleString()}`);
    }

    if (this.status.lastError) {
      lines.push('', `Last Error: ${this.status.lastError}`);
    }

    return lines.join('\n');
  }
}
