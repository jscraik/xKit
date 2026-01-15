/**
 * Setup wizard command
 */

import type { Command } from 'commander';
import type { CliContext } from '../cli/shared.js';
import { SetupWizard } from '../setup-wizard/index.js';

/**
 * Register the setup command
 */
export function registerSetupCommand(program: Command, ctx: CliContext): void {
  program
    .command('setup')
    .description('Interactive setup wizard for first-time configuration')
    .action(async () => {
      try {
        const wizard = new SetupWizard();
        await wizard.run();
      } catch (error) {
        console.error(`\n${ctx.p('err')}Setup failed:`, error);
        process.exit(1);
      }
    });
}
