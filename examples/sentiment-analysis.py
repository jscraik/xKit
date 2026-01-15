#!/usr/bin/env python3

"""
Sentiment Analysis Script

Analyzes the sentiment of bookmark text using simple keyword-based heuristics.
Assigns sentiment scores (positive, negative, neutral) to each bookmark.

Input: Exported bookmark JSON (via stdin)
Output: Enriched bookmark JSON with sentiment analysis (via stdout)
"""

import json
import sys
import re

# Simple sentiment lexicons
POSITIVE_WORDS = {
    'good', 'great', 'excellent', 'amazing', 'awesome', 'fantastic', 'wonderful',
    'love', 'best', 'perfect', 'brilliant', 'outstanding', 'superb', 'incredible',
    'helpful', 'useful', 'valuable', 'important', 'interesting', 'insightful'
}

NEGATIVE_WORDS = {
    'bad', 'terrible', 'awful', 'horrible', 'worst', 'poor', 'disappointing',
    'hate', 'useless', 'broken', 'failed', 'error', 'problem', 'issue', 'bug',
    'difficult', 'confusing', 'complicated', 'frustrating', 'annoying'
}

def analyze_sentiment(text):
    """
    Analyze sentiment of text using keyword matching.
    Returns sentiment label and score.
    """
    if not text:
        return 'neutral', 0.0
    
    # Normalize text
    text_lower = text.lower()
    words = re.findall(r'\b\w+\b', text_lower)
    
    # Count positive and negative words
    positive_count = sum(1 for word in words if word in POSITIVE_WORDS)
    negative_count = sum(1 for word in words if word in NEGATIVE_WORDS)
    
    # Calculate sentiment score (-1 to 1)
    total_sentiment_words = positive_count + negative_count
    if total_sentiment_words == 0:
        return 'neutral', 0.0
    
    score = (positive_count - negative_count) / total_sentiment_words
    
    # Determine sentiment label
    if score > 0.2:
        sentiment = 'positive'
    elif score < -0.2:
        sentiment = 'negative'
    else:
        sentiment = 'neutral'
    
    return sentiment, round(score, 2)

def main():
    try:
        # Read input from stdin
        input_data = sys.stdin.read()
        export_data = json.loads(input_data)
        
        bookmarks = export_data.get('bookmarks', [])
        
        # Enrich bookmarks with sentiment analysis
        enriched_bookmarks = []
        sentiment_counts = {'positive': 0, 'negative': 0, 'neutral': 0}
        
        for bookmark in bookmarks:
            text = bookmark.get('text', '')
            sentiment, score = analyze_sentiment(text)
            sentiment_counts[sentiment] += 1
            
            enriched_bookmark = {
                **bookmark,
                'customAnalysis': {
                    **(bookmark.get('customAnalysis', {})),
                    'sentiment': sentiment,
                    'sentimentScore': score
                }
            }
            enriched_bookmarks.append(enriched_bookmark)
        
        # Output enriched data
        output = {
            **export_data,
            'bookmarks': enriched_bookmarks,
            'metadata': {
                **export_data.get('metadata', {}),
                'sentimentAnalysis': {
                    'positive': sentiment_counts['positive'],
                    'negative': sentiment_counts['negative'],
                    'neutral': sentiment_counts['neutral']
                }
            }
        }
        
        print(json.dumps(output, indent=2))
        
    except Exception as error:
        print(f'Error processing bookmarks: {error}', file=sys.stderr)
        sys.exit(1)

if __name__ == '__main__':
    main()
