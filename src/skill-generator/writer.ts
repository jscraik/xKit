/**
 * Skill writer
 * Writes generated skills to .claude/skills/ directory
 */

import { mkdirSync, existsSync, writeFileSync, readdirSync, unlinkSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { homedir } from 'node:os';
import type { SkillCandidate, SkillCategory } from './types.js';
import { generateSkillTemplate, formatSkillMarkdown, validateSkillTemplate } from './templates.js';

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
      const contentWithoutHeader = content.replace(/---\n+# ⚠️ REVIEW REQUIRED[\s\S]*?---\n\n/, '');
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
}
