#!/usr/bin/env node
/**
 * Reorganize knowledge files from month_year to year/month format
 * Changes: knowledge/jan_2026/ -> knowledge/2026/01-jan/
 */

import { cpSync, mkdirSync, readdirSync, renameSync, rmSync, statSync } from 'node:fs';
import { join } from 'node:path';

const monthMap = {
    'jan': '01-jan',
    'feb': '02-feb',
    'mar': '03-mar',
    'apr': '04-apr',
    'may': '05-may',
    'jun': '06-jun',
    'jul': '07-jul',
    'aug': '08-aug',
    'sep': '09-sep',
    'oct': '10-oct',
    'nov': '11-nov',
    'dec': '12-dec'
};

function parseMonthYear(dirName) {
    const match = dirName.match(/^([a-z]{3})_(\d{4})$/);
    if (match) {
        const [, month, year] = match;
        return { month, year, sortableMonth: monthMap[month] };
    }
    return null;
}

function main() {
    const knowledgeDir = './knowledge';
    const entries = readdirSync(knowledgeDir);

    console.log('Reorganizing knowledge structure to year/month format...\n');

    const tempDir = './knowledge_temp';
    mkdirSync(tempDir, { recursive: true });

    let movedCount = 0;

    for (const entry of entries) {
        const fullPath = join(knowledgeDir, entry);
        const stat = statSync(fullPath);

        if (!stat.isDirectory()) {
            continue;
        }

        const parsed = parseMonthYear(entry);
        if (parsed) {
            const { year, sortableMonth } = parsed;

            // Create year directory
            const yearDir = join(tempDir, year);
            mkdirSync(yearDir, { recursive: true });

            // Create month directory with sortable prefix
            const monthDir = join(yearDir, sortableMonth);

            // Copy entire directory structure
            cpSync(fullPath, monthDir, { recursive: true });

            console.log(`Moved: ${entry} -> ${year}/${sortableMonth}`);
            movedCount++;
        }
    }

    // Remove old month_year directories
    for (const entry of entries) {
        const fullPath = join(knowledgeDir, entry);
        const stat = statSync(fullPath);

        if (stat.isDirectory() && parseMonthYear(entry)) {
            rmSync(fullPath, { recursive: true, force: true });
        }
    }

    // Move temp directories to knowledge
    const tempEntries = readdirSync(tempDir);
    for (const entry of tempEntries) {
        const srcPath = join(tempDir, entry);
        const destPath = join(knowledgeDir, entry);
        renameSync(srcPath, destPath);
    }

    // Remove temp directory
    rmSync(tempDir, { recursive: true, force: true });

    console.log(`\nDone! Reorganized ${movedCount} directories.`);
    console.log('\nNew structure:');

    // Show new structure
    const years = readdirSync(knowledgeDir)
        .filter(e => statSync(join(knowledgeDir, e)).isDirectory())
        .sort();

    for (const year of years) {
        console.log(`\n${year}/`);
        const months = readdirSync(join(knowledgeDir, year))
            .filter(e => statSync(join(knowledgeDir, year, e)).isDirectory())
            .sort();

        for (const month of months) {
            const categories = readdirSync(join(knowledgeDir, year, month))
                .filter(e => statSync(join(knowledgeDir, year, month, e)).isDirectory())
                .sort();

            console.log(`  ${month}/`);
            for (const category of categories.slice(0, 3)) {
                console.log(`    ${category}/`);
            }
            if (categories.length > 3) {
                console.log(`    ... and ${categories.length - 3} more`);
            }
        }
    }
}

main();
