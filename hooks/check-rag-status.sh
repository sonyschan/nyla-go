#!/bin/bash

# NYLA Go RAG Status Check Hook
# Comprehensive check of RAG system status and health

set -e

# Colors for output
RED='\033[0;31m'
YELLOW='\033[1;33m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

echo -e "${BLUE}🤖 NYLA Go: RAG System Status Check${NC}"
echo -e "${BLUE}====================================${NC}"

# Check for RAG-related files
rag_files=(
    "pwa/js/rag/nyla-embedding-service.js"
    "pwa/js/rag/nyla-vector-db.js"
    "pwa/js/rag/nyla-retriever.js"
    "pwa/js/rag/nyla-context-builder.js"
    "pwa/js/rag/nyla-deduplication-service.js"
    "pwa/js/rag/nyla-mmr-reranker.js"
    "pwa/js/rag/nyla-clustering-service.js"
    "pwa/js/rag/nyla-compression-service.js"
    "pwa/js/rag/nyla-content-filter.js"
)

missing_files=()
for file in "${rag_files[@]}"; do
    if [[ ! -f "$file" ]]; then
        missing_files+=("$file")
    fi
done

if [[ ${#missing_files[@]} -gt 0 ]]; then
    echo -e "${RED}❌ Missing RAG system files:${NC}"
    for file in "${missing_files[@]}"; do
        echo -e "  • $file"
    done
    echo ""
else
    echo -e "${GREEN}✅ All RAG system files present${NC}"
fi

# Check vector database status
vector_db="pwa/data/nyla-vector-db.json"
if [[ -f "$vector_db" ]]; then
    # Get file stats
    file_size=$(ls -lh "$vector_db" | awk '{print $5}')
    mod_time=$(ls -l "$vector_db" | awk '{print $6, $7, $8}')
    
    echo -e "${GREEN}✅ Vector database found${NC}"
    echo -e "  📁 Size: $file_size"
    echo -e "  📅 Modified: $mod_time"
    
    # Check if it's valid JSON (basic check)
    if jq empty "$vector_db" 2>/dev/null; then
        # Try to extract basic stats
        chunk_count=$(jq '.chunks | length' "$vector_db" 2>/dev/null || echo "unknown")
        version=$(jq -r '.version // "unknown"' "$vector_db" 2>/dev/null || echo "unknown")
        
        echo -e "  📊 Chunks: $chunk_count"
        echo -e "  🏷️  Version: $version"
        echo -e "${GREEN}✅ Vector database is valid JSON${NC}"
    else
        echo -e "${RED}❌ Vector database is corrupted (invalid JSON)${NC}"
        echo -e "${YELLOW}⚠️  Run: npm run build:embeddings${NC}"
    fi
else
    echo -e "${RED}❌ Vector database missing: $vector_db${NC}"
    echo -e "${YELLOW}⚠️  Run: npm run build:embeddings${NC}"
fi

# Check KB rebuild reminder file
if [[ -f ".kb-rebuild-needed" ]]; then
    echo ""
    echo -e "${YELLOW}🚨 PENDING RAG REBUILD REQUIRED${NC}"
    echo -e "${YELLOW}===============================${NC}"
    
    # Read the reminder file
    source .kb-rebuild-needed
    
    echo -e "${YELLOW}Knowledge base changes were detected previously:${NC}"
    if [[ -n "$CHANGED_FILES" ]]; then
        IFS=' ' read -ra files <<< "$CHANGED_FILES"
        for file in "${files[@]}"; do
            echo -e "  • $file"
        done
    fi
    
    echo -e "${YELLOW}Timestamp: $TIMESTAMP${NC}"
    echo ""
    echo -e "${RED}🔴 IMMEDIATE ACTION NEEDED:${NC}"
    echo -e "${GREEN}  npm run build:embeddings${NC}"
    echo -e "${GREEN}  git add pwa/data/nyla-vector-db.json${NC}"
    echo -e "${GREEN}  git commit -m 'Update RAG embeddings for KB changes'${NC}"
    echo -e "${GREEN}  rm .kb-rebuild-needed${NC}"
    echo ""
fi

# Check npm scripts for RAG commands
if [[ -f "package.json" ]]; then
    if jq -e '.scripts."build:embeddings"' package.json > /dev/null 2>&1; then
        echo -e "${GREEN}✅ RAG build script available: npm run build:embeddings${NC}"
    else
        echo -e "${RED}❌ Missing RAG build script in package.json${NC}"
        echo -e "${YELLOW}💡 Add: \"build:embeddings\": \"node pwa/js/rag/build-embeddings-nodejs.js\"${NC}"
    fi
fi

# Performance health check
echo ""
echo -e "${CYAN}📊 RAG Performance Guidelines:${NC}"
echo -e "  • Vector DB size: Should be 5-15MB for good performance"
echo -e "  • Chunk count: Optimal range 50-200 chunks"
echo -e "  • Rebuild frequency: After any KB changes"
echo -e "  • Query response: Target < 2 seconds"

# Integration status
changed_files_in_commit=$(git diff --cached --name-only 2>/dev/null || echo "")
rag_system_changed=false

if [[ -n "$changed_files_in_commit" ]]; then
    while IFS= read -r file; do
        if [[ "$file" == pwa/js/rag/* ]]; then
            rag_system_changed=true
            break
        fi
    done <<< "$changed_files_in_commit"
fi

if [[ $rag_system_changed == true ]]; then
    echo ""
    echo -e "${BLUE}🔧 RAG System Code Changes Detected${NC}"
    echo -e "${YELLOW}Consider testing RAG functionality after deployment${NC}"
fi

echo ""
echo -e "${BLUE}🔄 RAG System Status: ${NC}$(if [[ ${#missing_files[@]} -eq 0 && -f "$vector_db" ]]; then echo -e "${GREEN}HEALTHY${NC}"; else echo -e "${YELLOW}NEEDS ATTENTION${NC}"; fi)"

# Always allow commit to proceed
exit 0