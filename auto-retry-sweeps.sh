#!/bin/bash

# Auto-retry script for profile sweeps when rate limited

USERS=("jh3yy" "kubadesign")
LIMIT=3200
MAX_RETRIES=5
RETRY_DELAY=480  # 8 minutes in seconds

for user in "${USERS[@]}"; do
    echo "========================================="
    echo "Processing @${user}"
    echo "========================================="
    
    retry_count=0
    success=false
    
    while [ $retry_count -lt $MAX_RETRIES ] && [ "$success" = false ]; do
        echo ""
        echo "Attempt $((retry_count + 1)) of $MAX_RETRIES for @${user}"
        echo "Time: $(date)"
        
        # Run the sweep
        output=$(node dist/cli.js profile-sweep "$user" --limit "$LIMIT" --create-skill 2>&1)
        exit_code=$?
        
        echo "$output"
        
        # Check if rate limited
        if echo "$output" | grep -q "Rate limited"; then
            # Extract wait time from output
            wait_time=$(echo "$output" | grep -oP "Try again in \K[0-9]+" || echo "$RETRY_DELAY")
            
            echo ""
            echo "⏳ Rate limited. Waiting ${wait_time} seconds..."
            echo "   Will retry at: $(date -v+${wait_time}S 2>/dev/null || date -d "+${wait_time} seconds" 2>/dev/null || date)"
            
            sleep "$wait_time"
            retry_count=$((retry_count + 1))
        elif echo "$output" | grep -q "✨ Profile sweep complete"; then
            echo ""
            echo "✅ Successfully completed sweep for @${user}"
            success=true
        else
            echo ""
            echo "❌ Unexpected error for @${user}"
            break
        fi
    done
    
    if [ "$success" = false ]; then
        echo ""
        echo "❌ Failed to complete sweep for @${user} after $MAX_RETRIES attempts"
    fi
    
    echo ""
done

echo "========================================="
echo "All sweeps completed!"
echo "========================================="
