#!/usr/bin/env node

/**
 * Domain Analysis Script
 * 
 * Analyzes bookmarks by extracting and categorizing domains.
 * Groups bookmarks by domain and identifies the most common sources.
 * 
 * Input: Exported bookmark JSON (via stdin)
 * Output: Enriched bookmark JSON with domain analysis (via stdout)
 */

const fs = require('fs');

// Read input from stdin
let inputData = '';
process.stdin.on('data', (chunk) => {
    inputData += chunk;
});

process.stdin.on('end', () => {
    try {
        const exportData = JSON.parse(inputData);
        const bookmarks = exportData.bookmarks || [];

        // Extract domain from URL
        const extractDomain = (url) => {
            try {
                const urlObj = new URL(url);
                return urlObj.hostname.replace(/^www\./, '');
            } catch {
                return 'unknown';
            }
        };

        // Categorize domains
        const categorizeDomain = (domain) => {
            const categories = {
                'github.com': 'development',
                'stackoverflow.com': 'development',
                'medium.com': 'blog',
                'dev.to': 'blog',
                'youtube.com': 'video',
                'twitter.com': 'social',
                'x.com': 'social',
                'reddit.com': 'social',
                'arxiv.org': 'research',
                'news.ycombinator.com': 'news',
            };

            return categories[domain] || 'general';
        };

        // Count domains
        const domainCounts = {};
        bookmarks.forEach((bookmark) => {
            const domain = extractDomain(bookmark.url);
            domainCounts[domain] = (domainCounts[domain] || 0) + 1;
        });

        // Enrich bookmarks with domain analysis
        const enrichedBookmarks = bookmarks.map((bookmark) => {
            const domain = extractDomain(bookmark.url);
            const domainCategory = categorizeDomain(domain);

            return {
                ...bookmark,
                customAnalysis: {
                    ...(bookmark.customAnalysis || {}),
                    domain,
                    domainCategory,
                    domainFrequency: domainCounts[domain],
                },
            };
        });

        // Output enriched data
        const output = {
            ...exportData,
            bookmarks: enrichedBookmarks,
            metadata: {
                ...exportData.metadata,
                domainAnalysis: {
                    totalDomains: Object.keys(domainCounts).length,
                    topDomains: Object.entries(domainCounts)
                        .sort(([, a], [, b]) => b - a)
                        .slice(0, 10)
                        .map(([domain, count]) => ({ domain, count })),
                },
            },
        };

        console.log(JSON.stringify(output, null, 2));
    } catch (error) {
        console.error('Error processing bookmarks:', error.message);
        process.exit(1);
    }
});
