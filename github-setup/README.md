# NYLA Transfer Assistant

A Chrome extension that simplifies NYLA cryptocurrency transfers on X.com with an intuitive interface.

![NYLA Transfer Assistant](https://img.shields.io/badge/Chrome-Extension-blue?logo=googlechrome)
![Version](https://img.shields.io/badge/Version-0.1.2-orange)
![License](https://img.shields.io/badge/License-MIT-green)

## 🚀 Features

- **Easy Transfer Setup** - Simple form interface with recipient, amount, and token selection
- **Smart Auto-Detection** - Automatically detects reply recipients from X.com conversations  
- **Form Memory** - Remembers your previous inputs for convenience and speed
- **Seamless Integration** - Inserts transfer commands directly into X.com compose boxes
- **Multi-Token Support** - Supports NYLA, SOL, USDC, USDT + custom tokens
- **Preview & Edit** - See exactly what command will be generated before sending

## 📱 How It Works

1. Navigate to X.com and click on any reply box or compose area
2. Click the NYLA Transfer Assistant icon in your browser toolbar
3. Fill in the recipient username, amount, and select cryptocurrency
4. Review the generated command in the live preview
5. Click "Send to X.com" to insert the command instantly

## 📝 Generated Commands

The extension generates clean, properly formatted commands:
```
/transfer @username amount TOKEN
```

**Example:** `/transfer @alice 50 NYLA`

## 🧡 About NYLA

NYLA is an innovative cryptocurrency project that enables seamless transfer and swap operations through social media platforms. This extension makes NYLA transfers on X.com intuitive and user-friendly, eliminating the need for complex command-line syntax.

### 🔗 Official NYLA Links
- **🌐 Official Website**: [agentnyla.com](https://www.agentnyla.com)
- **🐦 Official X Account**: [@AgentNyla](https://x.com/AgentNyla)
- **💬 Telegram Community**: [t.me/AgentNylaAI](https://t.me/AgentNylaAI)

### 💡 Why This Extension?
NYLA's command-line interface, while powerful, can be intimidating for everyday users. This extension bridges that gap by providing:
- Visual form interface instead of memorizing command syntax
- Real-time command preview and validation
- Auto-detection of reply recipients
- Custom token management for advanced users

## 🔧 Installation

### From Chrome Web Store
[Install NYLA Transfer Assistant](https://chrome.google.com/webstore/detail/your-extension-id)

### For Developers
1. Clone this repository
2. Open Chrome → Extensions → Enable Developer mode
3. Click "Load unpacked" and select the `extension/` folder

## 🔒 Privacy & Security

- ✅ All data stored locally in your browser
- ✅ No personal information collected or transmitted
- ✅ No analytics or user tracking
- ✅ No external API calls or remote code
- ✅ Open source and transparent

[📋 Full Privacy Policy](https://yourusername.github.io/nyla-transfer-assistant/privacy-policy)

## 🛠️ Development

### Project Structure
```
extension/
├── manifest.json       # Extension configuration
├── popup.html         # Extension popup interface  
├── popup.js           # Popup functionality
├── content.js         # X.com integration script
├── icons/             # Extension icons
└── privacy_policy.md  # Privacy policy
```

### Technologies Used
- **Manifest V3** - Latest Chrome extension format
- **Vanilla JavaScript** - No external dependencies
- **Chrome Storage API** - Local data persistence
- **Content Scripts** - X.com integration

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📞 Support

- **Issues**: [GitHub Issues](https://github.com/yourusername/nyla-transfer-assistant/issues)
- **Questions**: Create a discussion in this repository

---

**Made with ❤️ for the NYLA community**