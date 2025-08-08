#!/bin/bash

# NYLA Go Version Consistency Check Hook
# Ensures all version references are synchronized across the project

set -e

# Colors for output
RED='\033[0;31m'
YELLOW='\033[1;33m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🏷️  NYLA Go: Version Consistency Check${NC}"

# Extract versions from different files
get_version() {
    local file="$1"
    local pattern="$2"
    
    if [[ -f "$file" ]]; then
        grep -o "$pattern" "$file" | head -1 | grep -o '[0-9]\+\.[0-9]\+\.[0-9]\+' || echo "not_found"
    else
        echo "file_missing"
    fi
}

# Version extraction patterns
manifest_version=$(get_version "manifest.json" '"version":\s*"[^"]*"')
app_version=$(get_version "pwa/js/app.js" 'APP_VERSION = ['\''"][^'\''"]*['\''"]')
sw_version=$(get_version "pwa/sw.js" 'CACHE_NAME = ['\''"][^'\''"]*v[0-9]\+\.[0-9]\+\.[0-9]\+[^'\''"]*['\''"]')
popup_version=$(get_version "popup.js" 'NYLA Go v[0-9]\+\.[0-9]\+\.[0-9]\+')
readme_version=$(get_version "README.md" 'Version-[0-9]\+\.[0-9]\+\.[0-9]\+')
claude_version=$(get_version "CLAUDE.md" 'Latest Release.*v[0-9]\+\.[0-9]\+\.[0-9]\+')

echo "📋 Version Summary:"
echo "  manifest.json:     $manifest_version"
echo "  pwa/js/app.js:     $app_version"
echo "  pwa/sw.js:         $sw_version"
echo "  popup.js:          $popup_version"
echo "  README.md:         $readme_version"
echo "  CLAUDE.md:         $claude_version"

# Collect all valid versions
versions=()
if [[ "$manifest_version" != "not_found" && "$manifest_version" != "file_missing" ]]; then
    versions+=("$manifest_version")
fi
if [[ "$app_version" != "not_found" && "$app_version" != "file_missing" ]]; then
    versions+=("$app_version")
fi
if [[ "$sw_version" != "not_found" && "$sw_version" != "file_missing" ]]; then
    versions+=("$sw_version")
fi
if [[ "$popup_version" != "not_found" && "$popup_version" != "file_missing" ]]; then
    versions+=("$popup_version")
fi
if [[ "$readme_version" != "not_found" && "$readme_version" != "file_missing" ]]; then
    versions+=("$readme_version")
fi
if [[ "$claude_version" != "not_found" && "$claude_version" != "file_missing" ]]; then
    versions+=("$claude_version")
fi

# Check consistency
if [[ ${#versions[@]} -eq 0 ]]; then
    echo -e "${RED}❌ No version information found in any file${NC}"
    exit 1
fi

# Find the most common version
primary_version=$(printf '%s\n' "${versions[@]}" | sort | uniq -c | sort -nr | head -1 | awk '{print $2}')
inconsistent_files=()

echo ""
echo -e "${BLUE}🎯 Primary version detected: ${GREEN}$primary_version${NC}"

# Check each file for consistency
if [[ "$manifest_version" != "$primary_version" && "$manifest_version" != "file_missing" ]]; then
    inconsistent_files+=("manifest.json ($manifest_version)")
fi
if [[ "$app_version" != "$primary_version" && "$app_version" != "file_missing" ]]; then
    inconsistent_files+=("pwa/js/app.js ($app_version)")
fi
if [[ "$sw_version" != "$primary_version" && "$sw_version" != "file_missing" ]]; then
    inconsistent_files+=("pwa/sw.js ($sw_version)")
fi
if [[ "$popup_version" != "$primary_version" && "$popup_version" != "file_missing" ]]; then
    inconsistent_files+=("popup.js ($popup_version)")
fi
if [[ "$readme_version" != "$primary_version" && "$readme_version" != "file_missing" ]]; then
    inconsistent_files+=("README.md ($readme_version)")
fi
if [[ "$claude_version" != "$primary_version" && "$claude_version" != "file_missing" ]]; then
    inconsistent_files+=("CLAUDE.md ($claude_version)")
fi

# Report results
if [[ ${#inconsistent_files[@]} -eq 0 ]]; then
    echo -e "${GREEN}✅ All version references are consistent${NC}"
else
    echo -e "${YELLOW}⚠️  Version inconsistencies detected:${NC}"
    for file in "${inconsistent_files[@]}"; do
        echo -e "  • $file"
    done
    
    echo ""
    echo -e "${BLUE}🔧 To fix version inconsistencies:${NC}"
    echo ""
    
    # Provide specific update commands
    if [[ " ${inconsistent_files[*]} " =~ "manifest.json" ]]; then
        echo -e "${GREEN}# Update manifest.json:${NC}"
        echo "sed -i '' 's/\"version\": \"[^\"]*\"/\"version\": \"$primary_version\"/' manifest.json"
        echo ""
    fi
    
    if [[ " ${inconsistent_files[*]} " =~ "pwa/js/app.js" ]]; then
        echo -e "${GREEN}# Update pwa/js/app.js:${NC}"
        echo "sed -i '' \"s/APP_VERSION = ['\\\"][^'\\\"]*['\\\"]/APP_VERSION = '$primary_version'/\" pwa/js/app.js"
        echo ""
    fi
    
    if [[ " ${inconsistent_files[*]} " =~ "pwa/sw.js" ]]; then
        echo -e "${GREEN}# Update pwa/sw.js:${NC}"
        echo "sed -i '' \"s/CACHE_NAME = ['\\\"][^'\\\"]*['\\\"]/CACHE_NAME = 'nyla-go-v$primary_version'/\" pwa/sw.js"
        echo ""
    fi
    
    if [[ " ${inconsistent_files[*]} " =~ "popup.js" ]]; then
        echo -e "${GREEN}# Update popup.js:${NC}"
        echo "sed -i '' 's/NYLA Go v[0-9]\\+\\.[0-9]\\+\\.[0-9]\\+/NYLA Go v$primary_version/g' popup.js"
        echo ""
    fi
    
    if [[ " ${inconsistent_files[*]} " =~ "README.md" ]]; then
        echo -e "${GREEN}# Update README.md:${NC}"
        echo "sed -i '' 's/Version-[0-9]\\+\\.[0-9]\\+\\.[0-9]\\+/Version-$primary_version/g' README.md"
        echo "sed -i '' 's/nyla-go-v[0-9]\\+\\.[0-9]\\+\\.[0-9]\\+/nyla-go-v$primary_version/g' README.md"
        echo ""
    fi
    
    if [[ " ${inconsistent_files[*]} " =~ "CLAUDE.md" ]]; then
        echo -e "${GREEN}# Update CLAUDE.md:${NC}"
        echo "sed -i '' 's/Latest Release.*v[0-9]\\+\\.[0-9]\\+\\.[0-9]\\+/Latest Release**: v$primary_version/' CLAUDE.md"
        echo ""
    fi
    
    echo -e "${BLUE}💡 Consider using the version verification commands in CLAUDE.md${NC}"
fi

# Check for release preparation indicators
changed_files=$(git diff --cached --name-only 2>/dev/null || echo "")
version_files_changed=false

while IFS= read -r file; do
    if [[ "$file" =~ ^(manifest\.json|pwa/js/app\.js|pwa/sw\.js|popup\.js|README\.md|CLAUDE\.md)$ ]]; then
        version_files_changed=true
        break
    fi
done <<< "$changed_files"

if [[ $version_files_changed == true ]]; then
    echo ""
    echo -e "${BLUE}🚀 Version-related files changed - Release preparation detected${NC}"
    echo -e "${YELLOW}📋 Pre-release checklist reminders:${NC}"
    echo -e "  • Test version display in extension and PWA"
    echo -e "  • Update service worker cache name for PWA cache refresh"
    echo -e "  • Verify download links in README.md"
    echo -e "  • Run full test suite before tagging"
fi

# Always allow commit to proceed (warnings only)
exit 0