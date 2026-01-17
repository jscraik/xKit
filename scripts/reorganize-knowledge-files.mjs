#!/usr/bin/env node
/**
 * Reorganize knowledge files into author folders
 * Moves files from knowledge/{month}/{category}/*.md
 * to knowledge/{month}/{category}/@{author}/*.md
 */

import { mkdirSync, readdirSync, readFileSync, statSync, unlinkSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

function extractAuthorFromFrontmatter(content) {
    const viaMatch = content.match(/^via:\s*"Twitter bookmark from @([^"]+)"/m);
    if (viaMatch) {
        return viaMatch[1];
    }
    return null;
}

function reorganizeDirectory(dirPath) {
    const entries = readdirSync(dirPath);
    let movedCount = 0;

    for (const entry of entries) {
        const fullPath = join(dirPath, entry);
        const stat = statSync(fullPath);

        if (stat.isDirectory()) {
            // Skip author directories (start with @)
            if (entry.startsWith('@')) {
                continue;
            }
            // Recurse into subdirectories
            movedCount += reorganizeDirectory(fullPath);
        } else if (entry.endsWith('.md')) {
            // Process markdown files
            const content = readFileSync(fullPath, 'utf-8');
            const author = extractAuthorFromFrontmatter(content);

            if (author) {
                // Create author directory
                const authorDir = join(dirPath, `@${author}`);
                mkdirSync(authorDir, { recursive: true });

                // Move file
                const newPath = join(authorDir, entry);
                writeFileSync(newPath, content, 'utf-8');
                unlinkSync(fullPath);

                console.log(`Moved: ${entry} -> @${author}/${entry}`);
                movedCount++;
            } else {
                console.log(`Skipped (no author): ${fullPath}`);
            }
        }
    }

    return movedCount;
}

function main() {
    const knowledgeDir = './knowledge';

    console.log('Reorganizing knowledge files by author...\n');

    const totalMoved = reorganizeDirectory(knowledgeDir);

    console.log(`\nDone! Moved ${totalMoved} files into author folders.`);
}

main();
