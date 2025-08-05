# 🧪 NYLA Go Functional Tests

Comprehensive functional test suite for NYLA Go Extension and PWA to ensure all UI elements exist and function properly.

## 🚀 Quick Start

### Prerequisites
- Node.js (v16 or higher)
- npm 
- Python 3 (for PWA server)
- Chrome/Chromium browser

### Installation & Setup

```bash
# Install test dependencies
npm install

# Install Playwright browsers
npm run install:browsers

# Make test runner executable (Linux/Mac)
chmod +x run-tests.sh
```

### Running Tests

#### **Option 1: Use Test Runner Script (Recommended)**
```bash
# Run all tests (PWA + Extension)
./run-tests.sh

# Run only PWA tests
./run-tests.sh --pwa-only

# Run only Extension tests  
./run-tests.sh --extension-only

# Run tests with visible browser
./run-tests.sh --headed

# Debug tests step-by-step
./run-tests.sh --debug --pwa-only
```

#### **Option 2: Use npm Scripts**
```bash
# Run all tests
npm test

# Run PWA tests only
npm run test:pwa

# Run Extension tests only
npm run test:extension

# Run with visible browser
npm run test:headed

# Debug mode
npm run test:debug

# View test report
npm run test:report
```

#### **Option 3: Direct Playwright Commands**
```bash
# Run all tests
npx playwright test

# Run specific test file
npx playwright test tests/pwa/pwa-functional.test.js

# Run with browser visible
npx playwright test --headed

# Run in debug mode
npx playwright test --debug
```

#### **Option 4: Puppeteer Performance Testing**
```bash
# Demo performance comparison (no installation required)
npm run demo:performance

# Install Puppeteer for actual performance testing
npm install puppeteer --save-dev

# Run Puppeteer headless tests (fast)
npm run test:puppeteer

# Run full performance comparison
npm run test:performance
```

---

## 📋 Test Coverage

### **PWA Tests** (`tests/pwa/pwa-functional.test.js`)

**Special Features:**
- **Splash Screen Skip**: Tests automatically skip the 4.5-second splash screen for faster execution
- **Single Page Testing**: Each test covers all elements on a page in one scenario, avoiding multiple page reloads
- **Comprehensive Coverage**: Each test verifies form elements, interactions, and functionality together

#### ✅ **Header Elements**
- [x] NYLA Go logo exists and loads correctly
- [x] Tagline "Your AI agent for payments and community" displays
- [x] Logo has correct alt text and image source

#### ✅ **Navigation Elements**  
- [x] Send, Receive, Swap tabs exist and are clickable
- [x] Receive tab is active by default
- [x] Tab switching works correctly

#### ✅ **Send Tab Elements**
- [x] Username field exists with correct placeholder
- [x] Amount field exists with correct placeholder  
- [x] Token select dropdown exists with all default tokens
- [x] Custom token management button (📝) exists and is clickable
- [x] Blockchain radio buttons (Solana, Ethereum, Algorand) exist
- [x] Solana is selected by default
- [x] Command preview updates when form is filled
- [x] "Send to X.com" button exists with correct text

#### ✅ **Receive Tab Elements**
- [x] QR code container exists and is visible
- [x] QR instructions text displays correctly
- [x] QR hint text displays correctly
- [x] Username field exists with correct placeholder
- [x] Amount field exists with correct placeholder
- [x] Token select dropdown exists with all default tokens
- [x] Custom token management button (📝) exists and is clickable
- [x] Blockchain radio buttons exist with Solana selected by default
- [x] "Share Payment Request" button exists with correct text
- [x] QR code generates when form is filled

#### ✅ **Swap Tab Elements**
- [x] Amount field exists with correct placeholder
- [x] From token select exists with all default tokens
- [x] From token custom management button (📝) exists
- [x] Swap arrow (↓) displays correctly
- [x] To token select exists with all default tokens  
- [x] To token custom management button (📝) exists
- [x] Blockchain radio buttons exist with Solana selected by default
- [x] Command preview updates when tokens are selected
- [x] Error message when same tokens are selected
- [x] "Send to X.com" button exists with correct text

#### ✅ **Custom Token Management**
- [x] Modal opens when manage tokens button is clicked
- [x] Modal title "Manage Custom Tokens" displays
- [x] Token input field exists with correct placeholder
- [x] "Add Token" button exists
- [x] Custom tokens list container exists
- [x] Close button exists and closes modal

#### ✅ **Footer Elements**
- [x] Version text exists and contains "NYLA Go v"
- [x] Footer links exist (Feedback | Donate)

#### ✅ **Floating Action Button**
- [x] FAB exists and is visible
- [x] FAB icon (⋯) displays correctly
- [x] Floating menu opens when FAB is clicked
- [x] Menu contains Community Raids and Community Apps options

#### ✅ **Token Options**
- [x] All token selects contain default tokens: NYLA, SOL, ETH, ALGO, USDC, USDT

### **Extension Tests** (`tests/extension/extension-functional.test.js`)

#### ✅ **Extension Loading**
- [x] Extension loads correctly in test environment
- [x] Popup HTML renders without errors
- [x] Extension ID is detected properly

#### ✅ **Header Elements**
- [x] NYLA Go logo exists and loads correctly
- [x] Tagline "Your AI agent for payments and community" displays
- [x] Logo has correct alt text and image source

#### ✅ **Navigation Elements**
- [x] Send, Receive, Swap tabs exist and are clickable
- [x] Receive tab is active by default
- [x] Tab switching works correctly

#### ✅ **Send Tab Elements**
- [x] All form elements exist (username, amount, token select, manage button)
- [x] Blockchain radio buttons exist with Solana selected by default
- [x] Command preview exists and updates correctly
- [x] "Send to X.com" button exists with correct text

#### ✅ **Receive Tab Elements**
- [x] QR code container and instructions exist
- [x] All form elements exist (username, amount, token select, manage button)
- [x] Blockchain radio buttons exist with Solana selected by default
- [x] "Share Payment Request" button exists
- [x] QR code generates when form is filled

#### ✅ **Swap Tab Elements**
- [x] All form elements exist (amount, from/to tokens, manage buttons)
- [x] Swap arrow displays correctly
- [x] Blockchain radio buttons exist with Solana selected by default
- [x] Command preview updates and shows errors for same tokens
- [x] "Send to X.com" button exists with correct text

#### ✅ **Custom Token Management**
- [x] Modal opens and displays correctly
- [x] All modal elements exist (input, add button, list, close button)
- [x] Modal closes when close button is clicked

#### ✅ **Footer Elements**
- [x] Version text and footer links exist

#### ✅ **Community Features**
- [x] Three-dot menu button exists
- [x] Community menu opens with raid and app options

#### ✅ **Token Options**
- [x] All token selects contain default tokens

---

## 🛠️ Test Utilities

### **Helper Functions** (`tests/test-utils.js`)

```javascript
// Wait for stable element
await waitForStableElement(page, '.header-logo');

// Fill form fields with validation
await fillFormFields(page, {
  '#receiveUsername': 'testuser',
  '#receiveAmount': '10'
});

// Verify token options
await verifyTokenOptions(page, '#receiveToken', DEFAULT_TOKENS);

// Take debugging screenshots
await takeTimestampedScreenshot(page, 'test-failure');
```

### **Test Data Constants**
- `DEFAULT_TOKENS`: ['NYLA', 'SOL', 'ETH', 'ALGO', 'USDC', 'USDT']
- `TEST_DATA`: Valid usernames, amounts, tokens, blockchains
- `EXPECTED_TEXT`: Expected UI text content
- `SELECTORS`: CSS selectors for all UI elements

---

## 🔍 Debugging Tests

### **Visual Debugging**
```bash
# Run tests with browser visible
./run-tests.sh --headed

# Debug specific test step-by-step
./run-tests.sh --debug --pwa-only
```

### **Screenshot Debugging**
Screenshots are automatically saved to `test-results/screenshots/` when tests fail.

### **Test Reports**
```bash
# View detailed HTML report
npm run test:report
# or
npx playwright show-report
```

### **Common Issues & Solutions**

#### **"Extension not loading"**
- Ensure you're running from project root directory
- Check that `manifest.json` exists
- Verify extension files are present

#### **"PWA server not starting"**
- Ensure Python 3 is installed
- Check that `pwa/index.html` exists
- Port 3000 might be in use

#### **"Elements not found"**
- ✅ **Splash screen automatically skipped** - No longer wait for completion
- Increase wait timeouts for slow environments
- Verify selectors in `test-utils.js`

#### **"PWA splash screen issues"**
- Tests automatically skip splash screen via JavaScript evaluation
- No manual intervention needed for splash screen timing
- If splash screen appears in tests, check the `beforeEach` splash skip logic

#### **"QR code not generating"**
- Ensure QR library is loaded
- Check network connectivity for external QR service
- Verify form fields are properly filled

---

## 🎯 Test Results

### **Exit Codes**
- `0`: All tests passed
- `1`: Some tests failed

### **Test Report Formats**
- **Console**: Real-time test progress and results
- **HTML Report**: Detailed test report with screenshots
- **Screenshots**: Visual debugging for failed tests

### **Expected Test Duration**
- **PWA Tests**: ~30-60 seconds
- **Extension Tests**: ~45-90 seconds  
- **Total Runtime**: ~2-3 minutes

---

## 📊 Continuous Integration

### **GitHub Actions Integration**
```yaml
name: Functional Tests
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm install
      - run: npx playwright install --with-deps
      - run: ./run-tests.sh
      - uses: actions/upload-artifact@v3
        if: failure()
        with:
          name: test-results
          path: test-results/
```

### **Test Environment Requirements**
- **OS**: Linux, macOS, Windows
- **Browser**: Chromium, Firefox, WebKit support
- **Memory**: 2GB+ recommended
- **Network**: Required for PWA external resources

---

## 🔧 Configuration

### **Playwright Config** (`playwright.config.js`)
- **Browsers**: Chrome, Firefox, Safari, Mobile Chrome, Mobile Safari
- **Parallel Execution**: Enabled for faster test runs
- **Retries**: 2 retries on CI, 0 locally
- **Reporters**: HTML report with screenshots
- **Base URL**: http://localhost:3000 for PWA tests

### **Package.json Scripts**
- `test`: Run all tests
- `test:pwa`: PWA tests only
- `test:extension`: Extension tests only
- `test:headed`: Visual mode
- `test:debug`: Debug mode
- `test:report`: View HTML report

---

## 📝 Contributing to Tests

### **Adding New Tests**
1. **PWA Tests**: Add to `tests/pwa/pwa-functional.test.js`
2. **Extension Tests**: Add to `tests/extension/extension-functional.test.js`
3. **Utilities**: Update `tests/test-utils.js` for reusable helpers

### **Test Naming Convention**
```javascript
test.describe('Feature Group', () => {
  test('should display/behave as expected', async ({ page }) => {
    // Test implementation
  });
});
```

### **Best Practices**
- Use descriptive test names
- Group related tests in `describe` blocks
- Use test utilities for common operations
- Add screenshots for visual verification
- Include error messages for debugging

---

## 🎉 Success Criteria

### **All Tests Should Pass For:**
✅ PWA loads and displays all UI elements correctly  
✅ Extension loads and displays all UI elements correctly  
✅ Navigation between tabs works properly  
✅ Form fields exist and accept input  
✅ Token selects contain all default options  
✅ Custom token management buttons are visible  
✅ Command previews update correctly  
✅ QR codes generate when forms are filled  
✅ Blockchain radio buttons exist and function  
✅ Footer elements display correctly  
✅ Community features are accessible  

When all tests pass, you can be confident that both PWA and Extension meet the functional requirements and provide a consistent user experience! 🚀

---

## 🚀 Performance Comparison

For detailed performance analysis between Playwright and Puppeteer testing frameworks, see [PERFORMANCE-COMPARISON.md](PERFORMANCE-COMPARISON.md).

### **Quick Performance Summary**
- **Puppeteer**: 69.7% faster, 37.5% less memory usage
- **Playwright**: Cross-browser support (5 browsers), better debugging
- **Both**: 100% reliability for functional testing

**Demo the comparison without installation:**
```bash
npm run demo:performance
```