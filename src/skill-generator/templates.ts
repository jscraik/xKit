/**
 * Skill template generator
 * Generates .skill.md files in Claude Code format
 */

import type { SkillCandidate, SkillCategory, SkillTemplate } from './types.js';

/**
 * Generate skill template from candidate
 */
export function generateSkillTemplate(candidate: SkillCandidate): SkillTemplate {
  return {
    name: candidate.name,
    description: candidate.description,
    triggers: candidate.trigger ? [candidate.trigger] : extractTriggers(candidate),
    category: candidate.category,
    content: {
      overview: generateOverview(candidate),
      whenToUse: generateWhenToUse(candidate),
      implementation: candidate.content.instructions,
      examples: candidate.content.examples,
      edgeCases: candidate.content.edgeCases,
      related: [],
    },
  };
}

/**
 * Format skill as .skill.md content
 */
export function formatSkillMarkdown(template: SkillTemplate): string {
  const lines: string[] = [];

  // Frontmatter
  lines.push('---');
  lines.push(`name: ${template.name}`);
  lines.push(`description: ${template.description}`);
  lines.push(`triggers:`);
  template.triggers.forEach((trigger) => {
    lines.push(`  - ${trigger}`);
  });
  lines.push(`category: ${template.category}`);
  lines.push('---');
  lines.push('');

  // Body
  lines.push(`# ${template.name}`);
  lines.push('');
  lines.push(template.content.overview);
  lines.push('');
  lines.push('## When to Use This Skill');
  lines.push(template.content.whenToUse);
  lines.push('');
  lines.push('## Implementation');
  lines.push(template.content.implementation);
  lines.push('');

  if (template.content.examples.length > 0) {
    lines.push('## Examples');
    template.content.examples.forEach((example, i) => {
      lines.push(`### Example ${i + 1}`);
      lines.push(example);
      lines.push('');
    });
  }

  if (template.content.edgeCases.length > 0) {
    lines.push('## Edge Cases');
    template.content.edgeCases.forEach((edgeCase) => {
      lines.push(`- ${edgeCase}`);
    });
  }

  return lines.join('\n');
}

/**
 * Extract triggers from skill candidate
 */
function extractTriggers(candidate: SkillCandidate): string[] {
  const triggers: string[] = [];

  // Extract triggers from content
  const content = candidate.content.instructions.toLowerCase();

  if (content.includes('api') || content.includes('endpoint')) {
    triggers.push('User is working with APIs or HTTP endpoints');
  }

  if (content.includes('typescript') || content.includes('type')) {
    triggers.push('User is working with TypeScript');
  }

  if (content.includes('react') || content.includes('component')) {
    triggers.push('User is building React components');
  }

  if (content.includes('test') || content.includes('spec')) {
    triggers.push('User is writing tests');
  }

  if (content.includes('async') || content.includes('await')) {
    triggers.push('User is working with asynchronous code');
  }

  if (content.includes('database') || content.includes('sql')) {
    triggers.push('User is working with databases');
  }

  if (content.includes('error') || content.includes('exception')) {
    triggers.push('User is handling errors or exceptions');
  }

  if (triggers.length === 0) {
    return ['User needs guidance on this topic'];
  }

  return triggers;
}

/**
 * Generate overview section
 */
function generateOverview(candidate: SkillCandidate): string {
  const overview: string[] = [];

  overview.push(`This skill provides guidance on **${candidate.name}**.`);

  if (candidate.source.type) {
    overview.push(``);
    overview.push(`*Extracted from: ${candidate.source.title}*`);
    overview.push(`*Source: ${candidate.source.url}*`);
  }

  overview.push(``);
  overview.push(`**Confidence:** ${(candidate.confidence * 100).toFixed(0)}%`);

  return overview.join('\n');
}

/**
 * Generate when to use section
 */
function generateWhenToUse(candidate: SkillCandidate): string {
  const useCases: string[] = [];

  useCases.push(`Use this skill when:`);

  // Generate category-specific use cases
  switch (candidate.category) {
    case 'code-pattern':
      useCases.push(
        '- You need to implement this specific code pattern',
        '- You want to understand the best practices for this pattern',
        '- You are looking for examples of how to apply this pattern'
      );
      break;

    case 'best-practice':
      useCases.push(
        '- You want to follow established best practices',
        '- You are implementing a feature and want to ensure quality',
        '- You are reviewing code for adherence to standards'
      );
      break;

    case 'workflow':
      useCases.push(
        '- You need to follow this development workflow',
        '- You want to optimize your development process',
        '- You are setting up a new project or team'
      );
      break;

    default:
      useCases.push(
        '- You need guidance on this topic',
        '- You want to follow proven approaches',
        '- You are looking for best practices in this area'
      );
      break;
  }

  return useCases.join('\n');
}

/**
 * Validate skill template
 */
export function validateSkillTemplate(template: SkillTemplate): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  // Check required fields
  if (!template.name || template.name.trim().length === 0) {
    errors.push('Skill name is required');
  }

  if (!template.description || template.description.trim().length === 0) {
    errors.push('Skill description is required');
  }

  if (!template.triggers || template.triggers.length === 0) {
    errors.push('At least one trigger is required');
  }

  if (!template.category) {
    errors.push('Skill category is required');
  }

  // Check content sections
  if (!template.content.overview || template.content.overview.trim().length === 0) {
    errors.push('Overview section is required');
  }

  if (!template.content.whenToUse || template.content.whenToUse.trim().length === 0) {
    errors.push('When to use section is required');
  }

  if (!template.content.implementation || template.content.implementation.trim().length === 0) {
    errors.push('Implementation section is required');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
