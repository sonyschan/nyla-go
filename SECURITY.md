# Security Policy

## 🛡️ Verified Safe & Secure

NYLA Go is committed to providing a secure browser extension for cryptocurrency transfers. We implement multiple layers of security verification:

### ✅ Security Measures
- **Open Source**: Full source code available for public audit
- **No External Code**: All functionality self-contained, no remote code execution
- **Minimal Permissions**: Only essential browser permissions requested
- **Local Data**: Form preferences stored locally, never transmitted to our servers
- **Transparent External Services**: Clear disclosure of QR generation services used

### 🔍 Third-Party Verification

#### Latest Release Security Scan (v0.5.0)
- **VirusTotal**: [Scan Results - Clean](https://www.virustotal.com/gui/file/03465f740d2c92139d014d3356224abd486e80f294453fee20a80f66bbdce797) - 0/72 detections ✅
- **CRXcavator**: [Extension Analysis](https://crxcavator.io/report/[extension-id]) - Pending Chrome Store approval
- **GitHub Security**: No vulnerabilities detected in dependencies ✅

#### File Integrity Verification
```bash
# Verify download integrity:
sha256sum nyla-go-v0.5.0.zip
# Expected SHA256: 03465f740d2c92139d014d3356224abd486e80f294453fee20a80f66bbdce797
```

### 🔐 What We DON'T Access
- ❌ Private keys or wallet information
- ❌ Personal data or browsing history  
- ❌ Data from other websites or browser tabs
- ❌ Cryptocurrency balances or transactions
- ❌ Any sensitive personal information

### 🚨 Reporting Security Issues

If you discover a security vulnerability, please report it responsibly:

1. **DO NOT** open a public issue
2. Email security concerns to: [your-email]
3. Include steps to reproduce the issue
4. Allow reasonable time for fixes before public disclosure

### 📝 Security Updates

- Security patches are prioritized and released immediately
- Users are notified through extension update mechanisms
- All security fixes are documented in release notes

## 🛠️ For Security Researchers

### Scope
- Chrome extension code and functionality
- Privacy and data handling practices
- External service integrations (QR generation, logo hosting)

### Out of Scope  
- Third-party services we integrate with (api.qrserver.com, ipfs.io)
- Social engineering attacks
- Physical security

### Recognition
We appreciate responsible security research and will acknowledge researchers who help improve NYLA Go security.

---

**Last Updated**: July 2025  
**Next Security Review**: Quarterly