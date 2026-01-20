/**
 * Unit tests for custom template system
 *
 * Test coverage:
 * - Template parsing with YAML frontmatter
 * - Variable substitution (strict mode)
 * - Template validation
 * - Error handling (missing templates, invalid YAML, undefined variables)
 * - Security (path traversal prevention)
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import {
  CustomTemplateManager,
  TemplateNotFoundError,
  TemplateValidationError,
  InvalidYAMLError,
} from '../../src/bookmark-prompts/custom-templates.js';

describe('CustomTemplateManager', () => {
  let templateDir: string;
  let manager: CustomTemplateManager;

  beforeEach(() => {
    // Create a temporary template directory
    templateDir = join(tmpdir(), `xkit-test-templates-${Date.now()}`);
    mkdirSync(templateDir, { recursive: true });
    manager = new CustomTemplateManager(templateDir);
  });

  afterEach(() => {
    // Clean up temporary directory
    if (existsSync(templateDir)) {
      rmSync(templateDir, { recursive: true, force: true });
    }
  });

  describe('parseTemplateFrontmatter', () => {
    it('should parse valid YAML frontmatter', () => {
      const content = `---
name: research-paper
description: Academic paper summary
category: academic
variables:
  domain: Computer Science
  focus: algorithms
---
Template content here`;

      const frontmatter = manager.parseTemplateFrontmatter(content, 'test.md');

      expect(frontmatter.name).toBe('research-paper');
      expect(frontmatter.description).toBe('Academic paper summary');
      expect(frontmatter.category).toBe('academic');
      expect(frontmatter.variables).toEqual({
        domain: 'Computer Science',
        focus: 'algorithms',
      });
    });

    it('should parse minimal frontmatter (name and description only)', () => {
      const content = `---
name: simple
description: A simple template
---
Content`;

      const frontmatter = manager.parseTemplateFrontmatter(content, 'test.md');

      expect(frontmatter.name).toBe('simple');
      expect(frontmatter.description).toBe('A simple template');
      expect(frontmatter.category).toBeUndefined();
      expect(frontmatter.variables).toBeUndefined();
    });

    it('should throw error for missing YAML frontmatter', () => {
      const content = 'No frontmatter here';

      expect(() => manager.parseTemplateFrontmatter(content, 'test.md')).toThrow(/Missing YAML frontmatter/);
    });

    it('should throw error for invalid YAML syntax', () => {
      const content = `---
name: test: invalid: colon
description: Test
---
Content`;

      expect(() => manager.parseTemplateFrontmatter(content, 'test.md')).toThrow(/Failed to parse YAML frontmatter|Invalid YAML/);
    });

    it('should throw error for missing name field', () => {
      const content = `---
description: No name field
---
Content`;

      expect(() => manager.parseTemplateFrontmatter(content, 'test.md')).toThrow(/Missing or invalid 'name' field/);
    });

    it('should throw error for missing description field', () => {
      const content = `---
name: test
---
Content`;

      expect(() => manager.parseTemplateFrontmatter(content, 'test.md')).toThrow(/Missing or invalid 'description' field/);
    });

    it('should handle empty variables object', () => {
      const content = `---
name: test
description: Test
variables: {}
---
Content`;

      const frontmatter = manager.parseTemplateFrontmatter(content, 'test.md');

      expect(frontmatter.variables).toEqual({});
    });

    it('should filter non-string variable values', () => {
      const content = `---
name: test
description: Test
variables:
  stringVar: value
  numberVar: 123
  boolVar: true
  nullVar: null
---
Content`;

      const frontmatter = manager.parseTemplateFrontmatter(content, 'test.md');

      expect(frontmatter.variables).toEqual({
        stringVar: 'value',
      });
    });
  });

  describe('parseTemplate', () => {
    it('should parse template and extract content after frontmatter', () => {
      const content = `---
name: test
description: Test template
---
This is the actual template content.

It can have multiple paragraphs.`;

      const parsed = manager.parseTemplate(content, '/path/to/test.md');

      expect(parsed.frontmatter.name).toBe('test');
      expect(parsed.content).toBe('This is the actual template content.\n\nIt can have multiple paragraphs.');
      expect(parsed.path).toBe('/path/to/test.md');
    });
  });

  describe('loadTemplate', () => {
    it('should load template from file system', () => {
      const templateContent = `---
name: research-paper
description: Academic paper summary
category: academic
---
Summarize this {{domain}} paper with {{focus}}`;

      const templatePath = join(templateDir, 'research-paper.md');
      writeFileSync(templatePath, templateContent, 'utf8');

      const template = manager.loadTemplate('research-paper');

      expect(template).not.toBeNull();
      expect(template!.frontmatter.name).toBe('research-paper');
      expect(template!.content).toContain('Summarize this');
    });

    it('should return null for non-existent template', () => {
      const template = manager.loadTemplate('non-existent');

      expect(template).toBeNull();
    });

    it('should sanitize template name to prevent path traversal', () => {
      // Create a valid template
      const templateContent = `---
name: safe
description: Safe template
---
Content`;
      writeFileSync(join(templateDir, 'safe.md'), templateContent, 'utf8');

      // Try to load with path traversal
      const template = manager.loadTemplate('../etc/passwd');

      // Should either return null or load the sanitized version
      expect(template).toBeNull();
    });

    it('should load template with .md extension automatically', () => {
      const templateContent = `---
name: test
description: Test
---
Content`;
      writeFileSync(join(templateDir, 'test.md'), templateContent, 'utf8');

      // Load without .md extension
      const template = manager.loadTemplate('test');

      expect(template).not.toBeNull();
    });
  });

  describe('substituteVariables', () => {
    it('should substitute single variable', () => {
      const template = 'Analyze {{domain}} paper';
      const result = manager.substituteVariables(template, { domain: 'ML' });

      expect(result).toBe('Analyze ML paper');
    });

    it('should substitute multiple variables', () => {
      const template = 'Analyze {{domain}} paper with {{focus}} using {{method}}';
      const result = manager.substituteVariables(template, {
        domain: 'ML',
        focus: 'optimization',
        method: 'gradient descent',
      });

      expect(result).toBe('Analyze ML paper with optimization using gradient descent');
    });

    it('should handle repeated variables', () => {
      const template = '{{domain}} is great. I love {{domain}}.';
      const result = manager.substituteVariables(template, { domain: 'TypeScript' });

      expect(result).toBe('TypeScript is great. I love TypeScript.');
    });

    it('should throw error for undefined variable (strict mode)', () => {
      const template = 'Use {{undefinedVar}} for analysis';

      expect(() => manager.substituteVariables(template, {})).toThrow(/Undefined variables/);
    });

    it('should throw error listing all undefined variables', () => {
      const template = 'Analyze {{domain}} with {{method}} using {{undefinedVar}}';

      expect(() => manager.substituteVariables(template, { domain: 'ML' })).toThrow(/method, undefinedVar/);
    });

    it('should handle empty variable values', () => {
      const template = 'Domain: {{domain}}';
      const result = manager.substituteVariables(template, { domain: '' });

      expect(result).toBe('Domain: ');
    });

    it('should handle special characters in variable values', () => {
      const template = 'Title: {{title}}';
      const result = manager.substituteVariables(template, {
        title: 'Understanding "TypeScript" Generics & <Types>',
      });

      expect(result).toBe('Title: Understanding "TypeScript" Generics & <Types>');
    });

    it('should preserve newlines in variable values', () => {
      const template = 'Quote:\n{{quote}}';
      const result = manager.substituteVariables(template, {
        quote: 'Line 1\nLine 2\nLine 3',
      });

      expect(result).toBe('Quote:\nLine 1\nLine 2\nLine 3');
    });
  });

  describe('validateTemplate', () => {
    it('should validate safe template', () => {
      const template = 'Summarize this article about {{domain}}';
      const result = manager.validateTemplate(template);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject template with forbidden pattern (process)', () => {
      const template = 'Use process.env.SECRET to get {{focus}}';
      const result = manager.validateTemplate(template);

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0]).toMatch(/forbidden pattern|Forbidden pattern/);
    });

    it('should reject template exceeding max length', () => {
      const longTemplate = 'x'.repeat(10001);
      const result = manager.validateTemplate(longTemplate);

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('too long'))).toBe(true);
    });

    it('should reject template with unknown variable', () => {
      const template = 'Use {{unknownVariable}} for analysis';
      const result = manager.validateTemplate(template);

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('Unknown variable'))).toBe(true);
    });
  });

  describe('listTemplates', () => {
    it('should return empty array when directory does not exist', () => {
      const nonExistentDir = join(tmpdir(), 'non-existent-templates');
      const emptyManager = new CustomTemplateManager(nonExistentDir);

      const templates = emptyManager.listTemplates();

      expect(templates).toEqual([]);
    });

    it('should list all .md files in template directory', () => {
      // Create multiple templates
      writeFileSync(join(templateDir, 'template1.md'), `---
name: template1
description: First template
---
Content1`, 'utf8');

      writeFileSync(join(templateDir, 'template2.md'), `---
name: template2
description: Second template
---
Content2`, 'utf8');

      // Create a non-.md file (should be ignored)
      writeFileSync(join(templateDir, 'readme.txt'), 'Not a template', 'utf8');

      const templates = manager.listTemplates();

      expect(templates).toHaveLength(2);
      expect(templates.map(t => t.frontmatter.name)).toEqual(['template1', 'template2']);
    });

    it('should skip invalid templates when listing', () => {
      // Create valid template
      writeFileSync(join(templateDir, 'valid.md'), `---
name: valid
description: Valid template
---
Content`, 'utf8');

      // Create invalid template (missing frontmatter)
      writeFileSync(join(templateDir, 'invalid.md'), 'No frontmatter', 'utf8');

      const templates = manager.listTemplates();

      // Should only return valid templates
      expect(templates).toHaveLength(1);
      expect(templates[0].frontmatter.name).toBe('valid');
    });
  });

  describe('getTemplateDir', () => {
    it('should return the template directory path', () => {
      expect(manager.getTemplateDir()).toBe(templateDir);
    });
  });

  describe('Custom Errors', () => {
    it('TemplateNotFoundError should have correct name and message', () => {
      const error = new TemplateNotFoundError('my-template');

      expect(error.name).toBe('TemplateNotFoundError');
      expect(error.message).toContain('my-template');
    });

    it('TemplateValidationError should format errors correctly', () => {
      const error = new TemplateValidationError('my-template', ['Error 1', 'Error 2']);

      expect(error.name).toBe('TemplateValidationError');
      expect(error.message).toContain('my-template');
      expect(error.message).toContain('Error 1');
      expect(error.message).toContain('Error 2');
    });

    it('InvalidYAMLError should include original YAML error', () => {
      const yamlError = new Error('Invalid YAML syntax');
      const error = new InvalidYAMLError('/path/to/template.md', yamlError);

      expect(error.name).toBe('InvalidYAMLError');
      expect(error.message).toContain('/path/to/template.md');
      expect(error.message).toContain('Invalid YAML syntax');
    });
  });

  describe('Integration Tests', () => {
    it('should complete full workflow: load, substitute, validate', () => {
      // Create template file
      const templateContent = `---
name: academic-paper
description: Academic paper summary
category: research
variables:
  domain: Computer Science
  methodology: quantitative
---
Analyze this {{domain}} research paper using {{methodology}} methods.

Focus on:
1. Research approach
2. {{methodology}} analysis techniques
3. Key findings`;

      const templatePath = join(templateDir, 'academic-paper.md');
      writeFileSync(templatePath, templateContent, 'utf8');

      // Load template
      const template = manager.loadTemplate('academic-paper');
      expect(template).not.toBeNull();

      // Substitute variables (with defaults)
      const substituted1 = manager.substituteVariables(
        template!.content,
        template!.frontmatter.variables || {}
      );
      expect(substituted1).toContain('Computer Science research paper');
      expect(substituted1).toContain('quantitative methods');

      // Substitute variables (with overrides)
      const substituted2 = manager.substituteVariables(template!.content, {
        domain: 'Machine Learning',
        methodology: 'experimental',
      });
      expect(substituted2).toContain('Machine Learning research paper');
      expect(substituted2).toContain('experimental methods');

      // Validate template
      const validation = manager.validateTemplate(substituted2);
      expect(validation.valid).toBe(true);
    });

    it('should handle error in workflow gracefully', () => {
      // Create template with undefined variable
      const templateContent = `---
name: broken
description: Template with undefined var
---
Use {{undefinedVar}} for analysis`;

      const templatePath = join(templateDir, 'broken.md');
      writeFileSync(templatePath, templateContent, 'utf8');

      // Load template (succeeds)
      const template = manager.loadTemplate('broken');
      expect(template).not.toBeNull();

      // Substitute variables (fails - undefined var)
      expect(() => manager.substituteVariables(template!.content, {})).toThrow(/Undefined variables/);
    });
  });
});
