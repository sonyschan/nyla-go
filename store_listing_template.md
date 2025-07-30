# Chrome Web Store Listing Template

## Basic Information
- **Name**: NYLA Go
- **Summary**: Simplify NYLA cryptocurrency transfers on X.com with QR codes
- **Category**: Productivity
- **Language**: English
- **Version**: 0.5.0

## Store Description

### Short Description (132 characters max)
Easily send NYLA tokens on X.com with simple forms and mobile QR codes.

### Detailed Description
Send NYLA cryptocurrency easily on X.com without typing complex commands. Just fill out a simple form and click send, or scan a QR code on your phone.

**What it does:**
• Converts recipient, amount, and token into proper NYLA transfer commands
• Generates QR codes with the NYLA logo for mobile users
• Automatically detects who you're replying to on X.com
• Remembers your settings for faster transfers

**Why you need it:**
• Skip learning complex command formats
• Transfer from mobile by scanning QR codes  
• Avoid typos in transfer commands
• Speed up your NYLA transactions on social media

**How it works:**
1. Open the extension while on X.com
2. Fill in recipient, amount, and token
3. Click "Send to X.com" or scan the QR code on mobile
4. Your transfer command appears ready to post

Supports NYLA, SOL, ETH, USDC, USDT and custom tokens across multiple blockchains.

---

## Store Assets Needed

### Icons ✅
- [x] 16x16 PNG (icon16.png)
- [x] 32x32 PNG (icon32.png) 
- [x] 48x48 PNG (icon48.png)
- [x] 128x128 PNG (icon128.png)

### Screenshots (Still Needed)
- [ ] Main extension popup with QR toggle (1280x800 recommended)
- [ ] QR code view with NYLA logo (1280x800)
- [ ] Extension in action on X.com (1280x800)
- [ ] Mobile QR scanning demonstration (optional)
- [ ] Custom token management modal (optional)

### Promotional Images (Optional)
- [ ] Small promotional tile (440x280)
- [ ] Large promotional tile (920x680)
- [ ] Marquee promotional tile (1400x560)

---

## Developer Information

### Contact & Links
- **Developer Website**: [Add your website/GitHub]
- **Support Email**: [Add your email]
- **Privacy Policy**: ✅ Included (privacy_policy.md)
- **Terms of Service**: [Optional but recommended]

### Permissions Requested
- **activeTab**: Required to detect X.com pages and insert transfer commands
- **scripting**: Required to interact with X.com's compose boxes  
- **storage**: Required to save user preferences locally
- **host_permissions**: 
  - **x.com and twitter.com**: For core extension functionality
  - **api.qrserver.com**: For generating QR codes from transfer commands
  - **chart.googleapis.com**: For backup QR code generation service
  - **ipfs.io**: For loading the official NYLA logo displayed in QR codes

---

## Beta Testing Configuration

### Visibility
- **Private** (for initial beta testing)
- **Unlisted** (for broader beta before public release)

### Test Group
- Up to 20 testers by email for private beta
- Share extension ID: `chrome-extension://[your-extension-id-here]`

---

## Submission Checklist

- [x] Extension package created (nyla-go-v0.5.0.zip)
- [x] All icons generated and included
- [x] Privacy policy updated for QR Code feature
- [x] Manifest.json properly configured with new permissions
- [x] Store description updated with QR Code features
- [x] QR Code functionality implemented and tested
- [ ] Screenshots taken (including QR Code views)
- [ ] Chrome Web Store Developer account ($5 fee)
- [ ] Extension uploaded and submitted for review

---

**Next Steps:**
1. Take screenshots showing QR Code feature and NYLA logo integration
2. Register Chrome Web Store Developer account (if not done)
3. Upload nyla-go-v0.5.0.zip and configure listing
4. Highlight Send/Receive tabs and dark theme in store listing
5. Submit for review (1-7 days typical review time)

**🎯 Marketing Highlights for v0.5.0:**
- **Send/Receive Tabs**: Complete payment workflow system
- **Professional Dark Theme**: Modern UI with orange brand colors
- **QR-First Receive**: Instant payment request generation
- **Web App Ready**: Architecture prepared for PWA deployment