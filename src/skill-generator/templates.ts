/**
 * Skill template generator
 * Generates .skill.md files in Claude Code format
 */

import type { SkillCandidate, SkillCategory, SkillTemplate } from './types.js';
import type { PersonaResult } from '../persona-extraction/types.js';

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

/**
 * Persona skill template for emulating Twitter personas
 * Converts PersonaResult into AI system instructions
 */
export interface PersonaSkillTemplate {
  name: string;
  description: string;
  triggers: string[];
  category: 'persona';
  content: {
    overview: string;
    whenToUse: string;
    implementation: string;
    examples: string[];
    edgeCases: string[];
    related: string[];
  };
}

/**
 * Generate persona skill template from PersonaResult
 * Creates a skill that allows AI to emulate a specific Twitter persona
 */
export function generatePersonaSkillTemplate(persona: PersonaResult): PersonaSkillTemplate {
  const { username, persona: data } = persona;
  const { structured, narrative, instructions } = data;

  return {
    name: `@${username}-persona`,
    description: `Think and work like @${username} based on analysis of their Twitter content`,
    triggers: generatePersonaTriggers(username, structured),
    category: 'persona',
    content: {
      overview: generatePersonaOverview(username, narrative, structured),
      whenToUse: generatePersonaWhenToUse(username, structured),
      implementation: generatePersonaCommunicationStyle(structured, instructions),
      examples: generatePersonaPrinciples(structured),
      edgeCases: generatePersonaEdgeCases(structured),
      related: [],
    },
  };
}

/**
 * Format persona skill as SKILL.md content
 */
export function formatPersonaSkillMarkdown(template: PersonaSkillTemplate): string {
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

  // Extract username from name (remove @ and -persona suffix)
  const username = template.name.replace('@', '').replace('-persona', '');

  // Body
  lines.push(`# @${username} Persona`);
  lines.push('');
  lines.push('## When to Use This Skill');
  lines.push(template.content.whenToUse);
  lines.push('');
  lines.push('## How This Person Thinks');
  lines.push(template.content.overview);
  lines.push('');
  lines.push('## Communication Style');
  lines.push(template.content.implementation);
  lines.push('');

  if (template.content.examples.length > 0) {
    lines.push('## Key Principles');
    template.content.examples.forEach((principle, i) => {
      if (principle.trim()) {
        lines.push(`${i + 1}. ${principle}`);
      }
    });
    lines.push('');
  }

  if (template.content.edgeCases.length > 0) {
    lines.push('## Edge Cases');
    lines.push('');
    lines.push('When this persona does not apply:');
    template.content.edgeCases.forEach((edgeCase) => {
      lines.push(`- ${edgeCase}`);
    });
  }

  return lines.join('\n');
}

/**
 * Validate persona skill template
 */
export function validatePersonaSkillTemplate(template: PersonaSkillTemplate): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (!template.name || template.name.trim().length === 0) {
    errors.push('Skill name is required');
  }

  if (!template.description || template.description.trim().length === 0) {
    errors.push('Description is required');
  }

  if (!template.triggers || template.triggers.length === 0) {
    errors.push('At least one trigger is required');
  }

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

/**
 * Generate triggers for persona skill
 */
function generatePersonaTriggers(username: string, structured: PersonaResult['persona']['structured']): string[] {
  const triggers: string[] = [];

  // Main trigger
  triggers.push(`User asks "How would @${username} approach..."`);

  // Communication style trigger
  triggers.push(`User wants responses in ${structured.communicationStyle} style`);

  // Expertise triggers
  if (structured.expertise.length > 0) {
    const topExpertise = structured.expertise.slice(0, 3);
    triggers.push(`User asks about ${topExpertise.join(', ')}`);
  }

  // Topic cluster triggers
  if (structured.topicClusters.length > 0) {
    const topTopics = structured.topicClusters.slice(0, 2);
    triggers.push(`User discusses ${topTopics.join(' or ')}`);
  }

  return triggers;
}

/**
 * Generate overview for persona skill
 */
function generatePersonaOverview(
  username: string,
  narrative: string,
  structured: PersonaResult['persona']['structured']
): string {
  const lines: string[] = [];

  lines.push(narrative);
  lines.push('');
  lines.push('**Key Attributes:**');
  lines.push(`- Communication Style: ${structured.communicationStyle}`);
  lines.push(`- Technical Level: ${(structured.technicalLevel * 100).toFixed(0)}%`);
  lines.push(`- Areas of Expertise: ${structured.expertise.join(', ')}`);
  lines.push(`- Core Values: ${structured.values.join(', ')}`);
  lines.push(`- Topic Focus: ${structured.topicClusters.join(', ')}`);

  return lines.join('\n');
}

/**
 * Generate when to use section for persona skill
 */
function generatePersonaWhenToUse(username: string, structured: PersonaResult['persona']['structured']): string {
  const useCases: string[] = [];

  useCases.push(`Use this skill when:`);
  useCases.push(`- You want to approach a problem the way @${username} would`);
  useCases.push(`- You need inspiration from @${username}'s perspective`);
  useCases.push(`- You are working in areas where @${username} has expertise`);

  // Add topic-specific use cases
  if (structured.topicClusters.length > 0) {
    const topics = structured.topicClusters.slice(0, 2);
    useCases.push(`- You are dealing with ${topics.join(' or ')} questions`);
  }

  return useCases.join('\n');
}

/**
 * Generate communication style section for persona skill
 */
function generatePersonaCommunicationStyle(
  structured: PersonaResult['persona']['structured'],
  instructions: string
): string {
  const style: string[] = [];

  // Add tone markers
  if (structured.toneMarkers.length > 0) {
    style.push('**Tone:**');
    structured.toneMarkers.forEach((marker) => {
      style.push(`- ${marker}`);
    });
    style.push('');
  }

  // Add communication patterns from instructions
  style.push(instructions);

  return style.join('\n');
}

/**
 * Generate principles for persona skill (from values)
 */
function generatePersonaPrinciples(structured: PersonaResult['persona']['structured']): string[] {
  const principles: string[] = [];

  if (structured.values.length > 0) {
    return structured.values.map((value) => {
      const explanation = getValueExplanation(value);
      return `${value}: ${explanation}`;
    });
  }

  return [];
}

/**
 * Get explanation for a value
 */
function getValueExplanation(value: string): string {
  const explanations: Record<string, string> = {
    innovation: 'Embraces new technologies and approaches',
    simplicity: 'Prefers clean, straightforward solutions',
    performance: 'Optimizes for speed and efficiency',
    accessibility: 'Prioritizes inclusive design',
    privacy: 'Values user privacy and data protection',
    'open-source': 'Believes in collaborative development',
    quality: 'Maintains high standards for code and design',
    learning: 'Continuously seeks knowledge and growth',
  };

  return explanations[value.toLowerCase()] || 'Core principle guiding their work';
}

/**
 * Generate edge cases for persona skill
 */
function generatePersonaEdgeCases(structured: PersonaResult['persona']['structured']): string[] {
  const edgeCases: string[] = [];

  // General edge cases
  edgeCases.push('The question is outside this person\'s areas of expertise');
  edgeCases.push('A more direct, literal approach would be more effective');
  edgeCases.push('The context requires a different communication style');

  // Add expertise-specific edge cases
  if (structured.expertise.length > 0) {
    const expertise = structured.expertise.join(', ');
    edgeCases.push(`The topic is unrelated to ${expertise}`);
  }

  // Communication style specific
  if (structured.communicationStyle.includes('concise')) {
    edgeCases.push('Ensure conciseness doesn\'t sacrifice clarity for complex topics');
  }

  // Technical level specific
  if (structured.technicalLevel > 0.8) {
    edgeCases.push('May need to simplify explanations for less technical audiences');
  }

  return edgeCases;
}
