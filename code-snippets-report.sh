#!/bin/bash

echo "# Code Snippets Report"
echo "Generated: $(date)"
echo ""

for user in jh3yy emilkowalski kubadesign; do
  echo "## @$user"
  echo ""
  
  if [ -f "artifacts/$user/${user}-sweep-2026-01-29.json" ]; then
    count=$(jq '.codeSnippets | length' artifacts/$user/${user}-sweep-2026-01-29.json)
    echo "**Total code snippets:** $count"
    echo ""
    
    if [ "$count" -gt 0 ]; then
      echo "### Snippets:"
      echo ""
      jq -r '.codeSnippets[] | "**Code:** `\(.code | gsub("\n"; " ") | .[0:100])`\n\n**Context:** \(.context)\n\n---\n"' \
        artifacts/$user/${user}-sweep-2026-01-29.json
    fi
  else
    echo "No sweep data found"
  fi
  echo ""
done
