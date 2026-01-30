#!/bin/bash

# Auto-retry script for @doodlestein profile sweep
# This runs after the main auto-retry script completes

USER="doodlestein"
LIMIT=3200
MAX_RETRIES=5
RETRY_DELAY=480  # 8 minutes in seconds

echo "========================================="
echo "Waiting for main sweeps to complete..."
echo "========================================="

# Wait for the main auto-retry script to finish
while ps aux | grep -v grep | grep -q "auto-retry-sweeps.sh"; do
    echo "Main script still running, waiting 30 seconds..."
    sleep 30
done

echo ""
echo "Main sweeps completed. Starting @${USER} sweep..."
echo ""

echo "========================================="
echo "Processing @${USER}"
echo "========================================="

retry_count=0
success=false

while [ $retry_count -lt $MAX_RETRIES ] && [ "$success" = false ]; do
    echo ""
    echo "Attempt $((retry_count + 1)) of $MAX_RETRIES for @${USER}"
    echo "Time: $(date)"
    
    # Run the sweep
    output=$(node dist/cli.js profile-sweep "$USER" --limit "$LIMIT" --create-skill 2>&1)
    exit_code=$?
    
    echo "$output"
    
    # Check if rate limited
    if echo "$output" | grep -q "Rate limited"; then
        # Extract wait time from output (use basic grep for macOS compatibility)
        wait_time=$(echo "$output" | grep "Try again in" | sed 's/.*Try again in \([0-9]*\) seconds.*/\1/')
        
        if [ -z "$wait_time" ]; then
            wait_time=$RETRY_DELAY
        fi
        
        echo ""
        echo "⏳ Rate limited. Waiting ${wait_time} seconds..."
        echo "   Will retry at: $(date -v+${wait_time}S 2>/dev/null || date)"
        
        sleep "$wait_time"
        retry_count=$((retry_count + 1))
    elif echo "$output" | grep -q "✨ Profile sweep complete"; then
        echo ""
        echo "✅ Successfully completed sweep for @${USER}"
        success=true
    else
        echo ""
        echo "❌ Unexpected error for @${USER}"
        break
    fi
done

if [ "$success" = false ]; then
    echo ""
    echo "❌ Failed to complete sweep for @${USER} after $MAX_RETRIES attempts"
fi

echo ""
echo "========================================="
echo "@${USER} sweep completed!"
echo "========================================="
