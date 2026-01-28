/**
 * Persona skill approval command
 * Approves or rejects persona skills from the review directory
 */

import type { Command } from 'commander';
import type { CliContext } from '../cli/shared.js';
import { homedir } from 'node:os';
import { SkillWriter } from '../skill-generator/index.js';
import kleur from 'kleur';

interface PersonaApproveOptions {
  target?: string;
}

interface PersonaRejectOptions {
  target?: string;
}

/**
 * Register persona-skill-approve command
 */
export function registerPersonaSkillApproveCommand(program: Command, ctx: CliContext): void {
  program
    .command('persona-skill-approve')
    .description('Approve a persona skill from review directory and move to skills directory')
    .argument('<username>', 'Twitter username (with or without @)')
    .option('--target <path>', 'Target skills directory (default: ~/.claude/skills/)', `${homedir()}/.claude/skills/`)
    .action(async (username: string, options: PersonaApproveOptions) => {
      try {
        await handlePersonaSkillApprove(username, options, ctx);
      } catch (error) {
        console.error(`\n${ctx.p('err')}Persona skill approval failed:`, error);
        process.exit(1);
      }
    });
}

/**
 * Handle persona-skill-approve command
 */
async function handlePersonaSkillApprove(
  username: string,
  options: PersonaApproveOptions,
  ctx: CliContext
): Promise<void> {
  const displayUsername = username.startsWith('@') ? username : `@${username}`;

  console.log(`\Approving Persona Skill\n`);
  console.log(`Username: ${displayUsername}`);

  // Create skill writer with target directory
  const writer = new SkillWriter({
    outputDir: options.target ?? `${homedir()}/.claude/skills/`,
  });

  // Approve the skill
  console.log('\nMoving skill from review to skills directory...');

  const result = writer.approvePersonaSkill(username);

  if (result.success) {
    console.log(`${ctx.p('ok')} Skill approved successfully!`);
    console.log(`\nLocation: ${options.target ?? `${homedir()}/.claude/skills/`}${displayUsername}-persona/SKILL.md`);
    console.log(`\nThe skill is now available in Claude Code.`);
  } else {
    console.error(`${ctx.p('err')} Approval failed: ${result.error}`);
    process.exit(1);
  }
}

/**
 * Register persona-skill-reject command
 */
export function registerPersonaSkillRejectCommand(program: Command, ctx: CliContext): void {
  program
    .command('persona-skill-reject')
    .description('Reject a persona skill from review directory (deletes it)')
    .argument('<username>', 'Twitter username (with or without @)')
    .action(async (username: string, _options: PersonaRejectOptions) => {
      try {
        await handlePersonaSkillReject(username, ctx);
      } catch (error) {
        console.error(`\n${ctx.p('err')}Persona skill rejection failed:`, error);
        process.exit(1);
      }
    });
}

/**
 * Handle persona-skill-reject command
 */
async function handlePersonaSkillReject(username: string, ctx: CliContext): Promise<void> {
  const displayUsername = username.startsWith('@') ? username : `@${username}`;

  console.log(`\nRejecting Persona Skill\n`);
  console.log(`Username: ${displayUsername}`);
  console.log(`\nThis will delete the skill from the review directory.`);

  // Create skill writer
  const writer = new SkillWriter();

  // Reject the skill
  console.log('Deleting skill from review directory...');

  const result = writer.rejectPersonaSkill(username);

  if (result.success) {
    console.log(`${ctx.p('ok')} Skill rejected successfully!`);
    console.log(`\nThe skill has been deleted from the review directory.`);
  } else {
    console.error(`${ctx.p('err')} Rejection failed: ${result.error}`);
    process.exit(1);
  }
}

/**
 * Register persona-skill-list command
 */
export function registerPersonaSkillListCommand(program: Command, ctx: CliContext): void {
  program
    .command('persona-skill-list')
    .description('List all persona skills in review and skills directories')
    .action(async () => {
      try {
        await handlePersonaSkillList(ctx);
      } catch (error) {
        console.error(`\n${ctx.p('err')}List failed:`, error);
        process.exit(1);
      }
    });
}

/**
 * Handle persona-skill-list command
 */
async function handlePersonaSkillList(ctx: CliContext): Promise<void> {
  console.log(`\nPersona Skills\n`);

  const writer = new SkillWriter();

  // List approved skills
  const approved = writer.listPersonaSkills();
  console.log(`\n${ctx.colors.section('Approved Skills')} (${approved.length}):`);
  if (approved.length === 0) {
    console.log(`  ${ctx.colors.muted('No approved skills found.')}`);
  } else {
    for (const skill of approved) {
      console.log(`  ${kleur.green('[OK]')} ${skill}`);
    }
  }

  // List review directory skills
  const reviewDir = `${homedir()}/.claude/skills-review`;
  const { existsSync, readdirSync } = await import('node:fs');
  if (existsSync(reviewDir)) {
    const items = readdirSync(reviewDir, { withFileTypes: true });
    const reviewSkills = items
      .filter((item) => item.isDirectory() && item.name.endsWith('-persona'))
      .map((item) => item.name);

    console.log(`\n${ctx.colors.section('Pending Review')} (${reviewSkills.length}):`);
    if (reviewSkills.length === 0) {
      console.log(`  ${ctx.colors.muted('No skills pending review.')}`);
    } else {
      for (const skill of reviewSkills) {
        console.log(`  ${kleur.yellow('[REVIEW]')} ${skill}`);
      }
    }
  }

  console.log('');
}
