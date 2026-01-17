/**
 * JSON Schema validation utilities for bookmark analysis
 */

import Ajv, { type ErrorObject } from 'ajv';
import addFormats from 'ajv-formats';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { AnalysisExport } from './types.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const schemaPath = join(__dirname, 'schemas', 'analysis-schema.json');
const analysisSchema = JSON.parse(readFileSync(schemaPath, 'utf-8'));

const ajv = new Ajv.default({ allErrors: true });
addFormats.default(ajv);

const validateAnalysis = ajv.compile(analysisSchema);

/**
 * Validates analysis output data against the analysis schema
 * @param data - The data to validate
 * @returns true if valid
 * @throws Error with validation details if invalid
 */
export function validateAnalysisExport(data: unknown): data is AnalysisExport {
  const valid = validateAnalysis(data);
  if (!valid) {
    const errors = validateAnalysis.errors?.map((err: ErrorObject) => `${err.instancePath} ${err.message}`).join(', ');
    throw new Error(`Analysis validation failed: ${errors}`);
  }
  return true;
}
