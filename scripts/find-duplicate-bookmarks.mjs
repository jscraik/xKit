#!/usr/bin/env node
/**
 * Find duplicate bookmark files (same URL, same date)
 */

import { readFileSync, readdirSync, statSync, unlinkSync } from 'node:fs';
import { join } from 'node:path';

function extractMetadata(content) {
    const urlMatch = content.match(/^url:\s*"([^"]+)"/m);
    const dateMatch = content.match(/^date_added:\s*"([^"]+)"/m);
    const sourceMatch = content.match(/^source:\s*"([^"]+)"/m);

    return {
        url: urlMatch ? urlMatch[1] : null,
        date: dateMatch ? dateMatch[1] : null,
        source: sourceMatch ? sourceMatch[1] : null,
    };
}

function findMarkdownFiles(dir, files = []) {
    const entries = readdirSync(dir);

    for (const entry of entries) {
        const fullPath = join(dir, entry);
        const stat = statSync(fullPath);

        if (stat.isDirectory()) {
            findMarkdownFiles(fullPath, files);
        } else if (entry.endsWith('.md')) {
            files.push(fullPath);
        }
    }

    return files;
}

function main() {
    const knowledgeDir = './knowledge';
    const files = findMarkdownFiles(knowledgeDir);

    console.log(`Found ${files.length} markdown files\n`);

    const bookmarkMap = new Map();
    const duplicates = [];

    for (const file of files) {
        const content = readFileSync(file, 'utf-8');
        const metadata = extractMetadata(content);

        if (!metadata.url || !metadata.date) {
            console.log(`Skipping ${file} - missing metadata`);
            continue;
        }

        const key = `${metadata.url}|${metadata.date}`;

        if (bookmarkMap.has(key)) {
            const existing = bookmarkMap.get(key);

            // Keep the longer file (more enriched content)
            const existingSize = statSync(existing).size;
            const currentSize = statSync(file).size;

            if (currentSize > existingSize) {
                duplicates.push({ file: existing, keep: file, reason: 'smaller' });
                bookmarkMap.set(key, file);
            } else {
                duplicates.push({ file, keep: existing, reason: 'smaller' });
            }
        } else {
            bookmarkMap.set(key, file);
        }
    }

    if (duplicates.length === 0) {
        console.log('No duplicates found!');
        return;
    }

    console.log(`Found ${duplicates.length} duplicate(s):\n`);

    for (const dup of duplicates) {
        console.log(`Removing: ${dup.file}`);
        console.log(`Keeping:  ${dup.keep}`);
        console.log(`Reason:   ${dup.reason}\n`);

        unlinkSync(dup.file);
    }

    console.log(`Removed ${duplicates.length} duplicate file(s)`);
    console.log(`Kept ${bookmarkMap.size} unique bookmark(s)`);
}

main();
