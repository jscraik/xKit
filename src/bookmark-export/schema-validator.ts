/**
 * JSON Schema validation utilities for bookmark export
 */

import Ajv, { type ErrorObject } from 'ajv';
import addFormats from 'ajv-formats';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { BookmarkExport } from './types.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const schemaPath = join(__dirname, 'schemas', 'export-schema.json');
const exportSchema = JSON.parse(readFileSync(schemaPath, 'utf-8'));

const ajv = new Ajv.default({ allErrors: true });
addFormats.default(ajv);

const validateExport = ajv.compile(exportSchema);

/**
 * Validates bookmark export data against the export schema
 * @param data - The data to validate
 * @returns true if valid
 * @throws Error with validation details if invalid
 */
export function validateBookmarkExport(data: unknown): data is BookmarkExport {
  const valid = validateExport(data);
  if (!valid) {
    const errors = validateExport.errors?.map((err: ErrorObject) => `${err.instancePath} ${err.message}`).join(', ');
    throw new Error(`Export validation failed: ${errors}`);
  }
  return true;
}
