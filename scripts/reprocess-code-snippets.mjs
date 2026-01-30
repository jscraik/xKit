#!/usr/bin/env node

/**
 * Re-process existing tweet archives with enhanced code extraction
 */

import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

// Code sharing platforms
const codePlatforms = [
    'github.com',
    'codepen.io',
    'jsfiddle.net',
    'codesandbox.io',
    'stackblitz.com',
    'replit.com',
    'glitch.com',
    'jsbin.com',
    'playcode.io',
    'runkit.com',
];

/**
 * Extract code snippets with enhanced detection
 */
function extractCodeSnippets(tweets) {
    const snippets = [];
    const codeBlockRegex = /```(\w+)?\n([\s\S]+?)```/g;
    const inlineCodeRegex = /`([^`]+)`/g;
    const urlRegex = /https?:\/\/[^\s]+/g;

    for (const tweet of tweets) {
        const text = tweet.text || '';
        const author = tweet.author?.username || 'unknown';
        const date = tweet.createdAt || '';
        const tweetUrl = `https://x.com/${author}/status/${tweet.id}`;

        // Extract code blocks
        let match;
        while ((match = codeBlockRegex.exec(text)) !== null) {
            const code = match[2].trim();
            const language = match[1] || 'unknown';

            snippets.push({
                language,
                code,
                context: `Code block from @${author} on ${date}\nTweet: ${tweetUrl}`,
                type: 'code-block',
                category: categorizeCode(code, text),
                tweetId: tweet.id,
                tweetUrl,
            });
        }

        // Extract inline code
        const inlineMatches = Array.from(text.matchAll(inlineCodeRegex));
        for (const inlineMatch of inlineMatches) {
            const code = inlineMatch[1];

            const isPascalCase = /^[A-Z][a-zA-Z]+$/.test(code);
            const isComponent = isPascalCase || code.includes('Component') || (code.includes('.') && /^[A-Z]/.test(code));
            const isCSSProperty = code.includes(':') || code.includes('-') || code.startsWith('--');
            const isHook = code.startsWith('use') && /^use[A-Z]/.test(code);

            // Capture substantial or interesting code
            if (
                code.length > 15 ||
                code.includes('(') ||
                code.includes('{') ||
                isComponent ||
                isCSSProperty ||
                isHook
            ) {
                const type = isComponent ? 'component' : isCSSProperty ? 'css-property' : 'inline-code';
                const componentName = isComponent ? extractComponentName(code) : undefined;

                snippets.push({
                    code: code.trim(),
                    context: `Inline code from @${author} on ${date}\nTweet: ${tweetUrl}`,
                    type,
                    category: categorizeCode(code, text),
                    componentName,
                    tweetId: tweet.id,
                    tweetUrl,
                });
            }
        }

        // Check URLs for code repositories
        const urls = text.match(urlRegex);
        if (urls) {
            for (const url of urls) {
                if (url.includes('…') || url.includes('...')) {
                    continue;
                }

                const lowerUrl = url.toLowerCase();
                const isCodePlatform = codePlatforms.some(platform => lowerUrl.includes(platform));

                if (lowerUrl.includes('github.com') || isCodePlatform) {
                    snippets.push({
                        code: url,
                        context: `Code link from @${author}: ${text.substring(0, 150)}\nTweet: ${tweetUrl}`,
                        type: 'code-link',
                        category: 'repository',
                        tweetId: tweet.id,
                        tweetUrl,
                    });
                }
            }
        }

        // Check for code in images
        if (tweet.media && tweet.media.length > 0) {
            const hasImages = tweet.media.some(m => m.type === 'photo');
            if (hasImages) {
                const codeKeywords = ['component', 'code', 'snippet', 'function', 'const', 'let', 'var', 'import', 'export', 'react', 'vue', 'svelte'];
                const hasCodeKeywords = codeKeywords.some(keyword => text.toLowerCase().includes(keyword));

                if (hasCodeKeywords) {
                    snippets.push({
                        code: `[IMAGE: Potential code screenshot - requires vision analysis]`,
                        context: `Tweet with image from @${author} on ${date}\nText: ${text}\nTweet: ${tweetUrl}`,
                        type: 'image-code',
                        category: categorizeCode('', text),
                        tweetId: tweet.id,
                        tweetUrl,
                    });
                }
            }
        }
    }

    return snippets;
}

/**
 * Categorize code based on content and context
 */
function categorizeCode(code, context) {
    const lower = code.toLowerCase() + ' ' + context.toLowerCase();

    if (lower.includes('animation') || lower.includes('transition') || lower.includes('ease') || lower.includes('transform')) {
        return 'animation';
    }
    if (lower.includes('component') || lower.includes('drawer') || lower.includes('modal') || lower.includes('dialog')) {
        return 'component';
    }
    if (lower.includes('style') || lower.includes('css') || code.includes(':') || code.startsWith('--')) {
        return 'styling';
    }
    if (lower.includes('hook') || lower.includes('use')) {
        return 'hooks';
    }
    if (lower.includes('api') || lower.includes('fetch') || lower.includes('promise')) {
        return 'api';
    }

    return 'general';
}

/**
 * Extract component name from code
 */
function extractComponentName(code) {
    // Handle patterns like "Drawer.NestedRoot"
    const dotMatch = code.match(/^([A-Z][a-zA-Z]+)\./);
    if (dotMatch) {
        return dotMatch[1];
    }

    // Handle PascalCase component names
    if (/^[A-Z][a-zA-Z]+$/.test(code)) {
        return code;
    }

    // Handle "ComponentName" pattern
    const componentMatch = code.match(/([A-Z][a-zA-Z]+)Component/);
    if (componentMatch) {
        return componentMatch[1];
    }

    return undefined;
}

/**
 * Organize code snippets by type, component, and category
 */
function organizeCodeSnippets(snippets) {
    const organized = {
        byType: {
            codeBlocks: [],
            inlineCode: [],
            components: [],
            cssProperties: [],
            codeLinks: [],
            imageCode: [],
        },
        byComponent: {},
        byCategory: {},
        all: snippets,
    };

    for (const snippet of snippets) {
        // Organize by type
        switch (snippet.type) {
            case 'code-block':
                organized.byType.codeBlocks.push(snippet);
                break;
            case 'inline-code':
                organized.byType.inlineCode.push(snippet);
                break;
            case 'component':
                organized.byType.components.push(snippet);
                break;
            case 'css-property':
                organized.byType.cssProperties.push(snippet);
                break;
            case 'code-link':
                organized.byType.codeLinks.push(snippet);
                break;
            case 'image-code':
                organized.byType.imageCode.push(snippet);
                break;
        }

        // Organize by component
        if (snippet.componentName) {
            if (!organized.byComponent[snippet.componentName]) {
                organized.byComponent[snippet.componentName] = [];
            }
            organized.byComponent[snippet.componentName].push(snippet);
        }

        // Organize by category
        if (snippet.category) {
            if (!organized.byCategory[snippet.category]) {
                organized.byCategory[snippet.category] = [];
            }
            organized.byCategory[snippet.category].push(snippet);
        }
    }

    return organized;
}

/**
 * Process a user's artifacts
 */
async function processUser(username) {
    console.log(`\n=== Processing @${username} ===`);

    const artifactsDir = join(process.cwd(), 'artifacts', username);
    const tweetsPath = join(artifactsDir, 'tweets.json');

    try {
        // Read tweets
        const tweets = JSON.parse(readFileSync(tweetsPath, 'utf-8'));
        console.log(`✓ Loaded ${tweets.length} tweets`);

        // Extract code snippets with enhanced detection
        const codeSnippets = extractCodeSnippets(tweets);
        console.log(`✓ Extracted ${codeSnippets.length} code snippets (was ${tweets.length > 200 ? 7 : 2})`);

        // Organize snippets
        const organizedCode = organizeCodeSnippets(codeSnippets);

        // Print summary
        console.log(`\n  By Type:`);
        console.log(`    Code blocks: ${organizedCode.byType.codeBlocks.length}`);
        console.log(`    Inline code: ${organizedCode.byType.inlineCode.length}`);
        console.log(`    Components: ${organizedCode.byType.components.length}`);
        console.log(`    CSS properties: ${organizedCode.byType.cssProperties.length}`);
        console.log(`    Code links: ${organizedCode.byType.codeLinks.length}`);
        console.log(`    Image code: ${organizedCode.byType.imageCode.length}`);

        if (Object.keys(organizedCode.byComponent).length > 0) {
            console.log(`\n  By Component:`);
            for (const [component, snippets] of Object.entries(organizedCode.byComponent)) {
                console.log(`    ${component}: ${snippets.length} snippets`);
            }
        }

        console.log(`\n  By Category:`);
        for (const [category, snippets] of Object.entries(organizedCode.byCategory)) {
            console.log(`    ${category}: ${snippets.length} snippets`);
        }

        // Find existing sweep file
        const { readdirSync } = await import('fs');
        const sweepFiles = readdirSync(artifactsDir).filter(f => f.includes('-sweep-') && f.endsWith('.json'));
        if (sweepFiles.length === 0) {
            console.log('✗ No sweep file found');
            return;
        }

        const sweepPath = join(artifactsDir, sweepFiles[0]);
        const sweepData = JSON.parse(readFileSync(sweepPath, 'utf-8'));

        // Update sweep data
        sweepData.codeSnippets = codeSnippets;
        sweepData.organizedCode = organizedCode;

        // Write updated sweep file
        writeFileSync(sweepPath, JSON.stringify(sweepData, null, 2), 'utf-8');
        console.log(`\n✓ Updated ${sweepPath}`);

        // Also save organized code separately for easy access
        const organizedPath = join(artifactsDir, 'code-snippets-organized.json');
        writeFileSync(organizedPath, JSON.stringify(organizedCode, null, 2), 'utf-8');
        console.log(`✓ Saved organized code to ${organizedPath}`);

    } catch (error) {
        console.error(`✗ Error: ${error.message}`);
    }
}

// Main
const users = ['emilkowalski', 'jh3yy', 'kubadesign', 'benjitaylor'];

console.log('🔄 Re-processing code snippets with enhanced extraction...');

for (const user of users) {
    await processUser(user);
}

console.log('\n✨ Done!');
