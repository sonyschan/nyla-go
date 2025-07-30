# CLAUDE.md - Memory for Claude Code Assistant

This file contains important information for Claude to remember across sessions.

## 🚀 NYLA Go Release Process Checklist

### 🔄 **Pre-Release Development**
- [ ] **Feature Development Complete** - All planned features implemented and tested
- [ ] **Code Quality Check** - No console errors, clean functionality
- [ ] **Cross-tab Testing** - Send/Receive/Raid tabs all working properly

### 🏷️ **Version Management**
- [ ] **1. Update Version Tag in `manifest.json`** - Bump version number (e.g., 0.5.0 → 0.6.0)
- [ ] **2. Update All Documentation** for new version:
  - [ ] `README.md` - Version badge and download links
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
- [ ] **Create Release Package** - Generate `nyla-go-v[X.X.X].zip`
- [ ] **GitHub Release** - Create release with changelog and package
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

### 🎯 **Core Steps Summary:**
1. ✅ **Update version tag** (manifest.json + all docs)
2. ✅ **Update README** for new release tag (+ all version references)  
3. ✅ **Redo VirusTotal** & send new verify link
4. ✅ **Update privacy and security documents** for any new features/changes

## 📋 Project Information

### Current Version
- **Latest Release**: v0.7.3
- **Features**: PWA with Raid tab, extension UI improvements, dynamic versioning, enhanced UX, JavaScript error fixes, updated splash video

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

### Recent Fixes (v0.7.2-v0.7.3)
- **JavaScript Error Handling**: Comprehensive null checks added to prevent console errors
- **Extension Tab Switching**: Fixed broken tab functionality with proper DOM element validation
- **PWA Splash Video**: Updated to NYLAGo-v2.mp4 for improved user experience
- **Version Text Styling**: Consistent gray color across extension and PWA
- **Username Detection**: Enhanced debugging for X.com integration