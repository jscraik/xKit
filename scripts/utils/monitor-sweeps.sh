#!/bin/bash

echo "=== Profile Sweep Monitor ==="
echo "Time: $(date '+%H:%M:%S')"
echo ""

# Check if sweeps are running
if pgrep -f "profile-sweep jh3yy" > /dev/null; then
    echo "✓ @jh3yy sweep is running"
else
    echo "✗ @jh3yy sweep is not running"
fi

if pgrep -f "profile-sweep kubadesign" > /dev/null; then
    echo "✓ @kubadesign sweep is running"
else
    echo "✗ @kubadesign sweep is not running"
fi

echo ""
echo "=== @jh3yy Progress ==="
if [ -f "jh3yy-sweep-full.log" ]; then
    tail -15 jh3yy-sweep-full.log | grep -E "(Fetching|Fetched|Extracting|Found|Analyzing|complete|Summary)" || echo "No progress yet"
else
    echo "Log file not found"
fi

echo ""
echo "=== @kubadesign Progress ==="
if [ -f "kubadesign-sweep-full.log" ]; then
    tail -15 kubadesign-sweep-full.log | grep -E "(Fetching|Fetched|Extracting|Found|Analyzing|complete|Summary)" || echo "No progress yet"
else
    echo "Log file not found"
fi

echo ""
echo "Run this script again to check progress: ./monitor-sweeps.sh"
