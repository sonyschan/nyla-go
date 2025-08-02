# CLAUDE.md - Memory for Claude Code Assistant

This file contains important information for Claude to remember across sessions.

## 🚀 NYLA Go Release Process Checklist

### 🔄 **Pre-Release Development**
- [ ] **Feature Development Complete** - All planned features implemented and tested
- [ ] **Code Quality Check** - No console errors, clean functionality
- [ ] **Cross-tab Testing** - Send/Receive/Raid tabs all working properly
- [ ] **Version Display Test** - **CRITICAL**: Verify version on bottom of page matches release tag:
  - [ ] **Extension**: Load extension → Check bottom shows "NYLA Go v[X.X.X]"
  - [ ] **PWA**: Visit https://sonyschan.github.io/nyla-go/ → Check footer shows "NYLA Go v[X.X.X]"
  - [ ] **Both must match the intended release version exactly**

### 🏷️ **Version Management**

#### 📝 **Semantic Versioning Guidelines**
Follow semantic versioning (X.Y.Z) to determine appropriate version increments:

**Major Version (X.y.z):**
- First number represents a major release
- Signifies breaking changes that are NOT backward compatible
- Older versions may not work with new major version without modifications
- Examples: Significant architectural changes, API overhauls, removal of deprecated features
- **Use when**: Major UX overhauls, breaking API changes, significant feature removals

**Minor Version (x.Y.z):**
- Second number represents a minor release
- Addition of new features or functionality that ARE backward compatible
- Users can upgrade without expecting existing code/configurations to break
- **Use when**: New tabs, new features, UI enhancements, new integrations

**Patch Version (x.y.Z):**
- Third number represents a patch release
- Backward-compatible bug fixes or minor improvements
- Most frequent release type for small, non-breaking enhancements  
- **Use when**: Bug fixes, small UX improvements, security patches, minor optimizations

**Decision Priority:** If user doesn't specify version type, choose based on change impact using above guidelines.

- [ ] **1. Update Version Tag in ALL Files** - Bump version number following semantic versioning:
  - [ ] `manifest.json` - Extension version
  - [ ] `popup.html` - Extension UI version display (fallback only)
  - [ ] `pwa/index.html` - PWA version display (fallback only)
  - [ ] `pwa/js/app.js` - **CRITICAL**: PWA APP_VERSION hardcoded value
  - [ ] `pwa/sw.js` - **CRITICAL**: Service worker CACHE_NAME version (forces cache refresh)
  - [ ] `popup.js` - Extension fallback version (updateAppVersion function)
  - [ ] `CLAUDE.md` - Current version reference
- [ ] **2. Update All Documentation** for new version:
  - [ ] `README.md` - **CRITICAL**: Version badge AND download links (nyla-go-v[X.X.X].zip)
  - [ ] `store_listing_template.md` - Package names and marketing highlights  
  - [ ] `privacy_policy.md` - Version coverage
  - [ ] `SECURITY.md` - Release scan version (placeholder first)

### 📋 **Privacy & Security Review**
- [ ] **4. Update Privacy Policy** - Review if new features require privacy policy updates
  - [ ] New data collection/usage patterns
  - [ ] External service integrations
  - [ ] Permission changes
- [ ] **4. Update Security Documentation** - Review if new features affect security
  - [ ] New permissions or capabilities
  - [ ] External API integrations
  - [ ] Attack surface changes
  - [ ] Security best practices compliance

### 📦 **Release Creation**
- [ ] **Create Git Tags** - REQUIRED before GitHub releases:
  ```bash
  git tag v[X.X.X] [commit-hash]
  git push origin v[X.X.X]
  ```
- [ ] **Create GitHub Releases** - Use correct `gh release create` syntax (AVOID --body flag):
  ```bash
  # ✅ CORRECT syntax (use --notes, NOT --body):
  gh release create v[X.X.X] --title "NYLA Go v[X.X.X] - Title" --notes "$(cat <<'EOF'
  Release notes content here...
  EOF
  )"
  
  # ❌ WRONG syntax (--body flag doesn't exist):
  # gh release create v[X.X.X] --body "content"  # This will ERROR!
  ```
  - [ ] Include comprehensive release notes with features/fixes
  - [ ] Add links to PWA and full changelog
  - [ ] Use consistent formatting with previous releases
- [ ] **Create Release Package** - Generate `nyla-go-v[X.X.X].zip`
- [ ] **Commit Version Updates** - Push all documentation changes

### 🔒 **Security Verification**
- [ ] **3. Upload to VirusTotal** - Scan the new release package
- [ ] **Send VirusTotal Link** - Provide new verification URL
- [ ] **Update Security Documentation** - Replace placeholder with actual scan results
- [ ] **Commit Security Updates** - Push VirusTotal changes

### 📝 **Post-Release Documentation**
- [ ] **Release Notes** - Ensure comprehensive changelog
- [ ] **Marketing Updates** - Update store listing highlights for new features
- [ ] **User Communication** - Any necessary announcements

### 🧪 **Version Verification Commands**
Before creating any release, run these verification commands to ensure version consistency:

```bash
# Check all version references match intended release
RELEASE_VERSION="0.7.4"  # Update this to intended release version

echo "=== VERSION VERIFICATION FOR v$RELEASE_VERSION ==="
echo ""
echo "1. Extension manifest.json:"
grep -n "\"version\":" manifest.json

echo ""
echo "2. PWA hardcoded version (MUST match release):"
grep -n "APP_VERSION = " pwa/js/app.js

echo ""
echo "3. PWA Service Worker cache version (CRITICAL for cache refresh):"
grep -n "CACHE_NAME = " pwa/sw.js

echo ""
echo "4. Extension fallback version:"
grep -n "NYLA Go v0\." popup.js

echo ""
echo "5. PWA fallback version:"
grep -n "NYLA Go v0\." pwa/index.html

echo ""
echo "6. README version badge:"
grep -n "Version-" README.md

echo ""
echo "7. README download link:"
grep -n "nyla-go-v" README.md

echo ""
echo "8. CLAUDE.md version reference:"
grep -n "Latest Release" CLAUDE.md

echo ""
echo "✅ ALL VERSIONS ABOVE MUST SHOW: $RELEASE_VERSION"
echo "❌ If any version is different, UPDATE IT before release!"
```

### 🎯 **Core Steps Summary:**
1. ✅ **Run version verification commands** - Ensure ALL versions match intended release
2. ✅ **Update version tag** (manifest.json + pwa/js/app.js + popup.js + CLAUDE.md)
3. ✅ **Update README** for new release tag (version badge + download links)  
4. ✅ **Test version display** - Load extension and PWA to verify displayed versions
5. ✅ **Create Chrome Store package** - Extension-only ZIP without PWA files
6. ✅ **Move release files to /releases directory** - Organize all release artifacts
7. ✅ **Create git tags and GitHub releases** with proper changelog
8. ✅ **Redo VirusTotal** & send new verify link
9. ✅ **Update privacy and security documents** for any new features/changes

## 🏪 Chrome Store Packaging

### ⚠️ **CRITICAL: Multiple Manifest Issue**
Chrome Web Store will **reject packages with multiple manifest.json files**. Our project has:
- `manifest.json` (Extension manifest) 
- `pwa/manifest.json` (PWA manifest)

### 📦 **Create Extension-Only Package:**
```bash
# CRITICAL: Don't forget raid-data.js file!
# Create extension package directory
mkdir -p extension-package

# Copy ONLY extension files (exclude PWA directory)
cp manifest.json popup.html popup.js content.js qr-simple.js GO-BACKGROUND.png NYLAGO-Logo-v2.png raid-data.js extension-package/
cp -r icons extension-package/

# Create Chrome Store ZIP package - IMPORTANT: Create directly in releases directory to avoid path issues
cd extension-package
zip -r ../releases/nyla-go-v${RELEASE_VERSION}-extension-only.zip . -x "*.DS_Store"
cd ..

# Clean up temporary directory
rm -rf extension-package
```

### ⚠️ **CRITICAL: Packaging Lessons Learned (v1.4.4 - v1.4.5)**

#### **Directory Structure & Navigation Issues:**
1. **Missing raid-data.js**: Don't forget to include `raid-data.js` - it's required for the Raid tab functionality
2. **Directory Navigation**: Create ZIP directly in `releases/` to avoid path confusion and nested directory issues
3. **Git Staging**: The ZIP file path should be `releases/nyla-go-v${VERSION}-extension-only.zip` when adding to git
4. **Common Error**: Using `../nyla-go-v${VERSION}-extension-only.zip` creates file in wrong location
5. **Working Directory**: Always ensure you're in the project root when running packaging commands

#### **File System Navigation Problems (v1.4.5):**
6. **Claude Code Directory Restrictions**: Cannot use `cd ..` to navigate above working directory - blocked for security
7. **Nested Directory Confusion**: Creating ZIP from subdirectory causes path resolution issues
8. **ZIP Location Verification**: Always use full path verification after ZIP creation: `ls -la releases/filename.zip`
9. **Path Resolution**: Use `pwd` and `find` commands to locate files when path confusion occurs
10. **Cleanup Timing**: Remove temporary directories AFTER verifying ZIP file creation, not before

#### **Safe Command Patterns:**
```bash
# ✅ CORRECT: Avoid directory navigation issues
cd extension-package && zip -r ../releases/nyla-go-v${VERSION}-extension-only.zip .

# ❌ WRONG: Causes directory navigation errors  
cd extension-package && zip -r ../nyla-go-v${VERSION}-extension-only.zip . && cd ..

# ✅ CORRECT: Verify file creation before cleanup
ls -la releases/nyla-go-v${VERSION}-extension-only.zip && rm -rf extension-package

# ✅ CORRECT: Use find to locate files when confused
find . -name "*v${VERSION}*.zip" -type f
```

#### **Directory Structure Map:**
```
/Users/sonyschan/NYLAgo/ (PROJECT ROOT - Always work from here)
├── manifest.json
├── popup.html, popup.js
├── content.js, qr-simple.js, raid-data.js
├── GO-BACKGROUND.png, NYLAGO-Logo-v2.png
├── icons/ (directory with all icon files)
├── pwa/ (EXCLUDE from extension package)
├── releases/ (TARGET: ZIP files go here)
└── extension-package/ (TEMPORARY: Delete after ZIP creation)
```

### 📁 **Extension Package Contents:**
- ✅ `manifest.json` (extension only, without "scripting" permission)
- ✅ `popup.html` & `popup.js` 
- ✅ `content.js`
- ✅ `qr-simple.js`
- ✅ `raid-data.js` ⚠️ **CRITICAL: Don't forget this file!**
- ✅ `icons/` directory (all icon files)
- ✅ `GO-BACKGROUND.png` & `NYLAGO-Logo-v2.png`
- ❌ **EXCLUDE**: `pwa/` directory (contains conflicting manifest)

### ⚠️ **Chrome Store Permission Requirements:**
- **REMOVED**: `"scripting"` permission (causes review delays)
- **KEPT**: `"activeTab"`, `"storage"`, `"tabs"` (essential permissions)
- **FUNCTIONALITY**: Uses content scripts instead of scripting API for X.com interaction

### 🚫 **Files to EXCLUDE from Chrome Store Package:**
- `pwa/` directory (contains PWA manifest)
- `CLAUDE.md`, `README.md`, documentation files
- `.git/`, `.github/`, development files
- `releases/`, `screenshots/`, `design/` directories

## 📁 Release File Management

### 📂 **All Release Files Go to `/releases` Directory:**
```bash
# Move all release artifacts to releases directory
mv nyla-go-v${RELEASE_VERSION}-extension-only.zip releases/
```

### 📋 **Release Directory Structure:**
```
releases/
├── nyla-go-v1.3.5-extension-only.zip    # Chrome Store package
├── previous-versions/                     # Older releases
└── README.md                             # Release notes
```

## 📋 Project Information

### Current Version
- **Latest Release**: v1.5.0
- **Features**: PWA with professional branding, expanded App tab (Memes & Gaming categories), simplified Raid tab with ticker search, extension UI improvements, dynamic versioning, enhanced UX, JavaScript error fixes, updated splash video

### Key Files Structure
- `manifest.json` - Extension configuration and version
- `popup.html` - Main UI with dark theme
- `popup.js` - Core functionality and tab switching (with comprehensive null checks)
- `qr-simple.js` - QR code generation library
- `content.js` - X.com page integration with enhanced debugging
- `README.md` - Main documentation
- `SECURITY.md` - Security documentation
- `privacy_policy.md` - Privacy policy
- `pwa/` - Progressive Web App directory
  - `pwa/index.html` - PWA main interface with video splash screen
  - `pwa/js/app.js` - PWA functionality with localStorage
  - `pwa/video/NYLAGo-v2.mp4` - Updated splash video

### Architecture
- **Three-tab system**: Send | Receive | Raid
- **Dark theme**: Black background with orange (#FF6B35) accents, gray (#888888) version text
- **QR generation**: Uses SimpleQR with NYLA logo integration
- **Progressive Web App**: Full PWA with splash video, offline functionality, home screen installation
- **Extension**: Chrome extension with comprehensive error handling and null checks
- **Dual deployment**: Extension and PWA versions with shared functionality

### Testing Commands
- Run lint: `npm run lint` (if available)
- Run typecheck: `npm run typecheck` (if available)
- Always test all three tabs before release

## 🔧 Development Notes

### UI/UX Guidelines
- Maintain dark theme consistency
- Use orange (#FF6B35) for primary actions and accents
- Use gray (#888888) for version text and subtle elements
- Keep QR codes prominent in receive tab
- Ensure mobile-first design principles
- Video splash screen duration: 4+ seconds for PWA

### Security Best Practices
- Never expose secrets or private keys
- Always update VirusTotal scans for new releases
- Maintain minimal required permissions
- Clear disclosure of external services (QR generation, IPFS)

### Code Conventions
- **ALWAYS add null checks** for DOM elements before use
- Follow existing patterns in popup.js
- Maintain tab switching logic consistency
- Use TodoWrite tool for complex multi-step tasks
- Keep functions modular for easy testing
- Avoid duplicate variable declarations
- Test extension functionality after JavaScript changes
- **CRITICAL: Test version display** after any version changes - load both extension and PWA

### Directory & File System Best Practices
- **Always start from project root**: `/Users/sonyschan/NYLAgo/` before any packaging commands
- **Use pwd command**: Verify current directory before running commands
- **Claude Code limitations**: Cannot navigate above working directory with `cd ..`
- **ZIP verification**: Always verify ZIP file creation with `ls -la releases/filename.zip`
- **Path troubleshooting**: Use `find . -name "*pattern*" -type f` to locate files
- **Cleanup timing**: Verify file creation BEFORE removing temporary directories
- **Git staging**: Use relative paths from project root: `git add releases/filename.zip`

### Recent Fixes (v0.7.2-v0.7.4)
- **JavaScript Error Handling**: Comprehensive null checks added to prevent console errors
- **Extension Tab Switching**: Fixed broken tab functionality with proper DOM element validation
- **PWA Splash Video**: Updated to NYLAGo-v2.mp4 for improved user experience
- **Version Text Styling**: Consistent gray color across extension and PWA
- **Username Detection**: Enhanced debugging for X.com integration

### Release Workflow Lessons Learned (v1.4.4)
- **File Staging Order**: Always commit version updates first, then add ZIP package separately
- **Git Reset Strategy**: Use `git reset --soft HEAD~1` to undo commits while keeping changes staged
- **Directory Management**: Avoid nested directory confusion by always working from project root
- **ZIP File Location**: Create ZIP directly in `releases/` directory to avoid path issues
- **Missing Files**: Include all required files in checklist - `raid-data.js` is essential for Raid tab
- **Git Path Issues**: Use relative paths like `releases/filename.zip` when adding to git
- **Commit Messages**: Use detailed commit messages with proper formatting for release history

## 🚀 GitHub Release Process

### Git Tag Creation Commands
```bash
# Create tags for releases
git tag v[X.X.X] [commit-hash]
git push origin v[X.X.X]

# Example:
git tag v0.7.4 5f0f37b
git push origin v0.7.4
```

### GitHub Release Commands
```bash
# Create release with notes
gh release create v[X.X.X] --title "NYLA Go v[X.X.X] - [Title]" --notes "$(cat <<'EOF'
## [Icon] [Category]

### [Feature/Fix Title]
- **[Description]** - [Details]
- **[Description]** - [Details]

### Technical Changes
- [Technical detail 1]
- [Technical detail 2]

**Full Changelog:** https://github.com/sonyschan/nyla-go/compare/v[PREV]...v[CURR]

**🌐 [Try the PWA](https://sonyschan.github.io/nyla-go/)**

---
🤖 *Generated with Claude Code*
EOF
)"
```

### Release Note Templates
- **🐛 Bug Fixes & Improvements** - For error fixes and stability
- **🎬 PWA Enhancement** - For Progressive Web App updates  
- **📝 Documentation & Maintenance** - For docs and housekeeping
- **✨ New Features** - For new functionality
- **🔒 Security Updates** - For security-related changes

## 🗄️ GitHub Pages Cache Management

### Cache Sources & Solutions
GitHub Pages has multiple cache layers that can cause old versions to persist:

1. **Service Worker Cache** (Primary Issue)
   - **Problem**: Old service worker with outdated cache name
   - **Solution**: Update `CACHE_NAME` in `pwa/sw.js` for each release
   - **Effect**: Forces browser to download new assets

2. **CDN Cache** (GitHub's Edge Servers)
   - **Problem**: GitHub's CDN caches files for performance
   - **Solution**: Usually clears within 10-15 minutes after deployment
   - **Manual**: No direct control, wait for automatic clearing

3. **Browser Cache** (User's Browser)
   - **Problem**: Browser caches files locally
   - **Solutions**:
     - Hard refresh: `Ctrl+F5` (Windows) or `Cmd+Shift+R` (Mac)
     - Clear browser cache for the site
     - Open in incognito/private mode

### Force Cache Refresh Commands
```bash
# After updating service worker cache name, verify deployment
gh run list --limit 1
# Wait for "completed success" status

# Check if PWA shows new version (may take 5-15 minutes)
curl -s "https://sonyschan.github.io/nyla-go/js/app.js" | grep "APP_VERSION"
```

### Cache Debugging Tips
- **Always update service worker cache name** when releasing
- **Wait 10-15 minutes** after successful deployment
- **Test in incognito mode** to bypass browser cache
- **Check browser developer tools** → Application → Service Workers

## 🚨 Directory & File System Troubleshooting

### Common Directory Navigation Errors

#### **Error**: `cd to '/Users/sonyschan' was blocked`
```bash
# ❌ PROBLEM: Trying to navigate above working directory
cd extension-package && zip -r ../nyla-go-v1.4.5.zip . && cd ..

# ✅ SOLUTION: Stay within allowed directory structure  
cd extension-package && zip -r ../releases/nyla-go-v1.4.5.zip .
```

#### **Error**: `ls: releases/filename.zip: No such file or directory`
```bash
# ❌ PROBLEM: Wrong current directory or file path
ls -la releases/nyla-go-v1.4.5.zip

# ✅ SOLUTION: Check current directory and find file
pwd  # Verify you're in project root
find . -name "*v1.4.5*.zip" -type f  # Locate the file
```

#### **Error**: `fatal: pathspec 'releases/filename.zip' did not match any files`
```bash
# ❌ PROBLEM: Git staging path incorrect or file doesn't exist
git add releases/nyla-go-v1.4.5.zip

# ✅ SOLUTION: Verify file exists and use correct path
ls -la releases/nyla-go-v1.4.5.zip  # Confirm file exists
git add releases/nyla-go-v1.4.5.zip  # Stage with correct path
```

### Directory Recovery Commands
```bash
# When confused about current location:
pwd  # Shows current directory
cd /Users/sonyschan/NYLAgo  # Navigate to project root

# When can't find created files:
find . -name "*.zip" -type f  # Find all ZIP files
find . -name "*v1.4.5*" -type f  # Find version-specific files

# When git staging fails:
git status  # Check which files are actually changed
ls -la releases/  # Verify ZIP file exists in releases directory
```

### Prevention Checklist
- ✅ Always start commands from project root: `/Users/sonyschan/NYLAgo/`
- ✅ Use `pwd` to verify current directory before complex operations
- ✅ Create ZIP directly in target directory: `../releases/filename.zip`
- ✅ Verify file creation before cleanup: `ls -la releases/filename.zip`
- ✅ Use `find` commands when path confusion occurs
- ✅ Clean up temporary directories AFTER verifying outputs

## ⚠️ Common Command Errors & Fixes

### GitHub CLI Release Command
**❌ Error**: `unknown flag: --body`
```bash
# WRONG - This will fail:
gh release create v0.7.6 --body "content"
```

**✅ Fix**: Use `--notes` instead of `--body`:
```bash
# CORRECT - This works:
gh release create v0.7.6 --title "Title" --notes "content"
```

**🔧 Prevention**: Git alias configured for consistent usage:
```bash
# Already set up - use this format:
git config --global alias.release-create '!f() { gh release create "$1" --title "$2" --notes "$3"; }; f'
```

### Other Common Errors
- **Git Permission Issues**: Use SSH keys instead of HTTPS
- **Missing GitHub Token**: Run `gh auth login` to authenticate
- **Wrong Branch**: Verify you're on master/main before tagging