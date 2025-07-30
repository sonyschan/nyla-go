# NYLA GO PWA - Payment Request Generator

A Progressive Web App for generating NYLA cryptocurrency payment request QR codes.

## 🚀 Features

- **QR Code Generation**: Create scannable payment request QR codes
- **Mobile Optimized**: Perfect for mobile sharing and installation
- **Offline Capable**: Works without internet connection
- **Native App Feel**: Install as a mobile app
- **Dark Theme**: Professional dark interface with orange accents

## 📱 Installation

### Mobile (iOS/Android)
1. Visit the PWA URL in your mobile browser
2. **iOS Safari**: Tap Share → "Add to Home Screen"
3. **Android Chrome**: Tap "Add to Home Screen" when prompted

### Desktop
1. Visit the PWA URL in Chrome/Edge
2. Look for install icon in address bar
3. Click "Install NYLA GO"

## 🔧 Development

### Local Testing
```bash
# Serve locally
python3 -m http.server 8000
# Or use any static file server
npx serve .
```

### GitHub Pages Deployment
1. Push to `gh-pages` branch
2. Enable GitHub Pages in repository settings
3. Access at: `https://sonyschan.github.io/nyla-go/`

## 📋 Technical Details

### PWA Features
- **Manifest**: Full PWA manifest with icons and theme
- **Service Worker**: Offline caching and background sync
- **Responsive**: Mobile-first responsive design
- **Installable**: Add to home screen capability

### Dependencies
- **QR Generation**: Uses SimpleQR library (self-contained)
- **No External APIs**: All functionality works offline
- **No Framework**: Vanilla JavaScript for performance

### Browser Support
- **iOS Safari**: 11.1+
- **Android Chrome**: 67+
- **Desktop Chrome**: 67+
- **Desktop Edge**: 79+

## 🎯 Use Cases

1. **Payment Requests**: Generate QR codes for receiving NYLA tokens
2. **Mobile Sharing**: Easy sharing of payment requests
3. **Merchant Tools**: Quick payment request generation for businesses
4. **Community Events**: Generate payment QRs for tips/donations

## 🔒 Privacy

- **No Data Collection**: All processing happens locally
- **No Analytics**: No tracking or user monitoring
- **Open Source**: Full transparency in code
- **Local Storage**: Settings saved in browser only

## 📁 File Structure

```
pwa/
├── index.html          # Main app entry
├── manifest.json       # PWA manifest
├── sw.js              # Service worker
├── css/
│   └── styles.css     # App styling
├── js/
│   └── app.js         # Core functionality
├── lib/
│   └── qr-simple.js   # QR generation
└── icons/             # App icons (all sizes)
```

## 🔄 Updates

The PWA automatically updates when new versions are deployed. Users will see a refresh prompt when updates are available.

---

**Built with ❤️ for the NYLA Community**