// @ts-check

/**
 * Test utilities for NYLA Go functional tests
 */

/**
 * Wait for element to be visible and stable
 * @param {import('@playwright/test').Page} page 
 * @param {string} selector 
 * @param {number} timeout 
 */
async function waitForStableElement(page, selector, timeout = 5000) {
  await page.waitForSelector(selector, { state: 'visible', timeout });
  await page.waitForTimeout(100); // Small delay for stability
}

/**
 * Fill form fields with validation
 * @param {import('@playwright/test').Page} page 
 * @param {Record<string, string>} fields 
 */
async function fillFormFields(page, fields) {
  for (const [selector, value] of Object.entries(fields)) {
    await page.fill(selector, value);
    // Verify the value was set
    const actualValue = await page.inputValue(selector);
    if (actualValue !== value) {
      throw new Error(`Failed to set value for ${selector}. Expected: ${value}, Got: ${actualValue}`);
    }
  }
}

/**
 * Check if all expected tokens exist in a select element
 * @param {import('@playwright/test').Page} page 
 * @param {string} selectSelector 
 * @param {string[]} expectedTokens 
 */
async function verifyTokenOptions(page, selectSelector, expectedTokens) {
  const options = await page.locator(`${selectSelector} option`).allTextContents();
  
  for (const token of expectedTokens) {
    if (!options.includes(token)) {
      throw new Error(`Token ${token} not found in ${selectSelector}. Available options: ${options.join(', ')}`);
    }
  }
  
  return true;
}

/**
 * Take a screenshot with timestamp for debugging
 * @param {import('@playwright/test').Page} page 
 * @param {string} name 
 */
async function takeTimestampedScreenshot(page, name) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  await page.screenshot({ 
    path: `test-results/screenshots/${name}-${timestamp}.png`,
    fullPage: true 
  });
}

/**
 * Default token list for validation
 */
const DEFAULT_TOKENS = ['NYLA', 'SOL', 'ETH', 'ALGO', 'USDC', 'USDT'];

/**
 * Common test data
 */
const TEST_DATA = {
  validUsername: 'testuser',
  validAmount: '10',
  validTokens: {
    NYLA: 'NYLA',
    SOL: 'SOL', 
    ETH: 'ETH',
    ALGO: 'ALGO',
    USDC: 'USDC',
    USDT: 'USDT'
  },
  blockchains: {
    SOLANA: 'Solana',
    ETHEREUM: 'Ethereum', 
    ALGORAND: 'Algorand'
  }
};

/**
 * Expected UI text content
 */
const EXPECTED_TEXT = {
  tagline: 'Your AI agent for payments and community',
  qrInstruction: 'Share this QR code to receive',
  qrHint: 'Others can scan to send you tokens instantly',
  buttons: {
    send: '💸 Send to X.com',
    share: '📤 Share Payment Request',
    swap: '🔄 Send to X.com'
  },
  signature: 'Sent via #NYLAGo'
};

/**
 * Test selectors for common elements
 */
const SELECTORS = {
  // Header
  logo: '.header-logo',
  tagline: '.header p',
  
  // Navigation
  tabs: {
    send: '[data-tab="send"]',
    receive: '[data-tab="receive"]', 
    swap: '[data-tab="swap"]'
  },
  
  // Send tab
  send: {
    tab: '#sendTab',
    recipient: '#sendRecipient',
    amount: '#sendAmount',
    token: '#sendToken',
    manageTokens: '#sendManageTokensBtn',
    blockchains: {
      solana: '#sendSolana',
      ethereum: '#sendEthereum',
      algorand: '#sendAlgorand'
    },
    commandPreview: '#sendCommandPreview',
    button: '#sendButton'
  },
  
  // Receive tab
  receive: {
    tab: '#receiveTab',
    qrContainer: '.receive-qr-container',
    qrCode: '#receiveQrCode',
    qrInstructions: '.qr-instructions',
    qrInstructionText: '#qrInstructionText',
    qrHint: '.qr-hint',
    username: '#receiveUsername',
    amount: '#receiveAmount',
    token: '#receiveToken',
    manageTokens: '#receiveManageTokensBtn',
    blockchains: {
      solana: '#receiveSolana',
      ethereum: '#receiveEthereum',
      algorand: '#receiveAlgorand'
    },
    button: '#shareButton'
  },
  
  // Swap tab
  swap: {
    tab: '#swapTab',
    amount: '#swapAmount',
    fromToken: '#swapFromToken',
    fromManageTokens: '#swapFromManageTokensBtn',
    toToken: '#swapToToken',
    toManageTokens: '#swapToManageTokensBtn',
    arrow: '.swap-arrow',
    arrowIcon: '.arrow-icon',
    blockchains: {
      solana: '#swapSolana',
      ethereum: '#swapEthereum',
      algorand: '#swapAlgorand'
    },
    commandPreview: '#swapCommandPreview',
    button: '#swapButton'
  },
  
  // Custom token modal
  modal: {
    overlay: '#modalOverlay',
    header: '.modal-header h2',
    input: '#newTokenInput',
    addButton: '#addTokenBtn',
    list: '#customTokensList',
    closeButton: '#closeModalBtn'
  },
  
  // Footer
  footer: {
    version: '#versionText',
    links: '#footerLinks'
  },
  
  // Community features
  community: {
    fab: '#floatingActionButton', // PWA
    fabIcon: '.fab-icon',
    floatingMenu: '#floatingMenu',
    threeDotMenu: '#threeDotMenu', // Extension
    communityMenu: '#communityMenu'
  }
};

module.exports = {
  waitForStableElement,
  fillFormFields,
  verifyTokenOptions,
  takeTimestampedScreenshot,
  DEFAULT_TOKENS,
  TEST_DATA,
  EXPECTED_TEXT,
  SELECTORS
};