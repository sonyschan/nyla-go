#!/bin/bash

# NYLA Go Knowledge Base Change Detection Hook
# Detects changes to knowledge base files and alerts for RAG rebuilding

set -e

# Colors for output
RED='\033[0;31m'
YELLOW='\033[1;33m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Knowledge base file patterns (CORRECTED TO ACTUAL STRUCTURE)
KB_FILES=(
    "nylago-data.js"
    "pwa/nylago-data.js"
    "pwa/kb/"
)

echo -e "${BLUE}🔍 NYLA Go: Detecting Knowledge Base Changes...${NC}"

# Check if any KB files were modified
kb_changed=false
changed_files=()

# Get list of changed files from git
if git rev-parse --verify HEAD >/dev/null 2>&1; then
    # Compare with previous commit
    changed_files_git=$(git diff --cached --name-only)
else
    # Initial commit
    changed_files_git=$(git diff --cached --name-only --diff-filter=A)
fi

# Check each changed file against KB patterns
while IFS= read -r file; do
    if [[ -n "$file" ]]; then
        for pattern in "${KB_FILES[@]}"; do
            if [[ "$file" == *"$pattern"* ]]; then
                kb_changed=true
                changed_files+=("$file")
                echo -e "${YELLOW}📝 Detected KB change: $file${NC}"
                break
            fi
        done
    fi
done <<< "$changed_files_git"

# Check if embeddings exist and are current
embeddings_file="pwa/data/nyla-vector-db.json"
embeddings_current=true

if [[ ! -f "$embeddings_file" ]]; then
    embeddings_current=false
    echo -e "${RED}❌ Vector embeddings file not found: $embeddings_file${NC}"
elif [[ $kb_changed == true ]]; then
    # Check if embeddings are older than KB files
    embeddings_time=$(stat -c %Y "$embeddings_file" 2>/dev/null || stat -f %m "$embeddings_file")
    
    for file in "${changed_files[@]}"; do
        if [[ -f "$file" ]]; then
            file_time=$(stat -c %Y "$file" 2>/dev/null || stat -f %m "$file")
            if [[ $file_time -gt $embeddings_time ]]; then
                embeddings_current=false
                echo -e "${RED}⚠️  KB file newer than embeddings: $file${NC}"
                break
            fi
        fi
    done
fi

# Generate warnings and recommendations
if [[ $kb_changed == true ]]; then
    echo ""
    echo -e "${YELLOW}🚨 KNOWLEDGE BASE CHANGES DETECTED${NC}"
    echo -e "${YELLOW}================================================${NC}"
    echo ""
    echo -e "${YELLOW}Changed KB files:${NC}"
    for file in "${changed_files[@]}"; do
        echo -e "  • $file"
    done
    echo ""
    
    if [[ $embeddings_current == false ]]; then
        echo -e "${RED}🔴 ACTION REQUIRED: RAG Embeddings Need Rebuilding${NC}"
        echo ""
        echo -e "${BLUE}Run these commands after commit:${NC}"
        echo -e "${GREEN}  npm run build:embeddings${NC}"
        echo -e "${GREEN}  git add pwa/data/nyla-vector-db.json${NC}"
        echo -e "${GREEN}  git commit -m 'Update RAG embeddings for KB changes'${NC}"
        echo ""
        echo -e "${YELLOW}⚠️  Users won't get updated information until embeddings are rebuilt!${NC}"
        echo ""
        
        # Create a reminder file
        echo "KB_CHANGES_DETECTED=true" > .kb-rebuild-needed
        echo "CHANGED_FILES='${changed_files[*]}'" >> .kb-rebuild-needed
        echo "COMMIT_HASH='$(git rev-parse HEAD 2>/dev/null || echo 'initial')'" >> .kb-rebuild-needed
        echo "TIMESTAMP='$(date -u +%Y-%m-%dT%H:%M:%SZ)'" >> .kb-rebuild-needed
        
        # Add reminder to git
        git add .kb-rebuild-needed 2>/dev/null || true
        
    else
        echo -e "${GREEN}✅ RAG embeddings appear current${NC}"
    fi
    
    echo ""
    echo -e "${BLUE}💡 Knowledge Base Change Guidelines:${NC}"
    echo -e "  • New features → rebuild embeddings → test queries"
    echo -e "  • Bug fix docs → consider if users need to know → rebuild if yes"  
    echo -e "  • API changes → rebuild embeddings → verify new workflows"
    echo -e "  • Security updates → rebuild embeddings immediately"
    echo ""
    
else
    echo -e "${GREEN}✅ No knowledge base changes detected${NC}"
fi

# Always allow commit to proceed
exit 0