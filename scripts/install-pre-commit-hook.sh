#!/bin/bash
# Install pre-commit hook for NYLA Go
# This hook checks for KB changes and prompts to rebuild embeddings

set -e

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}🪝 Installing NYLA Go pre-commit hook...${NC}"

# Check if we're in project root
if [ ! -f "package.json" ] || [ ! -d "pwa" ]; then
    echo -e "${YELLOW}⚠️  Please run this script from the NYLA Go project root${NC}"
    exit 1
fi

# Create the pre-commit hook
cat << 'EOF' > .git/hooks/pre-commit
#!/bin/bash
# NYLA Go Pre-commit Hook
# Checks for KB changes and prompts to rebuild embeddings

# Colors
RED='\033[0;31m'
YELLOW='\033[1;33m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m'

# Skip if disabled
if [ "$NYLA_SKIP_EMBEDDINGS" = "true" ]; then
    echo -e "${YELLOW}⏭️  Skipping embedding check (NYLA_SKIP_EMBEDDINGS=true)${NC}"
    exit 0
fi

# Check for KB file changes
KB_CHANGED=false
CHANGED_FILES=""

# Check staged files
STAGED_FILES=$(git diff --cached --name-only)

# KB file patterns to check
while IFS= read -r file; do
    if [[ "$file" =~ pwa/kb/.*\.json$ ]] || \
       [[ "$file" == "nylago-data.js" ]] || \
       [[ "$file" == "pwa/js/nyla-knowledge-base.js" ]]; then
        KB_CHANGED=true
        CHANGED_FILES="${CHANGED_FILES}\n  • $file"
    fi
done <<< "$STAGED_FILES"

if [ "$KB_CHANGED" = "true" ]; then
    echo -e "${YELLOW}🚨 Knowledge Base Changes Detected${NC}"
    echo -e "${YELLOW}Changed files:${NC}$CHANGED_FILES"
    echo ""
    
    # Check if embeddings are older than KB files
    EMBEDDINGS_FILE="pwa/data/nyla-vector-db.json"
    REBUILD_NEEDED=false
    
    if [ ! -f "$EMBEDDINGS_FILE" ]; then
        REBUILD_NEEDED=true
        echo -e "${RED}❌ Vector embeddings not found${NC}"
    else
        # Simple check: if embeddings file is not staged but KB files are
        if ! echo "$STAGED_FILES" | grep -q "$EMBEDDINGS_FILE"; then
            REBUILD_NEEDED=true
            echo -e "${YELLOW}⚠️  Embeddings not updated with KB changes${NC}"
        fi
    fi
    
    if [ "$REBUILD_NEEDED" = "true" ]; then
        echo ""
        echo -e "${BLUE}📋 To update embeddings, run:${NC}"
        echo -e "${GREEN}  npm run build:embeddings${NC}"
        echo -e "${GREEN}  git add pwa/data/nyla-vector-db.json embeddings-data/${NC}"
        echo ""
        
        # Ask user if they want to continue
        if [ "$NYLA_AUTO_REGENERATE" != "true" ]; then
            read -p "Continue commit without rebuilding embeddings? (y/N): " -n 1 -r
            echo
            if [[ ! "$REPLY" =~ ^[Yy]$ ]]; then
                echo -e "${YELLOW}💡 Commit cancelled. Please rebuild embeddings first.${NC}"
                exit 1
            fi
        fi
    else
        echo -e "${GREEN}✅ Embeddings appear to be updated${NC}"
    fi
fi

exit 0
EOF

# Make the hook executable
chmod +x .git/hooks/pre-commit

echo -e "${GREEN}✅ Pre-commit hook installed successfully!${NC}"
echo ""
echo -e "${BLUE}📋 How it works:${NC}"
echo "  • Detects changes to KB files (pwa/kb/*.json, nylago-data.js)"
echo "  • Checks if embeddings need rebuilding"
echo "  • Prompts to rebuild when KB changes are detected"
echo ""
echo -e "${BLUE}🔧 Configuration options:${NC}"
echo "  • Skip check: NYLA_SKIP_EMBEDDINGS=true git commit"
echo "  • Auto-proceed: NYLA_AUTO_REGENERATE=true git commit"
echo ""
echo -e "${GREEN}The hook is now active for all future commits!${NC}"