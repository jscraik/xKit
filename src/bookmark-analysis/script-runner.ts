/**
 * Script Runner - Executes custom analysis scripts on bookmarks
 */

import { spawn } from 'node:child_process';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import type { BookmarkRecord } from '../bookmark-export/types.js';
import type { Analyzer } from './analysis-engine.js';
import type { AnalysisResult } from './types.js';

/**
 * Configuration for script execution
 */
export interface ScriptConfig {
    timeout?: number; // Timeout in milliseconds (default: 30000)
    maxOutputSize?: number; // Maximum output size in bytes (default: 10MB)
}

/**
 * ScriptRunner executes custom analysis scripts and merges their output
 * 
 * Responsibilities:
 * - Load and validate custom scripts from file paths
 * - Execute scripts with exported JSON as input using child_process
 * - Capture script output (stdout as JSON)
 * - Validate script output against schema
 * - Merge valid output into bookmark records
 * - Handle script failures gracefully with error logging
 * 
 * Validates: Requirements 6.1, 6.2, 6.3, 6.4, 6.5
 */
export class ScriptRunner implements Analyzer {
    name = 'ScriptRunner';
    private scriptPath: string | null = null;
    private config: ScriptConfig;

    constructor(config: ScriptConfig = {}) {
        this.config = {
            timeout: config.timeout || 30000, // 30 seconds default
            maxOutputSize: config.maxOutputSize || 10 * 1024 * 1024, // 10MB default
        };
    }

    /**
     * Load and validate a custom script from a file path
     * @param scriptPath - Path to the script file
     * @throws Error if script file doesn't exist or is not executable
     * 
     * Validates: Requirement 6.1 - Analysis Engine SHALL accept custom analysis scripts as input
     */
    async loadScript(scriptPath: string): Promise<void> {
        try {
            // Check if file exists
            const stats = await fs.stat(scriptPath);

            if (!stats.isFile()) {
                throw new Error(`Script path is not a file: ${scriptPath}`);
            }

            // Resolve to absolute path
            this.scriptPath = path.resolve(scriptPath);

            // Log successful load
            console.log(`Loaded script: ${this.scriptPath}`);
        } catch (error) {
            if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
                throw new Error(`Script file not found: ${scriptPath}`);
            }
            throw error;
        }
    }

    /**
     * Execute the loaded script with bookmark data as input
     * @param bookmark - The bookmark to analyze
     * @returns Script output as a parsed object
     * @throws Error if script execution fails or times out
     * 
     * Validates: Requirement 6.2 - Analysis Engine SHALL execute script with exported JSON as input
     */
    async execute(bookmark: BookmarkRecord): Promise<Record<string, unknown>> {
        if (!this.scriptPath) {
            throw new Error('No script loaded. Call loadScript() first.');
        }

        // Determine the interpreter based on file extension
        const ext = path.extname(this.scriptPath);
        const interpreter = this.getInterpreter(ext);

        // Prepare input data as JSON
        const inputData = JSON.stringify(bookmark);

        return new Promise((resolve, reject) => {
            let stdout = '';
            let stderr = '';
            let outputSize = 0;

            // Spawn the script process
            const child = spawn(interpreter, [this.scriptPath!], {
                stdio: ['pipe', 'pipe', 'pipe'],
            });

            // Set timeout
            const timeoutId = setTimeout(() => {
                child.kill('SIGTERM');
                reject(new Error(`Script execution timed out after ${this.config.timeout}ms`));
            }, this.config.timeout);

            // Capture stdout
            child.stdout.on('data', (data: Buffer) => {
                outputSize += data.length;
                if (outputSize > this.config.maxOutputSize!) {
                    child.kill('SIGTERM');
                    reject(new Error(`Script output exceeded maximum size of ${this.config.maxOutputSize} bytes`));
                    return;
                }
                stdout += data.toString();
            });

            // Capture stderr
            child.stderr.on('data', (data: Buffer) => {
                stderr += data.toString();
            });

            // Handle process completion
            child.on('close', (code) => {
                clearTimeout(timeoutId);

                if (code !== 0) {
                    reject(new Error(`Script exited with code ${code}. stderr: ${stderr}`));
                    return;
                }

                try {
                    // Parse stdout as JSON
                    const output = JSON.parse(stdout);
                    resolve(output);
                } catch (error) {
                    reject(new Error(`Failed to parse script output as JSON: ${(error as Error).message}`));
                }
            });

            // Handle process errors
            child.on('error', (error) => {
                clearTimeout(timeoutId);
                reject(new Error(`Failed to execute script: ${error.message}`));
            });

            // Write input data to stdin
            child.stdin.write(inputData);
            child.stdin.end();
        });
    }

    /**
     * Get the appropriate interpreter for a script file
     * @param extension - File extension (e.g., '.js', '.py')
     * @returns Interpreter command
     */
    private getInterpreter(extension: string): string {
        switch (extension) {
            case '.js':
            case '.mjs':
                return 'node';
            case '.py':
                return 'python3';
            case '.sh':
                return 'bash';
            case '.rb':
                return 'ruby';
            default:
                throw new Error(`Unsupported script extension: ${extension}`);
        }
    }

    /**
     * Validate script output against expected schema
     * @param output - The script output to validate
     * @returns true if valid, false otherwise
     * 
     * Validates: Requirement 6.5 - Analysis Engine SHALL validate script output conforms to expected schema
     */
    validate(output: unknown): boolean {
        // Script output should be an object
        if (typeof output !== 'object' || output === null) {
            console.error('Script output validation failed: output is not an object');
            return false;
        }

        const obj = output as Record<string, unknown>;

        // Check for valid field types
        // Categories should be an array of strings if present
        if ('categories' in obj) {
            if (!Array.isArray(obj.categories)) {
                console.error('Script output validation failed: categories is not an array');
                return false;
            }
            if (!obj.categories.every((c) => typeof c === 'string')) {
                console.error('Script output validation failed: categories contains non-string values');
                return false;
            }
        }

        // Usefulness score should be a number between 0 and 100 if present
        if ('usefulnessScore' in obj) {
            if (typeof obj.usefulnessScore !== 'number') {
                console.error('Script output validation failed: usefulnessScore is not a number');
                return false;
            }
            if (obj.usefulnessScore < 0 || obj.usefulnessScore > 100) {
                console.error('Script output validation failed: usefulnessScore is out of range [0, 100]');
                return false;
            }
        }

        // Custom fields should be an object if present
        if ('customFields' in obj) {
            if (typeof obj.customFields !== 'object' || obj.customFields === null) {
                console.error('Script output validation failed: customFields is not an object');
                return false;
            }
        }

        return true;
    }

    /**
     * Analyze a bookmark using the loaded script
     * @param bookmark - The bookmark to analyze
     * @returns Analysis result with script output
     * 
     * Validates: Requirements 6.2, 6.3, 6.4, 6.5 - Execute script, merge output, handle failures
     */
    async analyze(bookmark: BookmarkRecord): Promise<AnalysisResult> {
        if (!this.scriptPath) {
            throw new Error('No script loaded. Call loadScript() first.');
        }

        try {
            // Execute the script
            // Validates: Requirement 6.2
            const output = await this.execute(bookmark);

            // Validate the output
            // Validates: Requirement 6.5
            if (!this.validate(output)) {
                throw new Error('Script output validation failed');
            }

            // Extract analysis result fields
            const result: AnalysisResult = {};

            if ('categories' in output && Array.isArray(output.categories)) {
                result.categories = output.categories as string[];
            }

            if ('usefulnessScore' in output && typeof output.usefulnessScore === 'number') {
                result.usefulnessScore = output.usefulnessScore;
            }

            // Collect custom fields (everything except categories and usefulnessScore)
            const customFields: Record<string, unknown> = {};
            for (const [key, value] of Object.entries(output)) {
                if (key !== 'categories' && key !== 'usefulnessScore') {
                    customFields[key] = value;
                }
            }

            if (Object.keys(customFields).length > 0) {
                result.customFields = customFields;
            }

            // Validates: Requirement 6.3 - Merge script output into bookmark records
            return result;
        } catch (error) {
            // Handle script failures gracefully with error logging
            // Validates: Requirement 6.4
            console.error(`Script execution failed for bookmark ${bookmark.id}:`, error);
            console.error(`Script path: ${this.scriptPath}`);

            // Return empty result on failure
            return {};
        }
    }
}
