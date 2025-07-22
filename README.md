# NYLA Transfer Assistant

A Chrome extension that simplifies NYLA cryptocurrency transfers on X.com by providing an intuitive user interface.

## Features

- **Easy Transfer Setup**: Simple form interface to set up NYLA transfer commands
- **Auto-Detection**: Automatically detects reply recipients from X.com conversations
- **Form Memory**: Remembers your previous inputs for convenience
- **X.com Integration**: Seamlessly inserts transfer commands into X.com compose boxes
- **Cryptocurrency Support**: Supports USDC, USDT, ETH, BTC, and SOL transfers

## How to Use

1. Install the extension from the Chrome Web Store
2. Navigate to X.com and click on a reply box or compose new tweet
3. Click the NYLA Transfer Assistant icon in your browser toolbar
4. Fill in the recipient username, amount, and select cryptocurrency
5. Review the generated command in the preview
6. Click "Send to X.com" to insert the command

## Generated Command Format

The extension generates commands in the format:
```
/transfer @username amount TOKEN
```

Example: `/transfer @alice 50 USDC`

## Privacy

- All data is stored locally in your browser
- No personal information is collected or transmitted
- No analytics or tracking

## Version

**v0.1.0 (Beta)** - Initial release

## Support

For issues or feature requests, please visit our GitHub repository or contact support.

## License

MIT License - See LICENSE file for details.