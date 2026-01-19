/**
 * Metrics command for displaying CLI usage metrics
 */

import type { CliContext } from '../cli/shared.js';
import type { Command } from 'commander';
import { metrics } from '../metrics/metrics-collector.js';

export function registerMetricsCommand(program: Command, ctx: CliContext): void {
    if (!metrics) {
        // Metrics disabled via environment variable
        return;
    }

    const metricsCmd = program
        .command('metrics')
        .description('Show usage metrics (stored locally, no network transmission)')
        .option('--json', 'Output as JSON')
        .action((options) => {
            const summary = metrics!.getSummary();

            if (options.json) {
                console.log(JSON.stringify(summary, null, 2));
            } else {
                console.log(ctx.colors.section('xKit Usage Metrics'));
                console.log(ctx.colors.muted('────────────────────'));
                console.log(`Total Commands: ${summary.totalCommands}`);
                console.log(
                    `Success Rate: ${ctx.colors.accent(
                        `${((summary.successCount / summary.totalCommands) * 100).toFixed(1)}%`
                    )}`
                );
                console.log(`Average Duration: ${summary.averageDuration.toFixed(0)}ms`);

                if (Object.keys(summary.commandsByType).length > 0) {
                    console.log('\n' + ctx.colors.section('Commands by Type:'));
                    for (const [cmd, count] of Object.entries(summary.commandsByType)) {
                        console.log(`  ${ctx.colors.command(cmd)}: ${count}`);
                    }
                }

                if (Object.keys(summary.errorsByType).length > 0) {
                    console.log('\n' + ctx.colors.section('Errors by Type:'));
                    for (const [error, count] of Object.entries(summary.errorsByType)) {
                        console.log(`  ${ctx.colors.muted(String(count))} ${ctx.colors.muted(error)}`);
                    }
                }

                console.log('');
                console.log(ctx.colors.muted('Metrics stored locally at: ~/.xkit/metrics.json'));
                console.log(ctx.colors.muted('Disable: XKIT_METRICS_ENABLED=0'));
            }
        });

    metricsCmd
        .command('clear')
        .description('Clear all metrics')
        .action(() => {
            metrics!.clear();
            console.log(ctx.colors.accent('Metrics cleared.'));
        });

    metricsCmd
        .command('recent')
        .description('Show recent command history')
        .argument('[count]', 'Number of recent entries', '10')
        .action((countStr) => {
            const count = parseInt(countStr, 10);
            const recent = metrics!.getRecent(count);

            console.log(ctx.colors.section(`Recent ${recent.length} Commands:`));
            console.log(ctx.colors.muted('────────────────────'));

            for (const metric of recent.reverse()) {
                const status = metric.success
                    ? ctx.colors.accent('✓')
                    : ctx.colors.muted('✗');
                const durationStr = `${metric.duration}ms`;
                const dateStr = new Date(metric.timestamp).toLocaleString();

                console.log(
                    `${status} ${ctx.colors.command(metric.command)} ${ctx.colors.muted(`(${durationStr}) - ${dateStr}`)}`
                );

                if (metric.error) {
                    console.log(`    ${ctx.colors.muted(metric.error)}`);
                }
            }
        });
}
