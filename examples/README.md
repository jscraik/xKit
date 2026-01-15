# Custom Analysis Scripts

This directory contains example custom analysis scripts that can be used with the bookmark analysis engine.

## Script Format

Custom analysis scripts should:

1. **Read input from stdin**: The script receives the exported bookmark JSON via standard input
2. **Process bookmarks**: Analyze and enrich the bookmark data
3. **Write output to stdout**: Output the enriched bookmark JSON to standard output
4. **Handle errors**: Exit with non-zero status code on errors

### Input Format

Scripts receive JSON in the following format:

```json
{
  "metadata": {
    "exportTimestamp": "2024-01-15T10:30:00Z",
    "totalCount": 100,
    "exporterVersion": "1.0.0"
  },
  "bookmarks": [
    {
      "id": "123",
      "url": "https://example.com",
      "text": "Example bookmark text",
      "authorUsername": "user",
      "authorName": "User Name",
      "createdAt": "2024-01-15T10:00:00Z",
      "likeCount": 10,
      "retweetCount": 5,
      "replyCount": 2
    }
  ]
}
```

### Output Format

Scripts should output JSON with enriched bookmarks:

```json
{
  "metadata": { ... },
  "bookmarks": [
    {
      "id": "123",
      "url": "https://example.com",
      "text": "Example bookmark text",
      ...
      "customAnalysis": {
        "domain": "example.com",
        "sentiment": "positive",
        "customField": "custom value"
      }
    }
  ]
}
```

## Available Scripts

### domain-analysis.js

Analyzes bookmarks by domain, extracting and categorizing the source domain of each bookmark.

**Usage:**

```bash
node examples/domain-analysis.js < bookmarks_export.json > bookmarks_with_domains.json
```

**Output fields:**

- `customAnalysis.domain`: The domain extracted from the URL
- `customAnalysis.domainCategory`: Category of the domain (development, blog, video, social, research, news, general)
- `customAnalysis.domainFrequency`: Number of bookmarks from this domain

**Metadata:**

- `metadata.domainAnalysis.totalDomains`: Total number of unique domains
- `metadata.domainAnalysis.topDomains`: Top 10 most frequent domains

### sentiment-analysis.py

Performs sentiment analysis on bookmark text using keyword-based heuristics.

**Usage:**

```bash
python3 examples/sentiment-analysis.py < bookmarks_export.json > bookmarks_with_sentiment.json
```

**Output fields:**

- `customAnalysis.sentiment`: Sentiment label (positive, negative, neutral)
- `customAnalysis.sentimentScore`: Sentiment score from -1 (negative) to 1 (positive)

**Metadata:**

- `metadata.sentimentAnalysis.positive`: Count of positive bookmarks
- `metadata.sentimentAnalysis.negative`: Count of negative bookmarks
- `metadata.sentimentAnalysis.neutral`: Count of neutral bookmarks

## Creating Custom Scripts

You can create your own analysis scripts in any language. Here's a template:

### JavaScript/Node.js Template

```javascript
#!/usr/bin/env node

let inputData = '';
process.stdin.on('data', (chunk) => {
  inputData += chunk;
});

process.stdin.on('end', () => {
  try {
    const exportData = JSON.parse(inputData);
    const bookmarks = exportData.bookmarks || [];

    // Your analysis logic here
    const enrichedBookmarks = bookmarks.map((bookmark) => ({
      ...bookmark,
      customAnalysis: {
        ...(bookmark.customAnalysis || {}),
        // Add your custom fields
        myField: 'myValue',
      },
    }));

    const output = {
      ...exportData,
      bookmarks: enrichedBookmarks,
    };

    console.log(JSON.stringify(output, null, 2));
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
});
```

### Python Template

```python
#!/usr/bin/env python3

import json
import sys

try:
    input_data = sys.stdin.read()
    export_data = json.loads(input_data)
    bookmarks = export_data.get('bookmarks', [])

    # Your analysis logic here
    enriched_bookmarks = []
    for bookmark in bookmarks:
        enriched_bookmark = {
            **bookmark,
            'customAnalysis': {
                **(bookmark.get('customAnalysis', {})),
                # Add your custom fields
                'myField': 'myValue'
            }
        }
        enriched_bookmarks.append(enriched_bookmark)

    output = {
        **export_data,
        'bookmarks': enriched_bookmarks
    }

    print(json.dumps(output, indent=2))

except Exception as error:
    print(f'Error: {error}', file=sys.stderr)
    sys.exit(1)
```

## Testing Scripts

You can test your scripts using the provided test data:

```bash
# Test with sample data
echo '{"metadata":{"exportTimestamp":"2024-01-15T10:00:00Z","totalCount":1},"bookmarks":[{"id":"1","url":"https://github.com/example/repo","text":"Great repository!","authorUsername":"user","authorName":"User","createdAt":"2024-01-15T10:00:00Z","likeCount":10,"retweetCount":5,"replyCount":2}]}' | node examples/domain-analysis.js
```

## Integration with Analysis Engine

To use custom scripts with the analysis engine, add them to your `.bookmark-analysis.config.json`:

```json
{
  "customScripts": [
    "./examples/domain-analysis.js",
    "./examples/sentiment-analysis.py"
  ]
}
```

Or pass them via command line:

```bash
bookmark-analysis --input bookmarks_export.json --scripts ./examples/domain-analysis.js,./examples/sentiment-analysis.py
```
