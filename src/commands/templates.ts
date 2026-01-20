/**
 * Template management commands
 *
 * Provides commands for listing and validating custom summarization templates.
 * Templates are stored in ~/.xkit/templates/ with YAML frontmatter.
 *
 * Phase 4.4: Optional CLI enhancements
 */

import type { Command } from 'commander';
import type { CliContext } from '../cli/shared.js';
import { CustomTemplateManager, InvalidYAMLError, TemplateNotFoundError } from '../bookmark-prompts/custom-templates.js';

/**
 * Register the template command and its subcommands
 */
export function registerTemplateCommands(program: Command, ctx: CliContext): void {
  const templateCmd = program
    .command('template')
    .description('Manage custom summarization templates');

  // Register subcommands
  registerListCommand(templateCmd, ctx);
  registerShowCommand(templateCmd, ctx);
  registerValidateCommand(templateCmd, ctx);
}

/**
 * List available templates
 */
function registerListCommand(program: Command, ctx: CliContext): void {
  program
    .command('list')
    .description('List all available custom templates')
    .action(async () => {
      try {
        const manager = new CustomTemplateManager();
        const templates = manager.listTemplates();

        if (templates.length === 0) {
          console.log(`No templates found in ${manager.getTemplateDir()}`);
          console.log('\nCreate templates at ~/.xkit/templates/ or set templateDir in config.');
          return;
        }

        console.log(`Available templates (${templates.length}):\n`);

        for (const template of templates) {
          const category = template.frontmatter.category
            ? `${ctx.colors.muted(`[${template.frontmatter.category}]`)} `
            : '';

          console.log(`${ctx.colors.command(template.frontmatter.name)} ${category}${ctx.colors.subtitle(template.frontmatter.description)}`);

          if (template.frontmatter.variables) {
            const vars = Object.keys(template.frontmatter.variables).map(v => `${ctx.colors.option(v)}="${template.frontmatter.variables![v]}"`).join(' ');
            console.log(`  Variables: ${vars}`);
          }
        }
      } catch (error) {
        console.error(`\n${ctx.p('err')}Failed to list templates:`, error);
        process.exit(1);
      }
    });
}

/**
 * Show template details
 */
function registerShowCommand(program: Command, ctx: CliContext): void {
  program
    .command('show')
    .description('Show template details and content')
    .argument('<name>', 'Template name')
    .action(async (name: string) => {
      try {
        const manager = new CustomTemplateManager();
        const template = manager.loadTemplate(name);

        if (!template) {
          console.error(`${ctx.p('err')}Template not found: ${name}`);
          console.log(`\nAvailable templates:`);
          const templates = manager.listTemplates();
          if (templates.length === 0) {
            console.log('  (none)');
          } else {
            for (const t of templates) {
              console.log(`  - ${t.frontmatter.name}: ${t.frontmatter.description}`);
            }
          }
          console.log(`\nUse ${ctx.colors.command('xkit template list')} to see all templates.`);
          process.exit(1);
        }

        const fm = template.frontmatter;

        // Display frontmatter
        console.log(`${ctx.colors.section('Template')}: ${ctx.colors.command(fm.name)}`);
        console.log(`${ctx.colors.section('Description')}: ${fm.description}`);

        if (fm.category) {
          console.log(`${ctx.colors.section('Category')}: ${fm.category}`);
        }

        if (fm.variables && Object.keys(fm.variables).length > 0) {
          console.log(`\n${ctx.colors.section('Variables')}:`);
          for (const [key, value] of Object.entries(fm.variables)) {
            console.log(`  ${ctx.colors.option(key)} = "${value}"`);
          }
        }

        console.log(`\n${ctx.colors.section('Path')}: ${template.path}`);

        // Display template content
        console.log(`\n${ctx.colors.section('─'.repeat(50))}`);
        console.log(`\n${ctx.colors.section('Template Content')}:`);
        console.log(`${ctx.colors.section('─'.repeat(50))}\n`);
        console.log(template.content);
        console.log(`\n${ctx.colors.section('─'.repeat(50))}\n`);

        // Show usage example
        if (fm.variables && Object.keys(fm.variables).length > 0) {
          const varFlags = Object.entries(fm.variables)
            .map(([k, v]) => `--var ${k}="${v}"`)
            .join(' ');
          console.log(`${ctx.colors.muted('Usage example:')}`);
          console.log(`  xkit archive --summarize --template ${fm.name} ${varFlags} -n 10`);
          console.log(`  xkit summarize <url> --template ${fm.name} ${varFlags}`);
        } else {
          console.log(`${ctx.colors.muted('Usage example:')}`);
          console.log(`  xkit archive --summarize --template ${fm.name} -n 10`);
          console.log(`  xkit summarize <url> --template ${fm.name}`);
        }

        // Validate and show status
        const validation = manager.validateTemplate(template.content);
        if (validation.valid) {
          console.log(`\n${ctx.p('ok')}✅ Template is valid`);
        } else {
          console.log(`\n${ctx.p('warn')}⚠️ Template has validation issues:`);
          for (const error of validation.errors) {
            console.log(`  ${ctx.p('warn')}• ${error}`);
          }
        }
      } catch (error) {
        console.error(`\n${ctx.p('err')}Failed to show template:`, error);
        process.exit(1);
      }
    });
}

/**
 * Validate a template
 */
function registerValidateCommand(program: Command, ctx: CliContext): void {
  program
    .command('validate [name]')
    .description('Validate a custom template')
    .argument('[name]', 'Template name (validates all if not specified)')
    .action(async (name: string | undefined) => {
      try {
        const manager = new CustomTemplateManager();

        if (!name) {
          // Validate all templates
          await validateAllTemplates(manager, ctx);
          return;
        }

        // Validate specific template
        await validateSingleTemplate(manager, name, ctx);
      } catch (error) {
        console.error(`\n${ctx.p('err')}Validation failed:`, error);
        process.exit(1);
      }
    });
}

/**
 * Validate a single template
 */
async function validateSingleTemplate(
  manager: CustomTemplateManager,
  name: string,
  ctx: CliContext
): Promise<void> {
  const template = manager.loadTemplate(name);

  if (!template) {
    console.error(`${ctx.p('err')}Template not found: ${name}`);
    console.log(`\nAvailable templates:`);
    const templates = manager.listTemplates();
    if (templates.length === 0) {
      console.log('  (none)');
    } else {
      for (const t of templates) {
        console.log(`  - ${t.frontmatter.name}: ${t.frontmatter.description}`);
      }
    }
    throw new TemplateNotFoundError(name);
  }

  // Validate template content against security schema
  const validation = manager.validateTemplate(template.content);

  console.log(`Template: ${ctx.colors.command(name)}`);
  console.log(`Path: ${template.path}`);
  console.log(`Description: ${template.frontmatter.description}`);

  if (validation.valid) {
    console.log(`\n${ctx.p('ok')}✅ Template is valid`);
  } else {
    console.log(`\n${ctx.p('err')}❌ Template validation failed:\n`);

    for (const error of validation.errors) {
      console.error(`  ${ctx.p('err')}• ${error}`);
    }

    throw new Error('Template validation failed');
  }
}

/**
 * Validate all templates in the template directory
 */
async function validateAllTemplates(manager: CustomTemplateManager, ctx: CliContext): Promise<void> {
  const templates = manager.listTemplates();

  if (templates.length === 0) {
    console.log(`No templates found in ${manager.getTemplateDir()}`);
    return;
  }

  console.log(`Validating ${templates.length} template(s)...\n`);

  let validCount = 0;
  let invalidCount = 0;
  const errors: Record<string, string[]> = {};

  for (const template of templates) {
    const validation = manager.validateTemplate(template.content);

    if (validation.valid) {
      console.log(`${ctx.p('ok')}✓ ${ctx.colors.command(template.frontmatter.name)}: ${template.frontmatter.description}`);
      validCount++;
    } else {
      console.log(`${ctx.p('err')}✗ ${ctx.colors.command(template.frontmatter.name)}: ${validation.errors.length} error(s)`);
      errors[template.frontmatter.name] = validation.errors;
      invalidCount++;
    }
  }

  console.log(`\nSummary: ${validCount} valid, ${invalidCount} invalid`);

  if (invalidCount > 0) {
    console.log('\nErrors:');
    for (const [name, templateErrors] of Object.entries(errors)) {
      console.log(`\n${ctx.colors.command(name)}:`);
      for (const error of templateErrors) {
        console.log(`  ${ctx.p('err')}• ${error}`);
      }
    }

    throw new Error(`${invalidCount} template(s) failed validation`);
  }
}
