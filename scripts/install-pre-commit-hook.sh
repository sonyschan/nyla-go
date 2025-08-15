#!/bin/bash
# Install pre-commit hook for NYLA Go
# This hook checks for KB changes and prompts to rebuild embeddings

set -e

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}🪝 Installing NYLA Go pre-commit framework...${NC}"

# Check if we're in project root
if [ ! -f "package.json" ] || [ ! -d "pwa" ]; then
    echo -e "${YELLOW}⚠️  Please run this script from the NYLA Go project root${NC}"
    exit 1
fi

# Install pre-commit framework if needed
if ! command -v pre-commit &> /dev/null; then
    echo -e "${YELLOW}⚠️  Installing pre-commit framework...${NC}"
    pip install pre-commit || brew install pre-commit || {
        echo -e "${RED}❌ Failed to install pre-commit. Please install manually:${NC}"
        echo -e "${BLUE}  pip install pre-commit${NC}"
        echo -e "${BLUE}  # or${NC}"
        echo -e "${BLUE}  brew install pre-commit${NC}"
        exit 1
    }
fi

# Install the hooks from .pre-commit-config.yaml
echo -e "${BLUE}📦 Installing pre-commit hooks...${NC}"
pre-commit install

# Test the installation
echo -e "${BLUE}🧪 Testing pre-commit setup...${NC}"
pre-commit run --all-files kb-changes-and-rag-check || echo -e "${YELLOW}ℹ️  Some checks may have run (this is normal for first install)${NC}"

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