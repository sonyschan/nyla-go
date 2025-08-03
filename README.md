# NYLA Go

A Chrome extension that simplifies NYLA cryptocurrency transfers on X.com with an intuitive interface.

![NYLA Go](https://img.shields.io/badge/Chrome-Extension-blue?logo=googlechrome)
![Version](https://img.shields.io/badge/Version-1.7.2-orange)
![License](https://img.shields.io/badge/License-MIT-green)
![Security](https://img.shields.io/badge/Security-Verified-brightgreen?logo=shield)
![Open Source](https://img.shields.io/badge/Source-Open-blue?logo=github)

## 🎥 Video Demo

[![NYLA Go Demo](https://img.youtube.com/vi/Kgih8vpaj0c/maxresdefault.jpg)](https://www.youtube.com/watch?v=Kgih8vpaj0c)

**[Watch the Demo →](https://www.youtube.com/watch?v=Kgih8vpaj0c)** - See NYLA Go in action with multi-blockchain support and smart profile detection!

## 🚀 Features

### 💫 **Core Features**
- **🌐 Multi-Blockchain Support** - Choose from Solana (default), Ethereum, or Algorand networks
- **📱 QR Code Generation** - Generate scannable QR codes with official NYLA logo for mobile transfers
- **🎯 Smart Auto-Detection** - Automatically detects reply recipients from X.com conversations
- **🔄 Tabbed Interface** - Send, Receive, and Raid tabs for organized functionality
- **💾 Form Memory** - Remembers your inputs for convenience and speed
- **🔗 Seamless Integration** - Inserts transfer commands directly into X.com compose boxes
- **🪙 Multi-Token Support** - Supports NYLA, SOL, ETH, ALGO, USDC, USDT + custom tokens
- **👥 Community Features** - Access NYLA Core and Community Raiders lists for engagement
- **📱 Cross-Platform** - Available as both Chrome extension and Progressive Web App

## 📱 How It Works

1. Navigate to X.com and click on any reply box or compose area
2. Click the NYLA Go icon in your browser toolbar
3. Fill in the recipient username, amount, and select cryptocurrency
4. Choose your preferred blockchain (Solana, Ethereum, or Algorand)
5. Review the generated command in the live preview
6. **Desktop**: Click "Send to X.com" to insert the command instantly
7. **Mobile**: Click "Switch to QR Code" and scan with your phone to open X.com mobile app

## 📝 Generated Commands

The extension generates clean, properly formatted commands that work with the official NYLA bot:

**Solana (Default):**
```
Hey @AgentNyla transfer [AMOUNT] $[TOKEN] @[USERNAME]
```
**Example:** `Hey @AgentNyla transfer 50 $NYLA @alice`

**Ethereum/Algorand:**
```
Hey @AgentNyla transfer [AMOUNT] $[TOKEN] @[USERNAME] [BLOCKCHAIN]
```
**Example:** `Hey @AgentNyla transfer 50 $NYLA @alice Ethereum`

## 📱 Progressive Web Application

Experience NYLA Go directly in your mobile browser with our PWA:

**🌐 [Launch NYLA Go PWA →](https://sonyschan.github.io/nyla-go/)**

- **📱 Mobile Optimized** - Install directly to your home screen
- **🔄 Auto-Updates** - Always get the latest features automatically  
- **🎯 Raid Lists** - Access NYLA Core and Community Raiders with X.com deeplinks
- **💾 Offline Ready** - Works even without internet connection

## 🧡 About NYLA

NYLA is an innovative cryptocurrency project that enables seamless transfer and swap operations through social media platforms. This extension makes NYLA transfers on X.com intuitive and user-friendly, eliminating the need for complex command-line syntax.

### 🔗 Official NYLA Links
- **🌐 Official Website**: [agentnyla.com](https://www.agentnyla.com)
- **🐦 Official X Account**: [@AgentNyla](https://x.com/AgentNyla)
- **💬 Telegram Community**: [t.me/AgentNylaAI](https://t.me/AgentNylaAI)

### 💡 Why Extension?
- **Best assistant for desktop** - Seamless integration with your browser workflow
- **X context awareness** - Smart detection of recipients and reply scenarios  
- **Interactive** - Real-time UI that responds to your actions

### 🚀 How Extension Empowers NYLA?
- **Save community's brain to remember commands** - No more memorizing complex syntax
- **Users get feature updates automatically** - Continuous improvements without manual updates
- **Easy UI = Less effort = More usage** - Lower barrier drives higher adoption
- **Possibly embrace new users by the tipping button** - Free tip buttons attract new NYLA users
- **Brainstorm how NYLA fits in consumer apps** - Bridge between crypto and mainstream social platforms

## 🔧 Installation

### Method 1: From Chrome Web Store (Coming Soon)
[Install NYLA Transfer Assistant](https://chrome.google.com/webstore/detail/your-extension-id)

### Method 2: Install from ZIP File (Current)
1. **Download the Extension**
   - Go to [Releases](https://github.com/sonyschan/nyla-go/releases)
   - Download `nyla-go-v1.7.2.zip`

2. **Extract the ZIP File**
   - Unzip the downloaded file to a folder on your computer
   - Remember the folder location (e.g., `Downloads/nyla-go/`)

3. **Install in Chrome**
   - Open Chrome browser
   - Go to `chrome://extensions/` or click **⋮ → More Tools → Extensions**
   - Enable **Developer mode** (toggle in top-right corner)
   - Click **Load unpacked**
   - Select the extracted folder from step 2
   - The NYLA Go icon should appear in your browser toolbar

4. **Verify Installation**
   - Navigate to [X.com](https://x.com)
   - Click the NYLA Go icon in your toolbar
   - The popup should open with the transfer form

### Method 3: For Developers
1. Clone this repository: `git clone https://github.com/sonyschan/nyla-go.git`
2. Open Chrome → Extensions (`chrome://extensions/`)
3. Enable **Developer mode**
4. Click **Load unpacked** and select the cloned folder

## 🔒 Security & Trust

### 🛡️ Third-Party Verified
- **VirusTotal**: [Clean Scan - 0/72 detections](https://www.virustotal.com/gui/file/03465f740d2c92139d014d3356224abd486e80f294453fee20a80f66bbdce797) ✅
- **Open Source**: Full source code auditable on GitHub ✅
- **No Malware**: Verified safe by multiple antivirus engines ✅

### 🔐 Privacy Protection
- ✅ Form data stored locally in your browser only
- ✅ QR generation uses trusted external services (disclosed in privacy policy)
- ✅ No personal information, private keys, or wallet data collected
- ✅ No analytics or user tracking
- ✅ Transparent about all external service usage

### 📋 Security Features
- ✅ Minimal permissions requested
- ✅ No remote code execution
- ✅ Regular security updates
- ✅ Responsible disclosure policy

**[📖 Full Security Policy](SECURITY.md)** | **[🔍 Latest Security Scan](https://www.virustotal.com/gui/file/03465f740d2c92139d014d3356224abd486e80f294453fee20a80f66bbdce797)**
- ✅ Open source and transparent

[📋 Full Privacy Policy](https://github.com/sonyschan/nyla-go/blob/master/privacy_policy.md)

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

- **Issues**: [GitHub Issues](https://github.com/sonyschan/nyla-go/issues)
- **Questions**: Create a discussion in this repository

---

**NYLA Go - Made with ❤️ for the NYLA community**
