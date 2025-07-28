# Privacy Policy for NYLA Go

**Last Updated: January 2025**

## Overview
NYLA Go is a browser extension that helps users generate NYLA cryptocurrency transfer commands on X.com. We are committed to protecting your privacy.

## Data Collection
- **Form Data**: The extension stores your previously entered recipient usernames, token amounts, and selected cryptocurrencies locally in your browser to improve user experience
- **URL Processing**: The extension reads the current X.com page URL to automatically detect usernames for transfer recipients (e.g., extracting 'username' from 'x.com/username/status/123')
- **Page Context**: The extension analyzes visible X.com page content to detect reply recipients and compose dialog context
- **No Personal Information**: We do not collect, store, or transmit any personal information, private keys, or sensitive data
- **No Analytics**: We do not use analytics services or track user behavior
- **Local Processing Only**: All URL parsing and page analysis happens locally in your browser and is never transmitted to external servers

## Data Storage
- All form data is stored locally in your browser using Chrome's storage API
- Data is not transmitted to any external servers
- You can clear this data at any time by removing the extension
- No data is shared with third parties

## Permissions Usage
- **ActiveTab**: Required to detect X.com pages, read current page URL for username detection, and insert transfer commands
- **Scripting**: Required to interact with X.com's compose boxes and analyze page content for recipient detection
- **Storage**: Required to save form preferences locally in your browser
- **Host Permissions**: Limited to x.com and twitter.com for functionality only

## What We Access (And Why)
- **Current Page URL**: To extract usernames from URLs like 'x.com/username/status/123' for automatic recipient detection
- **Page Content**: To find "Replying to" text and compose dialog context for smart recipient suggestions
- **Text Input Fields**: To insert generated transfer commands into X.com compose boxes
- **Navigation Context**: To detect when you're commenting from profiles or replying to specific users

## What We DON'T Access
- No browsing history outside of the current X.com tab
- No data from other websites or browser tabs
- No personal files, downloads, or system information
- No network requests to external servers

## Data Sharing
We do not share, sell, or transmit any user data to third parties. All processing happens locally in your browser.

## Security
- No remote code execution
- No external API calls
- No data transmission to servers
- All functionality is self-contained within the extension

## Changes to This Policy
We may update this privacy policy from time to time. Users will be notified of any material changes through extension updates.

## Contact
For questions about this privacy policy, please create an issue at our GitHub repository.

---

*This privacy policy applies to NYLA Go Chrome Extension version 0.1.9 and later.*