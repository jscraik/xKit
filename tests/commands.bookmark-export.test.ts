import { Command } from 'commander';
import { describe, expect, it } from 'vitest';
import type { CliContext } from '../src/cli/shared.js';
import { registerBookmarkExportCommand } from '../src/commands/bookmark-export.js';

describe('export-bookmarks command', () => {
  it('registers the export-bookmarks command', () => {
    const program = new Command();
    const ctx = {} as unknown as CliContext;

    registerBookmarkExportCommand(program, ctx);

    const command = program.commands.find((cmd) => cmd.name() === 'export-bookmarks');
    expect(command).toBeDefined();
    expect(command?.description()).toBe('Export X bookmarks to JSON file');
  });

  it('has the expected options', () => {
    const program = new Command();
    const ctx = {} as unknown as CliContext;

    registerBookmarkExportCommand(program, ctx);

    const command = program.commands.find((cmd) => cmd.name() === 'export-bookmarks');
    expect(command).toBeDefined();

    const options = command?.options || [];
    const optionNames = options.map((opt) => opt.long);

    expect(optionNames).toContain('--resume');
    expect(optionNames).toContain('--output-dir');
    expect(optionNames).toContain('--config');
  });
});
