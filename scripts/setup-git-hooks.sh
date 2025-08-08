#!/bin/bash
#
# Setup Git Hooks for NYLA Project
# Configures pre-commit hooks for automatic embedding regeneration
#

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🔧 Setting up NYLA Git Hooks...${NC}"

# Get project root
PROJECT_ROOT=$(cd "$(dirname "$0")/.." && pwd)
cd "$PROJECT_ROOT"

# Check if we're in a git repository
if [ ! -d ".git" ]; then
    echo -e "${RED}❌ Not in a git repository${NC}"
    exit 1
fi

# Create .git/hooks directory if it doesn't exist
mkdir -p .git/hooks

# Check if pre-commit hook already exists
if [ -f ".git/hooks/pre-commit" ]; then
    echo -e "${YELLOW}⚠️  Pre-commit hook already exists${NC}"
    read -p "Do you want to overwrite it? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo -e "${YELLOW}⏭️  Keeping existing pre-commit hook${NC}"
        exit 0
    fi
fi

# Copy pre-commit hook
echo -e "${BLUE}📋 Installing pre-commit hook...${NC}"
cp ".githooks/pre-commit" ".git/hooks/pre-commit"
chmod +x ".git/hooks/pre-commit"

# Create scripts directory if needed
mkdir -p scripts

# Verify Node.js is available
if ! command -v node &> /dev/null; then
    echo -e "${YELLOW}⚠️  Node.js not found${NC}"
    echo -e "${YELLOW}💡 Please install Node.js to use the pre-commit hooks${NC}"
    echo -e "${YELLOW}   The hooks will work once Node.js is installed${NC}"
else
    NODE_VERSION=$(node --version)
    echo -e "${GREEN}✅ Node.js ${NODE_VERSION} detected${NC}"
fi

# Create package.json script entries if they don't exist
if [ -f "package.json" ]; then
    echo -e "${BLUE}📦 Adding npm scripts...${NC}"
    
    # Check if build:embeddings script exists
    if ! grep -q '"build:embeddings"' package.json; then
        # Add the script (this is a basic approach, ideally use jq)
        echo -e "${YELLOW}💡 Add this script to your package.json:${NC}"
        echo -e '  "build:embeddings": "node pwa/js/rag/build-embeddings.js"'
    fi
fi

# Create environment configuration
echo -e "${BLUE}⚙️  Configuration options:${NC}"
echo -e "${GREEN}Environment Variables:${NC}"
echo "  NYLA_SKIP_EMBEDDINGS=true    Skip embedding regeneration"
echo "  NYLA_AUTO_REGENERATE=true    Auto-regenerate without prompt"

# Test the hook installation
echo -e "${BLUE}🧪 Testing pre-commit hook...${NC}"
if .git/hooks/pre-commit --version &> /dev/null; then
    echo -e "${GREEN}✅ Pre-commit hook installed and executable${NC}"
else
    # Run a basic test
    echo -e "${BLUE}Running basic test...${NC}"
    bash -n .git/hooks/pre-commit
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ Pre-commit hook syntax is valid${NC}"
    else
        echo -e "${RED}❌ Pre-commit hook has syntax errors${NC}"
        exit 1
    fi
fi

echo ""
echo -e "${GREEN}🎉 Git hooks setup complete!${NC}"
echo ""
echo -e "${BLUE}📋 How it works:${NC}"
echo "  1. When you commit changes to knowledge base files"
echo "  2. The hook detects changes and asks if you want to regenerate embeddings"
echo "  3. If yes, embeddings are regenerated and staged for commit"
echo ""
echo -e "${BLUE}💡 Quick tips:${NC}"
echo "  • Skip embedding check: NYLA_SKIP_EMBEDDINGS=true git commit"
echo "  • Auto-regenerate embeddings: NYLA_AUTO_REGENERATE=true git commit"
echo "  • Manually regenerate: node pwa/js/rag/build-embeddings.js"
echo ""
echo -e "${GREEN}✅ You're all set!${NC}"