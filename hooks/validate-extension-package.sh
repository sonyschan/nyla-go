#!/bin/bash

# NYLA Go Extension Package Validation Hook
# Ensures extension package integrity and Chrome Store compliance

set -e

# Colors for output
RED='\033[0;31m'
YELLOW='\033[1;33m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}📦 NYLA Go: Extension Package Validation${NC}"

# Required extension files
required_files=(
    "manifest.json"
    "popup.html"
    "popup.js"
    "content.js"
    "qr-simple.js"
    "GO-BACKGROUND.png"
    "NYLAGO-Logo-v2.png"
    "icons/icon-16.png"
    "icons/icon-32.png"
    "icons/icon-48.png"
    "icons/icon-128.png"
)

# Files that should NOT be in extension package
excluded_files=(
    "pwa/"
    "nylago-ui-data.js"
    ".git/"
    ".github/"
    "node_modules/"
    "tests/"
    "CLAUDE.md"
    "README.md"
    ".pre-commit-config.yaml"
    "hooks/"
)

missing_files=()
for file in "${required_files[@]}"; do
    if [[ ! -f "$file" && ! -d "$file" ]]; then
        missing_files+=("$file")
    fi
done

if [[ ${#missing_files[@]} -gt 0 ]]; then
    echo -e "${RED}❌ Missing required extension files:${NC}"
    for file in "${missing_files[@]}"; do
        echo -e "  • $file"
    done
else
    echo -e "${GREEN}✅ All required extension files present${NC}"
fi

# Validate manifest.json
if [[ -f "manifest.json" ]]; then
    echo ""
    echo -e "${BLUE}📋 Validating manifest.json...${NC}"
    
    # Check JSON validity
    if jq empty manifest.json 2>/dev/null; then
        echo -e "${GREEN}✅ manifest.json is valid JSON${NC}"
        
        # Check required fields
        required_fields=("manifest_version" "name" "version" "permissions" "action")
        missing_fields=()
        
        for field in "${required_fields[@]}"; do
            if ! jq -e ".$field" manifest.json > /dev/null 2>&1; then
                missing_fields+=("$field")
            fi
        done
        
        if [[ ${#missing_fields[@]} -gt 0 ]]; then
            echo -e "${RED}❌ Missing required manifest fields:${NC}"
            for field in "${missing_fields[@]}"; do
                echo -e "  • $field"
            done
        else
            echo -e "${GREEN}✅ All required manifest fields present${NC}"
        fi
        
        # Check permissions
        permissions=$(jq -r '.permissions[]? // empty' manifest.json | tr '\n' ' ')
        if [[ -n "$permissions" ]]; then
            echo -e "${BLUE}🔐 Permissions: $permissions${NC}"
            
            # Warn about problematic permissions
            if [[ "$permissions" =~ "scripting" ]]; then
                echo -e "${YELLOW}⚠️  'scripting' permission may cause Chrome Store review delays${NC}"
            fi
            
            if [[ "$permissions" =~ "\*://*/*" ]] || [[ "$permissions" =~ "<all_urls>" ]]; then
                echo -e "${YELLOW}⚠️  Broad host permissions may require justification${NC}"
            fi
        fi
        
        # Check version format
        version=$(jq -r '.version' manifest.json 2>/dev/null || echo "")
        if [[ "$version" =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
            echo -e "${GREEN}✅ Version format valid: $version${NC}"
        elif [[ -n "$version" ]]; then
            echo -e "${YELLOW}⚠️  Version format should be X.Y.Z: $version${NC}"
        fi
        
    else
        echo -e "${RED}❌ manifest.json is invalid JSON${NC}"
    fi
else
    echo -e "${RED}❌ manifest.json is missing${NC}"
fi

# Check icon files
echo ""
echo -e "${BLUE}🎨 Validating icon files...${NC}"

icon_sizes=("16" "32" "48" "128")
for size in "${icon_sizes[@]}"; do
    icon_file="icons/icon-${size}.png"
    if [[ -f "$icon_file" ]]; then
        # Check if it's a valid image file
        if file "$icon_file" | grep -q "PNG image data"; then
            # Try to get dimensions (requires ImageMagick or similar, fallback gracefully)
            if command -v identify >/dev/null 2>&1; then
                dimensions=$(identify "$icon_file" 2>/dev/null | awk '{print $3}' | head -1)
                if [[ "$dimensions" == "${size}x${size}" ]]; then
                    echo -e "${GREEN}✅ $icon_file: correct size ($dimensions)${NC}"
                else
                    echo -e "${YELLOW}⚠️  $icon_file: size is $dimensions, expected ${size}x${size}${NC}"
                fi
            else
                echo -e "${GREEN}✅ $icon_file: present (PNG format)${NC}"
            fi
        else
            echo -e "${RED}❌ $icon_file: not a valid PNG file${NC}"
        fi
    else
        echo -e "${RED}❌ $icon_file: missing${NC}"
    fi
done

# Check for PWA manifest conflict
echo ""
echo -e "${BLUE}🔍 Checking for Chrome Store conflicts...${NC}"

if [[ -f "pwa/manifest.json" ]]; then
    echo -e "${YELLOW}⚠️  PWA manifest detected at pwa/manifest.json${NC}"
    echo -e "${YELLOW}📝 Chrome Store packages should exclude pwa/ directory${NC}"
    echo -e "${BLUE}💡 Use extension-only packaging script${NC}"
fi

# Package size estimation
echo ""
echo -e "${BLUE}📏 Package size estimation...${NC}"

total_size=0
large_files=()

# Calculate size of required files
for file in "${required_files[@]}"; do
    if [[ -f "$file" ]]; then
        file_size=$(stat -c%s "$file" 2>/dev/null || stat -f%z "$file" 2>/dev/null || echo "0")
        total_size=$((total_size + file_size))
        
        # Flag large files (>1MB)
        if [[ $file_size -gt 1048576 ]]; then
            size_mb=$(echo "scale=1; $file_size / 1048576" | bc 2>/dev/null || echo "large")
            large_files+=("$file (${size_mb}MB)")
        fi
    elif [[ -d "$file" ]]; then
        dir_size=$(du -sb "$file" 2>/dev/null | cut -f1 || echo "0")
        total_size=$((total_size + dir_size))
    fi
done

# Convert to human readable
if [[ $total_size -gt 1048576 ]]; then
    size_display=$(echo "scale=1; $total_size / 1048576" | bc 2>/dev/null || echo ">1")MB
elif [[ $total_size -gt 1024 ]]; then
    size_display=$(echo "scale=1; $total_size / 1024" | bc 2>/dev/null || echo ">1")KB
else
    size_display="${total_size}B"
fi

echo -e "${BLUE}📊 Estimated package size: $size_display${NC}"

# Chrome Web Store has a 128MB limit, warn if approaching
if [[ $total_size -gt 104857600 ]]; then  # 100MB
    echo -e "${YELLOW}⚠️  Package size approaching Chrome Store 128MB limit${NC}"
fi

if [[ ${#large_files[@]} -gt 0 ]]; then
    echo -e "${YELLOW}📁 Large files detected:${NC}"
    for file in "${large_files[@]}"; do
        echo -e "  • $file"
    done
fi

# Extension packaging reminder
changed_files=$(git diff --cached --name-only 2>/dev/null || echo "")
extension_files_changed=false

while IFS= read -r file; do
    if [[ "$file" =~ ^(manifest\.json|popup\.(html|js)|content\.js|icons/.*\.png)$ ]]; then
        extension_files_changed=true
        break
    fi
done <<< "$changed_files"

if [[ $extension_files_changed == true ]]; then
    echo ""
    echo -e "${BLUE}🔧 Extension files changed - Packaging reminders:${NC}"
    echo -e "${YELLOW}📦 After release, create Chrome Store package:${NC}"
    echo -e "${GREEN}  mkdir -p extension-package${NC}"
    echo -e "${GREEN}  cp manifest.json popup.html popup.js content.js qr-simple.js *.png extension-package/${NC}"
    echo -e "${GREEN}  cp -r icons extension-package/${NC}"
    echo -e "${GREEN}  cd extension-package && zip -r ../releases/nyla-go-v\${VERSION}-extension-only.zip .${NC}"
    echo -e "${GREEN}  cd .. && rm -rf extension-package${NC}"
fi

echo ""
echo -e "${BLUE}📦 Extension validation complete${NC}"

# Always allow commit to proceed
exit 0