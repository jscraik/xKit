#!/bin/bash

# Example: Archive tweets from @jh3yy (CSS/JS code snippets)
# This demonstrates how to build a knowledge base from a specific user's tweets

echo "🚀 User Profile Archiving Example"
echo ""
echo "This will archive tweets from @jh3yy to your knowledge base."
echo "Perfect for collecting CSS and JavaScript code snippets!"
echo ""

# Check if xKit is configured
if ! command -v xkit &> /dev/null; then
    echo "❌ xKit not found. Please install it first:"
    echo "   npm install -g @brainwav/xkit"
    exit 1
fi

# Verify authentication
echo "📋 Checking authentication..."
if ! xkit whoami &> /dev/null; then
    echo "❌ Authentication failed. Please configure xKit first:"
    echo "   export AUTH_TOKEN='your_token'"
    echo "   export CT0='your_ct0'"
    echo "   Or use: xkit check"
    exit 1
fi

echo "✅ Authentication OK"
echo ""

# Example 1: One-time archive (markdown)
echo "📥 Example 1: One-time archive to markdown"
echo "   Fetching 50 most recent tweets from @jh3yy..."
node scripts/archive-user-profile.mjs jh3yy --limit 50

echo ""
echo "✅ Archive complete! Check knowledge/jh3yy-archive-*.md"
echo ""

# Example 2: JSON output for processing
echo "📥 Example 2: JSON output for custom processing"
echo "   Fetching 20 tweets as JSON..."
node scripts/archive-user-profile.mjs jh3yy --limit 20 --format json --output examples/jh3yy-sample.json

echo ""
echo "✅ JSON export complete! Check examples/jh3yy-sample.json"
echo ""

# Example 3: Show how to use the daemon
echo "📚 Example 3: Continuous archiving (daemon mode)"
echo ""
echo "To run continuous archiving, use:"
echo "   node scripts/archive-user-daemon.mjs --users @jh3yy --interval 60"
echo ""
echo "Or create a config file (examples/archive-config.json):"
cat examples/archive-config.json
echo ""
echo "Then run:"
echo "   node scripts/archive-user-daemon.mjs --config examples/archive-config.json"
echo ""

# Example 4: Multiple users
echo "📚 Example 4: Archive multiple users"
echo ""
echo "To archive multiple users at once:"
echo "   node scripts/archive-user-daemon.mjs --users @jh3yy,@addyosmani,@wesbos"
echo ""

echo "🎉 Examples complete!"
echo ""
echo "Next steps:"
echo "  1. Check the generated markdown files in knowledge/"
echo "  2. Customize the config file for your favorite users"
echo "  3. Run the daemon for continuous archiving"
echo "  4. Read the full guide: docs/user-profile-archiving.md"
