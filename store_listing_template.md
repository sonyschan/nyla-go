# Chrome Web Store Listing Template

## Basic Information
- **Name**: NYLA Go
- **Summary**: Simplify NYLA cryptocurrency transfers on X.com with QR codes
- **Category**: Productivity
- **Language**: English
- **Version**: 0.4.0

## Store Description

### Short Description (132 characters max)
Generate NYLA transfer commands on X.com with mobile QR codes featuring the official NYLA logo.

### Detailed Description
Streamline NYLA cryptocurrency transfers on X.com with an intuitive interface that generates transfer commands and QR codes for mobile use. Perfect for crypto users who want to simplify their social media transfers.

**🚀 Key Features:**
• **Easy Transfer Setup** - Simple form interface with recipient, amount, and token selection
• **📱 Mobile QR Codes** - Generate scannable QR codes with the official NYLA logo for mobile transfers
• **Smart Auto-Detection** - Automatically detects reply recipients from X.com conversations  
• **Form Memory** - Remembers your previous inputs for convenience and speed
• **Seamless Integration** - Inserts transfer commands directly into X.com compose boxes
• **Multi-Token & Blockchain Support** - Supports NYLA, SOL, ETH, ALGO, USDC, USDT on multiple blockchains
• **Custom Token Management** - Add and manage your own custom tokens
• **Preview & QR Toggle** - Switch between text preview and scannable QR codes

**💡 How It Works:**
1. Navigate to X.com and click on any reply box or compose area
2. Click the NYLA Go icon in your browser toolbar
3. Fill in the recipient username, amount, and select cryptocurrency/blockchain
4. Toggle between text preview and QR code view
5. **Desktop**: Click "Send to X.com" to insert the command instantly
6. **Mobile**: Scan the QR code to open X.com with the command pre-filled

**📝 Generated Command Format:**
The extension generates clean, properly formatted commands:
```
Hey @AgentNyla transfer 50 $NYLA @username
Hey @AgentNyla transfer 100 $USDC @username Ethereum
```

**📱 QR Code Features:**
• Official NYLA logo centered in QR codes
• High error correction for reliable scanning
• Mobile-optimized URLs that open X.com compose
• Loading animation with smooth transitions

**🔒 Privacy & Security:**
• Form data stored locally in your browser
• QR generation uses trusted external services (api.qrserver.com, IPFS for logo)
• Only transfer command text shared for QR generation - no personal information
• No private keys, wallet data, or sensitive information collected
• No analytics or user tracking
• Transparent privacy policy included

**Perfect for crypto users, traders, and anyone who wants to streamline their NYLA transfers on social media with both desktop and mobile support.**

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

- [x] Extension package created (nyla-go-v0.4.0.zip)
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
3. Upload nyla-go-v0.4.0.zip and configure listing
4. Highlight QR Code and mobile features in store listing
5. Submit for review (1-7 days typical review time)

**🎯 Marketing Highlights for v0.4.0:**
- **Mobile-First Design**: QR codes for seamless mobile transfers
- **Official NYLA Branding**: Logo integration in QR codes
- **Cross-Platform**: Works on desktop and mobile
- **Professional UX**: Loading states and smooth transitions