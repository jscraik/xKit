/**
 * Daemon mode commands for continuous bookmark archiving
 */

import { execSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import type { Command } from 'commander';
import { BookmarkDaemon } from '../bookmark-daemon/index.js';
import type { CliContext } from '../cli/shared.js';

const DAEMON_STATE_FILE = '.xkit/daemon-state.json';

interface DaemonState {
  running: boolean;
  pid?: number;
  startedAt?: string;
  config?: {
    interval: number;
    command: string;
  };
}

/**
 * Start daemon
 */
async function startDaemon(
  options: {
    interval?: string;
    runNow?: boolean;
  },
  ctx: CliContext,
): Promise<void> {
  // Parse interval
  const intervalMs = options.interval ? parseInterval(options.interval) : 30 * 60 * 1000;

  console.log('🚀 Starting xKit daemon...\n');
  console.log(`Interval: ${formatInterval(intervalMs)}`);
  console.log(`Run on start: ${options.runNow ? 'yes' : 'no'}\n`);

  const daemon = new BookmarkDaemon({
    interval: intervalMs,
    runOnStart: options.runNow || false,
  });

  // Set up the archive task
  daemon.setTask(async () => {
    console.log('\n🔄 Running scheduled archive...');

    // Execute the archive command
    try {
      execSync('xkit archive', {
        stdio: 'inherit',
        cwd: process.cwd(),
      });
    } catch (error) {
      console.error('Archive failed:', error);
      throw error;
    }
  });

  // Set up event handlers
  daemon.on(async (event, data) => {
    switch (event) {
      case 'start':
        console.log('✅ Daemon started');
        saveDaemonState({
          running: true,
          pid: process.pid,
          startedAt: new Date().toISOString(),
          config: {
            interval: intervalMs,
            command: 'xkit archive',
          },
        });
        break;
      case 'run':
        console.log(`\n⏰ ${new Date().toLocaleString()}`);
        break;
      case 'success':
        console.log('✅ Archive completed');
        break;
      case 'error':
        console.error('❌ Archive failed:', data);
        break;
    }
  });

  // Start the daemon
  await daemon.start();

  // Keep process alive
  console.log('\n📡 Daemon running. Press Ctrl+C to stop.\n');

  // Handle graceful shutdown
  process.on('SIGINT', async () => {
    console.log('\n\n🛑 Stopping daemon...');
    await daemon.stop();
    saveDaemonState({ running: false });
    console.log('✅ Daemon stopped');
    process.exit(0);
  });

  process.on('SIGTERM', async () => {
    await daemon.stop();
    saveDaemonState({ running: false });
    process.exit(0);
  });
}

/**
 * Stop daemon
 */
async function stopDaemon(ctx: CliContext): Promise<void> {
  const state = loadDaemonState();

  if (!state.running) {
    console.log('Daemon is not running');
    return;
  }

  if (state.pid) {
    try {
      process.kill(state.pid, 'SIGTERM');
      console.log('✅ Daemon stopped');
      saveDaemonState({ running: false });
    } catch (error) {
      console.error('Failed to stop daemon:', error);
      console.log('Daemon may have already stopped');
      saveDaemonState({ running: false });
    }
  } else {
    console.log('No PID found. Daemon may have already stopped.');
    saveDaemonState({ running: false });
  }
}

/**
 * Show daemon status
 */
async function daemonStatus(ctx: CliContext): Promise<void> {
  const state = loadDaemonState();

  console.log('🤖 Daemon Status');
  console.log('─────────────────');
  console.log(`Status: ${state.running ? '🟢 Running' : '🔴 Stopped'}`);

  if (state.running && state.config) {
    console.log(`Interval: ${formatInterval(state.config.interval)}`);
    console.log(`Command: ${state.config.command}`);

    if (state.startedAt) {
      const startedAt = new Date(state.startedAt);
      console.log(`Started: ${startedAt.toLocaleString()}`);

      const nextRun = new Date(startedAt.getTime() + state.config.interval);
      console.log(`Next run: ${nextRun.toLocaleString()}`);
    }

    if (state.pid) {
      console.log(`PID: ${state.pid}`);
    }
  }
}

/**
 * Parse interval string to milliseconds
 */
function parseInterval(interval: string): number {
  const match = interval.match(/^(\d+)([smh])$/);

  if (!match) {
    throw new Error('Invalid interval format. Use: 30s, 5m, 1h');
  }

  const value = parseInt(match[1], 10);
  const unit = match[2];

  switch (unit) {
    case 's':
      return value * 1000;
    case 'm':
      return value * 60 * 1000;
    case 'h':
      return value * 60 * 60 * 1000;
    default:
      throw new Error('Invalid interval unit');
  }
}

/**
 * Format interval for display
 */
function formatInterval(ms: number): string {
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
 * Load daemon state
 */
function loadDaemonState(): DaemonState {
  if (!existsSync(DAEMON_STATE_FILE)) {
    return { running: false };
  }

  try {
    return JSON.parse(readFileSync(DAEMON_STATE_FILE, 'utf-8'));
  } catch {
    return { running: false };
  }
}

/**
 * Save daemon state
 */
function saveDaemonState(state: DaemonState): void {
  writeFileSync(DAEMON_STATE_FILE, JSON.stringify(state, null, 2));
}

/**
 * Register daemon commands
 */
export function registerDaemonCommands(program: Command, ctx: CliContext): void {
  const daemon = program.command('daemon').description('Daemon mode for continuous bookmark archiving');

  daemon
    .command('start')
    .description('Start the daemon')
    .option('--interval <time>', 'Run interval (e.g., 30m, 1h, 2h)', '30m')
    .option('--run-now', 'Run immediately on start')
    .action(async (options) => {
      try {
        await startDaemon(options, ctx);
      } catch (error) {
        console.error(`\n${ctx.p('err')}Failed to start daemon:`, error);
        process.exit(1);
      }
    });

  daemon
    .command('stop')
    .description('Stop the daemon')
    .action(async () => {
      try {
        await stopDaemon(ctx);
      } catch (error) {
        console.error(`\n${ctx.p('err')}Failed to stop daemon:`, error);
        process.exit(1);
      }
    });

  daemon
    .command('status')
    .description('Show daemon status')
    .action(async () => {
      try {
        await daemonStatus(ctx);
      } catch (error) {
        console.error(`\n${ctx.p('err')}Failed to get status:`, error);
        process.exit(1);
      }
    });
}
