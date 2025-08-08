#!/bin/bash

# NYLA Go PWA Asset Validation Hook
# Ensures PWA assets are complete and properly committed

set -e

# Colors for output
RED='\033[0;31m'
YELLOW='\033[1;33m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🌐 NYLA Go: PWA Asset Validation${NC}"

# Critical PWA files
critical_pwa_files=(
    "pwa/index.html"
    "pwa/manifest.json"
    "pwa/sw.js"
    "pwa/js/app.js"
    "pwa/css/nyla-assistant.css"
    "pwa/video/NYLAGo-v2.mp4"
)

# PWA asset directories
asset_directories=(
    "pwa/js/"
    "pwa/css/"
    "pwa/icons/"
    "pwa/images/"
    "pwa/data/"
    "pwa/video/"
)

echo -e "${BLUE}🔍 Checking critical PWA files...${NC}"

missing_critical=()
for file in "${critical_pwa_files[@]}"; do
    if [[ ! -f "$file" ]]; then
        missing_critical+=("$file")
    fi
done

if [[ ${#missing_critical[@]} -gt 0 ]]; then
    echo -e "${RED}❌ Missing critical PWA files:${NC}"
    for file in "${missing_critical[@]}"; do
        echo -e "  • $file"
    done
else
    echo -e "${GREEN}✅ All critical PWA files present${NC}"
fi

# Validate PWA manifest
if [[ -f "pwa/manifest.json" ]]; then
    echo ""
    echo -e "${BLUE}📋 Validating PWA manifest...${NC}"
    
    if jq empty pwa/manifest.json 2>/dev/null; then
        echo -e "${GREEN}✅ PWA manifest is valid JSON${NC}"
        
        # Check PWA required fields
        pwa_fields=("name" "short_name" "start_url" "display" "theme_color" "background_color" "icons")
        missing_pwa_fields=()
        
        for field in "${pwa_fields[@]}"; do
            if ! jq -e ".$field" pwa/manifest.json > /dev/null 2>&1; then
                missing_pwa_fields+=("$field")
            fi
        done
        
        if [[ ${#missing_pwa_fields[@]} -gt 0 ]]; then
            echo -e "${YELLOW}⚠️  Missing recommended PWA manifest fields:${NC}"
            for field in "${missing_pwa_fields[@]}"; do
                echo -e "  • $field"
            done
        else
            echo -e "${GREEN}✅ All recommended PWA manifest fields present${NC}"
        fi
        
        # Check icon declarations
        icon_count=$(jq '[.icons[]? | select(.src)] | length' pwa/manifest.json 2>/dev/null || echo "0")
        echo -e "${BLUE}🎨 PWA icons declared: $icon_count${NC}"
        
        if [[ $icon_count -lt 2 ]]; then
            echo -e "${YELLOW}⚠️  Consider adding more icon sizes for better PWA experience${NC}"
        fi
        
    else
        echo -e "${RED}❌ PWA manifest is invalid JSON${NC}"
    fi
fi

# Check service worker
if [[ -f "pwa/sw.js" ]]; then
    echo ""
    echo -e "${BLUE}⚙️  Validating service worker...${NC}"
    
    # Check for basic service worker structure
    if grep -q "addEventListener.*install" pwa/sw.js && grep -q "addEventListener.*fetch" pwa/sw.js; then
        echo -e "${GREEN}✅ Service worker has install and fetch event listeners${NC}"
    else
        echo -e "${YELLOW}⚠️  Service worker missing standard event listeners${NC}"
    fi
    
    # Check cache name for versioning
    if grep -q "CACHE_NAME.*v[0-9]" pwa/sw.js; then
        cache_version=$(grep -o "CACHE_NAME.*v[0-9]\+\.[0-9]\+\.[0-9]\+" pwa/sw.js | grep -o "v[0-9]\+\.[0-9]\+\.[0-9]\+" | head -1)
        echo -e "${GREEN}✅ Service worker cache versioned: $cache_version${NC}"
    else
        echo -e "${YELLOW}⚠️  Service worker cache name should include version for proper updates${NC}"
    fi
else
    echo -e "${RED}❌ Service worker missing: pwa/sw.js${NC}"
fi

# Check asset directories and sizes
echo ""
echo -e "${BLUE}📁 Checking PWA asset directories...${NC}"

total_pwa_size=0
large_assets=()

for dir in "${asset_directories[@]}"; do
    if [[ -d "$dir" ]]; then
        file_count=$(find "$dir" -type f | wc -l | tr -d ' ')
        dir_size=$(du -sb "$dir" 2>/dev/null | cut -f1 || echo "0")
        total_pwa_size=$((total_pwa_size + dir_size))
        
        # Convert size to readable format
        if [[ $dir_size -gt 1048576 ]]; then
            size_display=$(echo "scale=1; $dir_size / 1048576" | bc 2>/dev/null || echo ">1")MB
        elif [[ $dir_size -gt 1024 ]]; then
            size_display=$(echo "scale=1; $dir_size / 1024" | bc 2>/dev/null || echo ">1")KB
        else
            size_display="${dir_size}B"
        fi
        
        echo -e "${GREEN}✅ $dir: $file_count files ($size_display)${NC}"
        
        # Flag large directories (>10MB)
        if [[ $dir_size -gt 10485760 ]]; then
            large_assets+=("$dir ($size_display)")
        fi
        
    else
        echo -e "${YELLOW}⚠️  $dir: directory missing${NC}"
    fi
done

# Total PWA size
if [[ $total_pwa_size -gt 1048576 ]]; then
    total_size_display=$(echo "scale=1; $total_pwa_size / 1048576" | bc 2>/dev/null || echo ">1")MB
elif [[ $total_pwa_size -gt 1024 ]]; then
    total_size_display=$(echo "scale=1; $total_pwa_size / 1024" | bc 2>/dev/null || echo ">1")KB
else
    total_size_display="${total_pwa_size}B"
fi

echo -e "${BLUE}📊 Total PWA size: $total_size_display${NC}"

if [[ ${#large_assets[@]} -gt 0 ]]; then
    echo -e "${YELLOW}📁 Large asset directories:${NC}"
    for asset in "${large_assets[@]}"; do
        echo -e "  • $asset"
    done
    echo -e "${BLUE}💡 Consider optimizing large assets for better PWA performance${NC}"
fi

# Check for untracked PWA files
echo ""
echo -e "${BLUE}🔍 Checking for untracked PWA files...${NC}"

untracked_pwa_files=()
if git rev-parse --git-dir > /dev/null 2>&1; then
    # Get untracked files in PWA directory
    while IFS= read -r file; do
        if [[ "$file" == pwa/* && -f "$file" ]]; then
            untracked_pwa_files+=("$file")
        fi
    done < <(git ls-files --others --exclude-standard 2>/dev/null)
fi

if [[ ${#untracked_pwa_files[@]} -gt 0 ]]; then
    echo -e "${YELLOW}⚠️  Untracked PWA files detected:${NC}"
    for file in "${untracked_pwa_files[@]}"; do
        echo -e "  • $file"
    done
    echo -e "${BLUE}💡 Consider adding to git if these are production assets${NC}"
else
    echo -e "${GREEN}✅ No untracked PWA files${NC}"
fi

# Check video/media files
echo ""
echo -e "${BLUE}🎬 Checking media assets...${NC}"

media_extensions=("mp4" "webm" "ogg" "mp3" "wav" "png" "jpg" "jpeg" "gif" "svg")
media_files=()

for ext in "${media_extensions[@]}"; do
    while IFS= read -r file; do
        if [[ -n "$file" ]]; then
            media_files+=("$file")
        fi
    done < <(find pwa/ -name "*.${ext}" 2>/dev/null)
done

if [[ ${#media_files[@]} -gt 0 ]]; then
    echo -e "${GREEN}✅ Media files found: ${#media_files[@]}${NC}"
    
    # Check for large media files
    large_media=()
    for file in "${media_files[@]}"; do
        file_size=$(stat -c%s "$file" 2>/dev/null || stat -f%z "$file" 2>/dev/null || echo "0")
        if [[ $file_size -gt 5242880 ]]; then  # >5MB
            size_mb=$(echo "scale=1; $file_size / 1048576" | bc 2>/dev/null || echo ">5")
            large_media+=("$file (${size_mb}MB)")
        fi
    done
    
    if [[ ${#large_media[@]} -gt 0 ]]; then
        echo -e "${YELLOW}📹 Large media files (>5MB):${NC}"
        for file in "${large_media[@]}"; do
            echo -e "  • $file"
        done
    fi
else
    echo -e "${BLUE}ℹ️  No media files detected${NC}"
fi

# PWA deployment readiness check
changed_pwa_files=$(git diff --cached --name-only 2>/dev/null | grep "^pwa/" | head -5)
if [[ -n "$changed_pwa_files" ]]; then
    echo ""
    echo -e "${BLUE}🚀 PWA files changed - Deployment readiness:${NC}"
    echo -e "${YELLOW}🔄 Changed PWA files detected${NC}"
    echo -e "${BLUE}📋 Post-commit checklist:${NC}"
    echo -e "  • Test PWA functionality locally"
    echo -e "  • Verify service worker updates cache version"
    echo -e "  • Check GitHub Pages deployment"
    echo -e "  • Test PWA installation on mobile"
    echo -e "  • Validate offline functionality"
fi

echo ""
echo -e "${BLUE}🌐 PWA asset validation complete${NC}"

# Always allow commit to proceed
exit 0