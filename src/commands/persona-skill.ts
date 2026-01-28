/**
 * Persona skill command
 * Generates Claude Code skills from persona JSON files
 */

import type { Command } from 'commander';
import type { CliContext } from '../cli/shared.js';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { homedir } from 'node:os';
import type { PersonaResult } from '../persona-extraction/index.js';
import { SkillWriter } from '../skill-generator/index.js';

interface PersonaSkillOptions {
  source?: string;
  target?: string;
  category?: string;
  autoApprove?: boolean;
}

/**
 * Register persona-skill command
 */
export function registerPersonaSkillCommand(program: Command, ctx: CliContext): void {
  program
    .command('persona-skill')
    .description('Generate Claude Code skills from persona JSON file')
    .argument('<username>', 'Twitter username (with or without @)')
    .option('--source <path>', 'Path to persona JSON file (default: ./persona.json)')
    .option('--target <path>', 'Target skills directory (default: ~/.claude/skills/)', `${homedir()}/.claude/skills/`)
    .option('--category <name>', 'Skill category for organization')
    .option('--auto-approve', 'Write skill directly without review')
    .action(async (username: string, options: PersonaSkillOptions) => {
      try {
        await handlePersonaSkill(username, options, ctx);
      } catch (error) {
        console.error(`\n${ctx.p('err')}Persona skill generation failed:`, error);
        process.exit(1);
      }
    });
}

/**
 * Handle persona-skill command
 */
async function handlePersonaSkill(username: string, options: PersonaSkillOptions, ctx: CliContext): Promise<void> {
  // Normalize username (remove @ if present for consistency, but keep for display)
  const normalizedUsername = username.startsWith('@') ? username.slice(1) : username;
  const displayUsername = username.startsWith('@') ? username : `@${username}`;

  console.log(`🤖 xKit Persona Skill Generator\n`);
  console.log(`📋 Username: ${displayUsername}`);

  // Resolve source file path
  const sourcePath = options.source ?? resolve(process.cwd(), 'persona.json');
  const resolvedSourcePath = resolve(sourcePath);

  console.log(`📄 Source: ${resolvedSourcePath}`);

  // Read persona JSON file
  let persona: PersonaResult;
  try {
    const rawContent = readFileSync(resolvedSourcePath, 'utf8');
    persona = JSON.parse(rawContent) as PersonaResult;
  } catch (error) {
    console.error(`\n${ctx.p('err')}Failed to read persona JSON file: ${error instanceof Error ? error.message : String(error)}`);
    console.error(`\nExpected JSON format with PersonaResult structure (username, analyzedAt, persona).`);
    process.exit(1);
  }

  // Validate persona structure
  if (!persona.username || !persona.persona) {
    console.error(`\n${ctx.p('err')}Invalid persona JSON: missing required fields (username, persona).`);
    process.exit(1);
  }

  // Verify username matches (if provided in JSON)
  if (persona.username.toLowerCase() !== normalizedUsername.toLowerCase()) {
    console.warn(`\n${ctx.p('warn')}Username mismatch: CLI argument '${displayUsername}' vs JSON '@${persona.username}'`);
    console.warn(`   Using username from JSON file: @${persona.username}`);
  }

  console.log(`✅ Persona loaded for @${persona.username}`);
  console.log(`   Analyzed: ${persona.analyzedAt}`);
  console.log(`   Communication: ${persona.persona.structured.communicationStyle}`);
  console.log(`   Expertise: ${persona.persona.structured.expertise.slice(0, 3).join(', ')}`);

  // Resolve target directory
  const targetDir = resolve(options.target ?? `${homedir()}/.claude/skills/`);
  console.log(`\n📁 Target: ${targetDir}`);

  // Create skill writer
  const writer = new SkillWriter({
    outputDir: targetDir,
    autoApprove: options.autoApprove ?? false,
  });

  // Generate skill from persona
  console.log('\n✍️  Generating skill...');

  const result = await writer.writePersonaSkill(persona, targetDir);

  // Display results
  if (result.written.length > 0) {
    console.log(`   ✅ Skill written to: ${result.written[0]}`);
    console.log(`\n   Skill is now available in Claude Code!`);
  }

  if (result.review.length > 0) {
    console.log(`   ⏳ Skill pending review: ${result.review[0]}`);
    console.log(`\n   Review the skill and approve it:`);
    console.log(`     xkit persona-skill-approve @${persona.username}`);
  }

  if (result.errors.length > 0) {
    console.log(`   ❌ Errors:`);
    for (const error of result.errors) {
      console.log(`      - ${error.skill}: ${error.error}`);
    }
  }

  console.log('');
  console.log('Next steps:');
  if (result.review.length > 0) {
    console.log(`   1. Review skill in ~/.claude/skills-review/@${persona.username}-persona/`);
    console.log(`   2. Approve: xkit persona-skill-approve @${persona.username}`);
    console.log(`   3. Reject: xkit persona-skill-reject @${persona.username}`);
  } else {
    console.log('   Skill is available in Claude Code!');
  }
}
