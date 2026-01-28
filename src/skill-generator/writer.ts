/**
 * Skill writer
 * Writes generated skills to .claude/skills/ directory
 */

import { mkdirSync, existsSync, writeFileSync, readdirSync, unlinkSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { homedir } from 'node:os';
import type { SkillCandidate, SkillCategory } from './types.js';
import type { PersonaResult } from '../persona-extraction/types.js';
import {
  generateSkillTemplate,
  formatSkillMarkdown,
  validateSkillTemplate,
  generatePersonaSkillTemplate,
  formatPersonaSkillMarkdown,
  validatePersonaSkillTemplate,
} from './templates.js';

/**
 * Skill writer options
 */
export interface SkillWriterOptions {
  outputDir?: string;
  category?: SkillCategory;
  autoApprove?: boolean;
}

/**
 * Skill writer result
 */
export interface WriteResult {
  written: string[];
  review: string[];
  skipped: string[];
  errors: Array<{ skill: string; error: string }>;
}

/**
 * Skill writer
 */
export class SkillWriter {
  private skillsDir: string;
  private reviewDir: string;
  private autoApprove: boolean;

  constructor(options: SkillWriterOptions = {}) {
    // Default to .claude/skills/ in home directory
    this.skillsDir = options.outputDir ?? join(homedir(), '.claude', 'skills');
    this.reviewDir = join(homedir(), '.claude', 'skills-review');
    this.autoApprove = options.autoApprove ?? false;

    // Ensure directories exist
    this.ensureDirectories();
  }

  /**
   * Ensure output directories exist
   */
  private ensureDirectories(): void {
    if (!existsSync(this.skillsDir)) {
      mkdirSync(this.skillsDir, { recursive: true });
    }

    if (!existsSync(this.reviewDir)) {
      mkdirSync(this.reviewDir, { recursive: true });
    }
  }

  /**
   * Write a single skill
   */
  writeSkill(candidate: SkillCandidate): { success: boolean; path?: string; error?: string } {
    try {
      // Generate template
      const template = generateSkillTemplate(candidate);

      // Validate
      const validation = validateSkillTemplate(template);
      if (!validation.valid) {
        return {
          success: false,
          error: `Validation failed: ${validation.errors.join(', ')}`,
        };
      }

      // Generate markdown
      const markdown = formatSkillMarkdown(template);

      // Sanitize filename
      const filename = this.sanitizeFilename(candidate.name);
      const filepath = join(this.skillsDir, `${filename}.skill.md`);

      // Write to file
      writeFileSync(filepath, markdown, 'utf8');

      return { success: true, path: filepath };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Write skills to review directory (manual approval required)
   */
  writeToReview(candidate: SkillCandidate): { success: boolean; path?: string; error?: string } {
    try {
      // Generate template
      const template = generateSkillTemplate(candidate);

      // Validate
      const validation = validateSkillTemplate(template);
      if (!validation.valid) {
        return {
          success: false,
          error: `Validation failed: ${validation.errors.join(', ')}`,
        };
      }

      // Generate markdown
      const markdown = formatSkillMarkdown(template);

      // Add review header
      const reviewHeader = `---
# ⚠️ REVIEW REQUIRED

This skill was auto-generated from bookmarked content.
Please review before moving to .claude/skills/

Generated: ${new Date().toISOString()}
Source: ${candidate.source.url}
Confidence: ${(candidate.confidence * 100).toFixed(0)}%
---

`;

      // Sanitize filename
      const filename = this.sanitizeFilename(candidate.name);
      const filepath = join(this.reviewDir, `${filename}.skill.md`);

      // Write to file
      writeFileSync(filepath, reviewHeader + markdown, 'utf8');

      return { success: true, path: filepath };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Write multiple skills
   */
  writeSkills(candidates: SkillCandidate[]): WriteResult {
    const result: WriteResult = {
      written: [],
      review: [],
      skipped: [],
      errors: [],
    };

    for (const candidate of candidates) {
      if (this.autoApprove) {
        // Write directly to skills directory
        const writeResult = this.writeSkill(candidate);

        if (writeResult.success) {
          result.written.push(writeResult.path!);
        } else {
          result.errors.push({
            skill: candidate.name,
            error: writeResult.error!,
          });
        }
      } else {
        // Write to review directory
        const writeResult = this.writeToReview(candidate);

        if (writeResult.success) {
          result.review.push(writeResult.path!);
        } else {
          result.errors.push({
            skill: candidate.name,
            error: writeResult.error!,
          });
        }
      }
    }

    return result;
  }

  /**
   * Get list of existing skills
   */
  listExistingSkills(): string[] {
    if (!existsSync(this.skillsDir)) {
      return [];
    }

    const files = readdirSync(this.skillsDir);
    return files.filter((file) => file.endsWith('.skill.md'));
  }

  /**
   * Check if skill already exists
   */
  skillExists(name: string): boolean {
    const filename = this.sanitizeFilename(name);
    const filepath = join(this.skillsDir, `${filename}.skill.md`);
    return existsSync(filepath);
  }

  /**
   * Sanitize skill name for filename
   */
  private sanitizeFilename(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
  }

  /**
   * Approve skill from review directory
   */
  approveSkill(name: string): { success: boolean; error?: string } {
    const sourceFile = join(this.reviewDir, `${name}.skill.md`);
    const targetFile = join(this.skillsDir, `${name}.skill.md`);

    // Check if source exists
    if (!existsSync(sourceFile)) {
      return {
        success: false,
        error: `Skill not found in review directory: ${name}`,
      };
    }

    // Check if target already exists
    if (existsSync(targetFile)) {
      return {
        success: false,
        error: `Skill already exists: ${name}`,
      };
    }

    try {
      // Read from review, remove header, write to skills
      const content = readFileSync(sourceFile, 'utf8');
      // Remove review header - uses simple string operations instead of complex regex
      // Find the first occurrence of '---' and the next '---' after it, then remove that section
      let contentWithoutHeader = content;
      const firstMarker = '---';
      const reviewHeaderStart = 'REVIEW REQUIRED';

      // Check if this is a review file
      const reviewStartIndex = content.indexOf(reviewHeaderStart);
      if (reviewStartIndex !== -1) {
        // Find the first --- before REVIEW REQUIRED (start of header)
        const headerStartIndex = content.lastIndexOf(firstMarker, reviewStartIndex);
        if (headerStartIndex !== -1) {
          // Find the next --- after the start (end of review header)
          const headerEndIndex = content.indexOf(firstMarker, headerStartIndex + firstMarker.length);
          if (headerEndIndex !== -1) {
            // Find the newline after the closing --- and remove everything up to that point
            const newlineAfterEnd = content.indexOf('\n', headerEndIndex);
            if (newlineAfterEnd !== -1) {
              contentWithoutHeader = content.slice(newlineAfterEnd + 1);
            }
          }
        }
      }
      writeFileSync(targetFile, contentWithoutHeader, 'utf8');

      // Delete from review
      unlinkSync(sourceFile);

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Reject skill from review directory
   */
  rejectSkill(name: string): { success: boolean; error?: string } {
    const sourceFile = join(this.reviewDir, `${name}.skill.md`);

    if (!existsSync(sourceFile)) {
      return {
        success: false,
        error: `Skill not found in review directory: ${name}`,
      };
    }

    try {
      unlinkSync(sourceFile);
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Clear review directory
   */
  clearReview(): void {
    if (existsSync(this.reviewDir)) {
      const files = readdirSync(this.reviewDir);
      for (const file of files) {
        if (file.endsWith('.skill.md')) {
          unlinkSync(join(this.reviewDir, file));
        }
      }
    }
  }

  /**
   * Write a persona skill to a persona-specific subdirectory
   * Creates directory structure: targetDir/@username-persona/SKILL.md
   *
   * @param persona - The persona result to write
   * @param targetDir - Base directory for persona skills (defaults to skillsDir)
   * @returns WriteResult with written/review paths
   */
  async writePersonaSkill(persona: PersonaResult, targetDir?: string): Promise<WriteResult> {
    const result: WriteResult = {
      written: [],
      review: [],
      skipped: [],
      errors: [],
    };

    try {
      // Generate persona skill template
      const template = generatePersonaSkillTemplate(persona);

      // Validate template
      const validation = validatePersonaSkillTemplate(template);
      if (!validation.valid) {
        result.errors.push({
          skill: `@${persona.username}-persona`,
          error: `Validation failed: ${validation.errors.join(', ')}`,
        });
        return result;
      }

      // Generate markdown
      const markdown = formatPersonaSkillMarkdown(template);

      // Create persona-specific directory
      const outputDir = targetDir ?? this.skillsDir;
      const personaDir = join(outputDir, `@${persona.username}-persona`);

      if (!existsSync(personaDir)) {
        mkdirSync(personaDir, { recursive: true });
      }

      // Determine write path based on autoApprove setting
      const filepath = join(personaDir, 'SKILL.md');

      if (this.autoApprove) {
        // Write directly to persona directory
        writeFileSync(filepath, markdown, 'utf8');
        result.written.push(filepath);
      } else {
        // Write to review directory with persona-specific structure
        const reviewPersonaDir = join(this.reviewDir, `@${persona.username}-persona`);
        if (!existsSync(reviewPersonaDir)) {
          mkdirSync(reviewPersonaDir, { recursive: true });
        }

        const reviewFilepath = join(reviewPersonaDir, 'SKILL.md');

        // Add review header
        const reviewHeader = `---
# REVIEW REQUIRED

This persona skill was auto-generated from Twitter content analysis.
Please review before moving to .claude/skills/.

Generated: ${new Date().toISOString()}
Username: @${persona.username}
Analysis Date: ${persona.analyzedAt}
---

`;

        writeFileSync(reviewFilepath, reviewHeader + markdown, 'utf8');
        result.review.push(reviewFilepath);
      }
    } catch (error) {
      result.errors.push({
        skill: `@${persona.username}-persona`,
        error: error instanceof Error ? error.message : String(error),
      });
    }

    return result;
  }

  /**
   * Write multiple persona skills
   *
   * @param personas - Array of persona results to write
   * @param targetDir - Base directory for persona skills (defaults to skillsDir)
   * @returns Aggregate WriteResult for all personas
   */
  async writePersonaSkills(personas: PersonaResult[], targetDir?: string): Promise<WriteResult> {
    const aggregateResult: WriteResult = {
      written: [],
      review: [],
      skipped: [],
      errors: [],
    };

    for (const persona of personas) {
      const result = await this.writePersonaSkill(persona, targetDir);

      aggregateResult.written.push(...result.written);
      aggregateResult.review.push(...result.review);
      aggregateResult.skipped.push(...result.skipped);
      aggregateResult.errors.push(...result.errors);
    }

    return aggregateResult;
  }

  /**
   * Approve persona skill from review directory
   * Moves persona from skills-review/@username-persona/ to .claude/skills/@username-persona/
   *
   * @param username - Twitter username (with or without @)
   * @returns Success status and optional error message
   */
  approvePersonaSkill(username: string): { success: boolean; error?: string } {
    // Normalize username (remove @ if present)
    const normalizedUsername = username.startsWith('@') ? username.slice(1) : username;
    const personaName = `@${normalizedUsername}-persona`;

    const sourceDir = join(this.reviewDir, personaName);
    const targetDir = join(this.skillsDir, personaName);
    const sourceFile = join(sourceDir, 'SKILL.md');
    const targetFile = join(targetDir, 'SKILL.md');

    // Check if source exists
    if (!existsSync(sourceFile)) {
      return {
        success: false,
        error: `Persona skill not found in review directory: ${personaName}`,
      };
    }

    // Check if target already exists
    if (existsSync(targetFile)) {
      return {
        success: false,
        error: `Persona skill already exists: ${personaName}`,
      };
    }

    try {
      // Create target directory if needed
      if (!existsSync(targetDir)) {
        mkdirSync(targetDir, { recursive: true });
      }

      // Read from review, remove header, write to skills
      const content = readFileSync(sourceFile, 'utf8');
      // Remove review header - uses simple string operations instead of complex regex
      // Find the first occurrence of '---' and the next '---' after it, then remove that section
      let contentWithoutHeader = content;
      const firstMarker = '---';
      const reviewHeaderStart = 'REVIEW REQUIRED';

      // Check if this is a review file
      const reviewStartIndex = content.indexOf(reviewHeaderStart);
      if (reviewStartIndex !== -1) {
        // Find the first --- before REVIEW REQUIRED (start of header)
        const headerStartIndex = content.lastIndexOf(firstMarker, reviewStartIndex);
        if (headerStartIndex !== -1) {
          // Find the next --- after the start (end of review header)
          const headerEndIndex = content.indexOf(firstMarker, headerStartIndex + firstMarker.length);
          if (headerEndIndex !== -1) {
            // Find the newline after the closing --- and remove everything up to that point
            const newlineAfterEnd = content.indexOf('\n', headerEndIndex);
            if (newlineAfterEnd !== -1) {
              contentWithoutHeader = content.slice(newlineAfterEnd + 1);
            }
          }
        }
      }
      writeFileSync(targetFile, contentWithoutHeader, 'utf8');

      // Delete source directory
      const files = readdirSync(sourceDir);
      for (const file of files) {
        unlinkSync(join(sourceDir, file));
      }
      // Note: We don't remove the empty directory for safety

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Reject persona skill from review directory
   * Removes the persona directory from skills-review
   *
   * @param username - Twitter username (with or without @)
   * @returns Success status and optional error message
   */
  rejectPersonaSkill(username: string): { success: boolean; error?: string } {
    // Normalize username (remove @ if present)
    const normalizedUsername = username.startsWith('@') ? username.slice(1) : username;
    const personaName = `@${normalizedUsername}-persona`;

    const sourceDir = join(this.reviewDir, personaName);

    if (!existsSync(sourceDir)) {
      return {
        success: false,
        error: `Persona skill not found in review directory: ${personaName}`,
      };
    }

    try {
      // Remove all files in directory
      const files = readdirSync(sourceDir);
      for (const file of files) {
        unlinkSync(join(sourceDir, file));
      }

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * List existing persona skills
   *
   * @returns Array of persona usernames that have skills
   */
  listPersonaSkills(): string[] {
    if (!existsSync(this.skillsDir)) {
      return [];
    }

    const items = readdirSync(this.skillsDir, { withFileTypes: true });
    return items
      .filter((item) => item.isDirectory() && item.name.endsWith('-persona'))
      .map((item) => item.name);
  }

  /**
   * Check if persona skill already exists
   *
   * @param username - Twitter username (with or without @)
   * @returns True if persona skill exists
   */
  personaSkillExists(username: string): boolean {
    // Normalize username (remove @ if present)
    const normalizedUsername = username.startsWith('@') ? username.slice(1) : username;
    const personaDir = join(this.skillsDir, `@${normalizedUsername}-persona`);
    const filepath = join(personaDir, 'SKILL.md');
    return existsSync(filepath);
  }
}
