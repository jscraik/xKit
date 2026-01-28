/**
 * Types for skill generation
 * Extracts reusable patterns and best practices from bookmarked content
 */

/**
 * Skill candidate extracted from content
 */
export interface SkillCandidate {
  id: string;
  name: string;
  description: string;
  category: SkillCategory;
  confidence: number;
  source: {
    url: string;
    title: string;
    type: string;
  };
  content: {
    instructions: string;
    implementation: string;
    examples: string[];
    edgeCases: string[];
  };
  trigger?: string;
}

/**
 * Skill categories
 */
export type SkillCategory =
  | 'code-pattern'      // Reusable code patterns and idioms
  | 'best-practice'     // Engineering best practices
  | 'workflow'          // Development workflows and processes
  | 'tool-usage'        // How to use specific tools effectively
  | 'architecture'      // Architectural patterns and decisions
  | 'testing'          // Testing strategies and techniques
  | 'documentation'     // Documentation practices
  | 'persona';          // Persona emulation based on Twitter analysis

/**
 * Skill extraction options
 */
export interface SkillExtractionOptions {
  category?: SkillCategory;
  minConfidence?: number;
  maxSkills?: number;
  contentTypes?: string[];
}

/**
 * Skill template for .skill.md file
 */
export interface SkillTemplate {
  name: string;
  description: string;
  triggers: string[];
  category: SkillCategory;
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
 * Extraction result
 */
export interface ExtractionResult {
  skills: SkillCandidate[];
  metadata: {
    contentHash: string;
    extractedAt: string;
    category: SkillCategory | undefined;
    confidenceThreshold: number;
  };
}
