#!/bin/bash

echo "Waiting for rate limit to expire..."
echo "Current time: $(date '+%H:%M:%S')"
echo "Will retry at: $(date -v+850S '+%H:%M:%S')"

# Wait 850 seconds (14 minutes)
sleep 850

echo ""
echo "Rate limit should be expired. Starting sweeps..."
echo "Time: $(date '+%H:%M:%S')"

# Run jh3yy sweep
echo ""
echo "Starting @jh3yy sweep with 3200 tweets..."
node dist/cli.js profile-sweep jh3yy --limit 3200 --create-skill > jh3yy-sweep-full.log 2>&1 &
JH3YY_PID=$!
echo "jh3yy sweep started (PID: $JH3YY_PID)"

# Wait a bit to avoid hitting rate limit immediately
sleep 5

# Run kubadesign sweep
echo ""
echo "Starting @kubadesign sweep with 3200 tweets..."
node dist/cli.js profile-sweep kubadesign --limit 3200 --create-skill > kubadesign-sweep-full.log 2>&1 &
KUBA_PID=$!
echo "kubadesign sweep started (PID: $KUBA_PID)"

echo ""
echo "Both sweeps running in background"
echo "Monitor with:"
echo "  tail -f jh3yy-sweep-full.log"
echo "  tail -f kubadesign-sweep-full.log"
