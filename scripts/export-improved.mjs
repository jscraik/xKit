#!/usr/bin/env node

import { execFileSync } from 'node:child_process';
import { writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';

function extractCodeWithLanguage(text) {
    const blocks = [];
    const lines = text.split('\n');
    let currentCode = [];
    let inCode = false;

    for (const line of lines) {
        // Check for code patterns
        if (line.includes('```') || /[\{\(]/.test(line) && (line.includes('CSS') || line.includes('function') || line.includes('const '))) {
            inCode = true;
        }

        if (inCode) {
            currentCode.push(line);
            if (line.trim() === '' || line.includes('http')) {
                const code = currentCode.join('\n').trim();
                if (code) {
                    const lang = detectLanguage(code);
                    blocks.push({ code, language: lang, sourceLine: currentCode[0] });
                }
                currentCode = [];
                inCode = false;
            }
        }
    }

    // Try markdown code blocks
    const mdRegex = /```(\w+)?\n([\s\S]*?)```/g;
    let match;
    while ((match = mdRegex.exec(text)) !== null) {
        blocks.push({ code: match[2].trim(), language: match[1] || detectLanguage(match[2]) });
    }

    return blocks;
}

function detectLanguage(code) {
    const lower = code.toLowerCase();
    if (lower.includes('@keyframes') || lower.includes('animation:') || lower.includes('transform:')) return 'css';
    if (lower.includes('function ') || lower.includes('=>')) return 'javascript';
    if (lower.includes('<div') || lower.includes('<html')) return 'html';
    return 'text';
}

function generateDescription(tweet, codeBlocks) {
    const text = tweet.text.toLowerCase();
    const hasMedia = tweet.media && tweet.media.length > 0;

    // Extract keywords from tweet text
    const keywords = {
        'toggle': 'Interactive toggle component',
        'button': 'Button with enhanced styling',
        'card': 'Card layout with animation',
        'slider': 'Custom range slider control',
        'input': 'Styled form input',
        'text': 'Text effect or typography',
        'shimmer': 'Shimmer/loading animation',
        'glow': 'Glowing visual effect',
        'morph': 'Shape-morphing animation',
        'scroll': 'Scroll-driven animation',
        'parallax': 'Parallax scrolling effect',
        'hover': 'Hover interaction effect',
        'transition': 'Smooth transition effect',
        'animation': 'CSS animation',
        'gradient': 'Gradient effect',
        'blur': 'Blur filter effect',
        'reveal': 'Content reveal animation',
        'modal': 'Modal dialog component',
        'dropdown': 'Dropdown menu',
        'tooltip': 'Tooltip component',
        'accordion': 'Accordion expand/collapse',
    };

    // Check for keyword matches
    for (const [keyword, description] of Object.entries(keywords)) {
        if (text.includes(keyword)) {
            return description.charAt(0).toUpperCase() + description.slice(1);
        }
    }

    // Analyze code patterns
    if (codeBlocks.length > 0) {
        const code = codeBlocks[0].code.toLowerCase();
        if (code.includes('@keyframes') || code.includes('animation')) {
            return 'CSS keyframe animation';
        }
        if (code.includes('transform') || code.includes('translate')) {
            return 'CSS transform effect';
        }
        if (code.includes('filter')) {
            return 'CSS filter effect';
        }
        if (code.includes('view-timeline')) {
            return 'Scroll-driven animation using View Timeline API';
        }
        if (code.includes('anchor')) {
            return 'CSS Anchor Positioning component';
        }
        if (code.includes('--') && code.includes('var(')) {
            return 'Custom property-powered effect';
        }
    }

    // Media-based fallback
    if (hasMedia) {
        return 'Interactive UI component with visual effects';
    }

    // Default
    return 'UI effect or component';
}

function formatTweetComponent(tweet, index) {
    const date = new Date(tweet.createdAt).toLocaleDateString('en-US', {
        year: 'numeric', month: 'short', day: 'numeric'
    });
    const username = tweet.author.username;
    const id = tweet.id;
    const tweetUrl = tweet.url || `https://x.com/${username}/status/${id}`;
    const hasMedia = tweet.media && tweet.media.length > 0;

    let markdown = '## ' + date + '\n\n';

    // Visual Component Preview (if available)
    if (hasMedia) {
        markdown += '### 📱 Visual Component\n\n';
        tweet.media.forEach((media, i) => {
            const imgUrl = media.url || media.previewUrl || '';
            markdown += '![Result](' + imgUrl + ')\n\n';
        });
    }

    // Description
    const codeBlocks = extractCodeWithLanguage(tweet.text);
    const description = generateDescription(tweet, codeBlocks);
    markdown += '### 📝 Description\n\n';
    markdown += description + '.\n\n';

    // Code Block
    if (codeBlocks.length > 0) {
        markdown += '### 💻 Code\n\n';
        codeBlocks.forEach((block) => {
            markdown += '```' + block.language + '\n' + block.code + '\n```\n\n';
        });
    }

    // Explanation (tweet text)
    markdown += '### 💬 Explanation\n\n';
    markdown += tweet.text + '\n\n';

    // Metadata
    markdown += '**Source:** ' + tweetUrl + '\n';
    markdown += '**Author:** @' + username + '\n\n';

    markdown += '---\n\n';

    return markdown;
}

function parseArgs(argv) {
    const args = {};
    for (let i = 2; i < argv.length; i += 1) {
        const key = argv[i];
        if (!key.startsWith('--')) continue;
        const value = argv[i + 1];
        args[key.slice(2)] = value;
        i += 1;
    }
    return args;
}

async function main() {
    const args = parseArgs(process.argv);
    const username = args.username || 'jh3yy';
    const years = (args.years || '2024,2025,2026')
        .split(',')
        .map((year) => Number(year.trim()))
        .filter((year) => Number.isFinite(year));

    console.log('\n📦 Component + Code Export for @' + username);
    console.log('═'.repeat(50));

    // Fetch bookmarks
    console.log('\n📥 Fetching bookmarks...');
    const output = execFileSync('pnpm', ['run', 'xkit', 'bookmarks', '--all', '--json'], {
        encoding: 'utf-8',
        stdio: ['inherit', 'pipe', 'inherit'],
        maxBuffer: 50 * 1024 * 1024,
    });

    const jsonStart = output.indexOf('{');
    const data = JSON.parse(output.slice(jsonStart));
    const allTweets = data.tweets || data;

    // Filter
    const filtered = allTweets.filter((tweet) => {
        const isJh3yy = tweet.author?.username === username;
        const tweetYear = new Date(tweet.createdAt).getFullYear();
        return isJh3yy && years.includes(tweetYear);
    });

    console.log('   ✅ Found ' + filtered.length + ' tweets');

    // Organize by year
    const byYear = {};
    filtered.forEach(tweet => {
        const year = new Date(tweet.createdAt).getFullYear();
        if (!byYear[year]) byYear[year] = [];
        byYear[year].push(tweet);
    });

    // Create output directories
    const componentsDir = 'knowledge/' + username + '-components';
    const completeDir = 'knowledge/' + username + '-complete';
    if (!existsSync(componentsDir)) {
        mkdirSync(componentsDir, { recursive: true });
    }
    if (!existsSync(completeDir)) {
        mkdirSync(completeDir, { recursive: true });
    }

    // Generate files for both directories
    const sortedYears = Object.keys(byYear).sort((a, b) => b.localeCompare(a));
    for (const year of sortedYears) {
        const tweets = byYear[year];

        // jh3yy-components directory
        const componentsFile = join(componentsDir, username + '-components-' + year + '.md');
        let componentsMarkdown = '# @' + username + ' Code Components - ' + year + '\n\n';
        componentsMarkdown += '**Generated:** ' + new Date().toISOString() + '\n';
        componentsMarkdown += '**Total:** ' + tweets.length + ' components\n';
        componentsMarkdown += '**Source:** https://x.com/' + username + '\n\n';
        componentsMarkdown += '---\n\n';
        tweets.forEach((tweet, i) => {
            componentsMarkdown += formatTweetComponent(tweet, i);
        });
        writeFileSync(componentsFile, componentsMarkdown, 'utf-8');
        console.log('   💾 components/' + year + ': ' + componentsFile);

        // jh3yy-complete directory
        const completeFile = join(completeDir, username + '-code-effects-' + year + '.md');
        let completeMarkdown = '# @' + username + ' Code Effects - ' + year + '\n\n';
        completeMarkdown += '**Generated:** ' + new Date().toISOString() + '\n';
        completeMarkdown += '**Total Tweets:** ' + tweets.length + '\n';
        completeMarkdown += '**Source:** https://x.com/' + username + '\n\n';
        completeMarkdown += '---\n\n';
        tweets.forEach((tweet, i) => {
            completeMarkdown += formatTweetComponent(tweet, i);
        });
        writeFileSync(completeFile, completeMarkdown, 'utf-8');
        console.log('   💾 complete/' + year + ': ' + completeFile);
    }

    // Combined files for both directories
    // Components combined
    const componentsCombined = join(componentsDir, username + '-components-all.md');
    let componentsCombinedMarkdown = '# @' + username + ' Code Components - All Years\n\n';
    componentsCombinedMarkdown += '**Generated:** ' + new Date().toISOString() + '\n';
    componentsCombinedMarkdown += '**Total:** ' + filtered.length + ' components\n';
    componentsCombinedMarkdown += '**Source:** https://x.com/' + username + '\n\n';
    componentsCombinedMarkdown += '---\n\n';
    for (const year of sortedYears) {
        const tweets = byYear[year];
        componentsCombinedMarkdown += '## ' + year + ' (' + tweets.length + ' components)\n\n';
        tweets.forEach((tweet, i) => {
            componentsCombinedMarkdown += formatTweetComponent(tweet, i);
        });
    }
    writeFileSync(componentsCombined, componentsCombinedMarkdown, 'utf-8');
    console.log('   💾 components combined: ' + componentsCombined);

    // Complete combined
    const completeCombined = join(completeDir, username + '-code-effects-all-years.md');
    let completeCombinedMarkdown = '# @' + username + ' Code Effects - All Years\n\n';
    completeCombinedMarkdown += '**Generated:** ' + new Date().toISOString() + '\n';
    completeCombinedMarkdown += '**Total Tweets:** ' + filtered.length + '\n';
    completeCombinedMarkdown += '**Source:** https://x.com/' + username + '\n\n';
    completeCombinedMarkdown += '---\n\n';
    for (const year of sortedYears) {
        const tweets = byYear[year];
        completeCombinedMarkdown += '## ' + year + ' (' + tweets.length + ' tweets)\n\n';
        tweets.forEach((tweet, i) => {
            completeCombinedMarkdown += formatTweetComponent(tweet, i);
        });
    }
    writeFileSync(completeCombined, completeCombinedMarkdown, 'utf-8');
    console.log('   💾 complete combined: ' + completeCombined);

    console.log('\n✅ Export complete!');
    console.log('\nFormat per tweet:');
    console.log('1. 📱 Visual Component (image/video preview)');
    console.log('2. 📝 Description (what the component does)');
    console.log('3. 💻 Code Block (syntax highlighted)');
    console.log('4. 💬 Explanation (tweet text)');
    console.log('\nDirectories:');
    console.log('  knowledge/' + username + '-components/');
    console.log('  knowledge/' + username + '-complete/');
}

main().catch(console.error);
