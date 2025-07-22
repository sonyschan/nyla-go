# NYLA Transfer Assistant

A Chrome extension that simplifies NYLA cryptocurrency transfers on X.com with an intuitive interface.

![NYLA Transfer Assistant Hero](screenshots/1.Easy-to-use%20interface%20for%20NYLA%20transfers.png)

![NYLA Transfer Assistant](https://img.shields.io/badge/Chrome-Extension-blue?logo=googlechrome)
![Version](https://img.shields.io/badge/Version-0.1.3-orange)
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

The extension generates clean, properly formatted commands that work with the official NYLA bot:
```
Hey @AgentNyla transfer [amount] $[TOKEN] @[recipient]
```

**Example:** `Hey @AgentNyla transfer 50 $NYLA @alice`

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

### Method 1: From Chrome Web Store (Coming Soon)
[Install NYLA Transfer Assistant](https://chrome.google.com/webstore/detail/your-extension-id)

### Method 2: Install from ZIP File (Current)
1. **Download the Extension**
   - Go to [Releases](https://github.com/sonyschan/nyla-transfer-assistant/releases)
   - Download `nyla-transfer-assistant-v0.1.3.zip`

2. **Extract the ZIP File**
   - Unzip the downloaded file to a folder on your computer
   - Remember the folder location (e.g., `Downloads/nyla-transfer-assistant/`)

3. **Install in Chrome**
   - Open Chrome browser
   - Go to `chrome://extensions/` or click **⋮ → More Tools → Extensions**
   - Enable **Developer mode** (toggle in top-right corner)
   - Click **Load unpacked**
   - Select the extracted folder from step 2
   - The NYLA Transfer Assistant icon should appear in your browser toolbar

4. **Verify Installation**
   - Navigate to [X.com](https://x.com)
   - Click the NYLA Transfer Assistant icon in your toolbar
   - The popup should open with the transfer form

### Method 3: For Developers
1. Clone this repository: `git clone https://github.com/sonyschan/nyla-transfer-assistant.git`
2. Open Chrome → Extensions (`chrome://extensions/`)
3. Enable **Developer mode**
4. Click **Load unpacked** and select the cloned folder

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