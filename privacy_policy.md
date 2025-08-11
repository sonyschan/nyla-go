# Privacy Policy for NYLA Go

**Last Updated: August 2025**

## Overview
NYLA Go is a browser extension that helps users generate NYLA cryptocurrency transfer commands on X.com. We are committed to protecting your privacy.

## Data Collection
- **Form Data**: The extension stores your previously entered recipient usernames, token amounts, and selected cryptocurrencies locally in your browser to improve user experience
- **Language Preferences**: NEW in v2.4.0 - Your selected interface language (English/Chinese) is stored locally in Chrome's storage for consistent experience across sessions
- **Username Settings**: NEW in v2.4.0 - Your X.com username preference is stored locally for convenience across different tabs and features
- **URL Processing**: The extension reads the current X.com page URL to automatically detect usernames for transfer recipients (e.g., extracting 'username' from 'x.com/username/status/123')
- **Page Context**: The extension analyzes visible X.com page content to detect reply recipients and compose dialog context
- **QR Code Generation**: Transfer commands are sent to external QR code generation services to create scannable QR codes for mobile use
- **Logo Integration**: The official NYLA logo is loaded from IPFS (InterPlanetary File System) for display in QR codes
- **No Personal Information**: We do not collect, store, or transmit any personal information, private keys, or sensitive data beyond transfer commands for QR generation
- **No Analytics**: We do not use analytics services or track user behavior
- **No Language Data Transmission**: Language preferences and interface translations are processed entirely offline - no language data is sent to external servers
- **Limited External Communication**: QR generation and logo loading require external requests, but only contain transfer command text and no personal data

## Data Storage
- All form data and preferences are stored locally in your browser using Chrome's storage API
- Language Settings: Interface language preference stored using Chrome's storage.sync API
- Username Preferences: X.com username stored locally for form auto-population
- Internationalization Data: Translation files and language configurations loaded locally within the extension
- Transfer commands are temporarily sent to QR generation services but are not stored by those services
- You can clear local data at any time by removing the extension
- No personal data is shared with third parties

## Permissions Usage
- **ActiveTab**: Required to detect X.com pages, read current page URL for username detection, and insert transfer commands
- **Storage**: Required to save form preferences, language settings, and username preferences locally in your browser
- **Tabs**: Required to detect when you're on X.com pages for extension functionality
- **Host Permissions**: 
  - **x.com and twitter.com**: For core extension functionality
  - **api.qrserver.com**: For generating QR codes from transfer commands
  - **chart.googleapis.com**: For backup QR code generation service
  - **ipfs.io**: For loading the official NYLA logo displayed in QR codes

## What We Access (And Why)
- **Current Page URL**: To extract usernames from URLs like 'x.com/username/status/123' for automatic recipient detection
- **Page Content**: To find "Replying to" text and compose dialog context for smart recipient suggestions
- **Text Input Fields**: To insert generated transfer commands into X.com compose boxes
- **Navigation Context**: To detect when you're commenting from profiles or replying to specific users
- **Browser Language Settings**: To detect preferred language for automatic interface localization

## What We DON'T Access
- No browsing history outside of the current X.com tab
- No data from other websites or browser tabs
- No personal files, downloads, or system information
- No private keys, wallet information, or cryptocurrency balances
- No personal identification or contact information
- No language usage analytics or tracking

## External Services Used
- **QR Code Generation**: api.qrserver.com and chart.googleapis.com receive transfer command text to generate QR codes
- **Logo Hosting**: ipfs.io serves the official NYLA logo for display in QR codes
- **No Data Storage**: These services do not store or log the transfer commands sent to them
- **Limited Data**: Only the transfer command text (e.g., "Hey @AgentNyla transfer 50 $NYLA @username") is shared, no personal information
- **No Translation Services**: All language processing and translations occur locally within the extension

## Data Sharing
We do not share, sell, or transmit any personal user data to third parties. Transfer commands are only sent to QR generation services for functionality purposes.

## Security
- No remote code execution
- Limited external API calls only to trusted QR generation and logo hosting services
- No sensitive data transmission - only transfer command text for QR generation
- No data persistence on external servers
- All form data, language preferences, and user settings remain local to your browser
- Offline language processing - no translation data sent to external services

## Changes to This Policy
We may update this privacy policy from time to time. Users will be notified of any material changes through extension updates.

## Contact
For questions about this privacy policy, please create an issue at our GitHub repository.

---

*This privacy policy applies to NYLA Go Chrome Extension version 2.4.0 and later.*