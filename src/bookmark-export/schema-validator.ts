/**
 * JSON Schema validation utilities for bookmark export
 */

import Ajv, { type ErrorObject } from 'ajv';
import addFormats from 'ajv-formats';
import exportSchema from './schemas/export-schema.js' with { type: 'json' };
import type { BookmarkExport } from './types.js';

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
