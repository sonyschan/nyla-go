// Puppeteer PWA Functional Tests
// Fast headless browser testing with performance focus

const puppeteer = require('puppeteer');

// Test utilities adapted for Puppeteer
const DEFAULT_TOKENS = ['NYLA', 'SOL', 'ETH', 'ALGO', 'USDC', 'USDT'];
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

class PuppeteerTestUtils {
  static async waitForStableElement(page, selector, timeout = 5000) {
    await page.waitForSelector(selector, { visible: true, timeout });
    await page.waitForTimeout(100); // Stability delay
  }

  static async fillFormFields(page, fields) {
    for (const [selector, value] of Object.entries(fields)) {
      await page.type(selector, value, { delay: 10 });
      const actualValue = await page.$eval(selector, el => el.value);
      if (actualValue !== value) {
        throw new Error(`Failed to set value for ${selector}. Expected: ${value}, Got: ${actualValue}`);
      }
    }
  }

  static async verifyTokenOptions(page, selectSelector, expectedTokens) {
    const options = await page.$$eval(`${selectSelector} option`, options => 
      options.map(option => option.textContent)
    );
    
    for (const token of expectedTokens) {
      if (!options.includes(token)) {
        throw new Error(`Token ${token} not found in ${selectSelector}. Available: ${options.join(', ')}`);
      }
    }
    return true;
  }

  static async takeTimestampedScreenshot(page, name) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    await page.screenshot({ 
      path: `test-results/screenshots/puppeteer-${name}-${timestamp}.png`,
      fullPage: true 
    });
  }
}

class PuppeteerPWATests {
  constructor() {
    this.browser = null;
    this.page = null;
    this.testResults = [];
    this.startTime = Date.now();
  }

  async setup() {
    console.log('🚀 Starting Puppeteer PWA Tests...');
    
    // Launch browser with optimized settings for speed
    this.browser = await puppeteer.launch({
      headless: 'new', // Use new headless mode for better performance
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-default-browser-check',
        '--disable-default-apps',
        '--disable-extensions',
        '--disable-plugins',
        '--disable-translate',
        '--disable-background-timer-throttling',
        '--disable-renderer-backgrounding',
        '--disable-backgrounding-occluded-windows',
        '--disable-background-networking'
      ]
    });

    this.page = await this.browser.newPage();
    
    // Set viewport for consistent testing
    await this.page.setViewport({ width: 1280, height: 720 });
    
    // Navigate to PWA and skip splash screen
    await this.page.goto('http://localhost:3000');
    
    // Skip splash screen immediately
    await this.page.evaluate(() => {
      const splashScreen = document.getElementById('splashScreen');
      const appContainer = document.getElementById('appContainer');
      
      if (splashScreen && appContainer) {
        splashScreen.style.display = 'none';
        appContainer.style.opacity = '1';
        
        // Trigger app initialization
        const event = new Event('DOMContentLoaded');
        document.dispatchEvent(event);
      }
    });
    
    // Wait for app to be ready
    await PuppeteerTestUtils.waitForStableElement(this.page, '.app-container');
    
    // Ensure PWA data is loaded
    await this.page.waitForFunction(() => {
      return window.NYLA_FOOTER_DATA && window.NYLA_RAID_DATA;
    }, { timeout: 5000 });
  }

  async teardown() {
    if (this.browser) {
      await this.browser.close();
    }
  }

  async runTest(testName, testFunction) {
    const testStart = Date.now();
    try {
      console.log(`⏳ Running: ${testName}`);
      await testFunction();
      const duration = Date.now() - testStart;
      this.testResults.push({ name: testName, status: 'PASSED', duration });
      console.log(`✅ ${testName} - ${duration}ms`);
    } catch (error) {
      const duration = Date.now() - testStart;
      this.testResults.push({ name: testName, status: 'FAILED', duration, error: error.message });
      console.log(`❌ ${testName} - ${duration}ms - ${error.message}`);
      await PuppeteerTestUtils.takeTimestampedScreenshot(this.page, `failed-${testName.replace(/\s+/g, '-').toLowerCase()}`);
    }
  }

  async testHeaderAndNavigation() {
    // Test header elements
    const logo = await this.page.$('.header-logo');
    if (!logo) throw new Error('Logo not found');
    
    const logoAlt = await this.page.$eval('.header-logo', el => el.alt);
    if (logoAlt !== 'NYLA GO') throw new Error(`Expected alt "NYLA GO", got "${logoAlt}"`);

    const tagline = await this.page.$eval('.header p', el => el.textContent);
    if (tagline !== EXPECTED_TEXT.tagline) throw new Error(`Expected tagline "${EXPECTED_TEXT.tagline}", got "${tagline}"`);

    // Test navigation tabs
    const sendTab = await this.page.$('[data-tab="send"]');
    const receiveTab = await this.page.$('[data-tab="receive"]');
    const swapTab = await this.page.$('[data-tab="swap"]');

    if (!sendTab || !receiveTab || !swapTab) {
      throw new Error('Navigation tabs not found');
    }

    const sendText = await this.page.$eval('[data-tab="send"]', el => el.textContent);
    const receiveText = await this.page.$eval('[data-tab="receive"]', el => el.textContent);
    const swapText = await this.page.$eval('[data-tab="swap"]', el => el.textContent);

    if (sendText !== 'Send' || receiveText !== 'Receive' || swapText !== 'Swap') {
      throw new Error('Tab text mismatch');
    }

    // Test tab switching
    await sendTab.click();
    await this.page.waitForTimeout(100);
    const sendActive = await this.page.$eval('[data-tab="send"]', el => el.classList.contains('active'));
    if (!sendActive) throw new Error('Send tab not active after click');

    await swapTab.click();
    await this.page.waitForTimeout(100);
    const swapActive = await this.page.$eval('[data-tab="swap"]', el => el.classList.contains('active'));
    if (!swapActive) throw new Error('Swap tab not active after click');

    // Return to Receive tab
    await receiveTab.click();
    await this.page.waitForTimeout(100);
  }

  async testSendTabFunctionality() {
    // Navigate to Send tab
    await this.page.click('[data-tab="send"]');
    await PuppeteerTestUtils.waitForStableElement(this.page, '#sendTab');

    // Test all form elements exist
    const elements = [
      '#sendRecipient',
      '#sendAmount', 
      '#sendToken',
      '#sendManageTokensBtn',
      '#sendCommandPreview',
      '#sendButton'
    ];

    for (const selector of elements) {
      const element = await this.page.$(selector);
      if (!element) throw new Error(`Element ${selector} not found`);
    }

    // Test placeholders
    const usernamePlaceholder = await this.page.$eval('#sendRecipient', el => el.placeholder);
    const amountPlaceholder = await this.page.$eval('#sendAmount', el => el.placeholder);
    
    if (usernamePlaceholder !== '@username') throw new Error('Username placeholder mismatch');
    if (amountPlaceholder !== '1') throw new Error('Amount placeholder mismatch');

    // Test blockchain radio buttons
    const solanaRadio = await this.page.$('#sendSolana');
    const ethereumRadio = await this.page.$('#sendEthereum');
    const algorandRadio = await this.page.$('#sendAlgorand');

    if (!solanaRadio || !ethereumRadio || !algorandRadio) {
      throw new Error('Blockchain radio buttons not found');
    }

    const solanaChecked = await this.page.$eval('#sendSolana', el => el.checked);
    if (!solanaChecked) throw new Error('Solana should be checked by default');

    // Test token options
    await PuppeteerTestUtils.verifyTokenOptions(this.page, '#sendToken', DEFAULT_TOKENS);

    // Test custom token management modal
    await this.page.click('#sendManageTokensBtn');
    await PuppeteerTestUtils.waitForStableElement(this.page, '#modalOverlay');
    
    const modalHeader = await this.page.$eval('.modal-header h2', el => el.textContent);
    if (modalHeader !== 'Manage Custom Tokens') throw new Error('Modal header mismatch');
    
    await this.page.click('#closeModalBtn');
    await this.page.waitForTimeout(100);

    // Test form functionality
    await PuppeteerTestUtils.fillFormFields(this.page, {
      '#sendRecipient': 'testuser',
      '#sendAmount': '10'
    });
    
    // Verify command preview updates
    const commandPreview = await this.page.$eval('#sendCommandPreview', el => el.textContent);
    if (!commandPreview.includes('testuser') || !commandPreview.includes('10')) {
      throw new Error('Command preview not updating correctly');
    }

    // Test blockchain switching
    await this.page.click('#sendEthereum');
    const ethereumChecked = await this.page.$eval('#sendEthereum', el => el.checked);
    if (!ethereumChecked) throw new Error('Ethereum radio not checked');
    
    // Reset to Solana
    await this.page.click('#sendSolana');
  }

  async testReceiveTabFunctionality() {
    // Navigate to Receive tab
    await this.page.click('[data-tab="receive"]');
    await PuppeteerTestUtils.waitForStableElement(this.page, '#receiveTab');

    // Test QR code container and instructions
    const qrElements = [
      '.receive-qr-container',
      '#receiveQrCode',
      '.qr-instructions',
      '#qrInstructionText',
      '.qr-hint'
    ];

    for (const selector of qrElements) {
      const element = await this.page.$(selector);
      if (!element) throw new Error(`QR element ${selector} not found`);
    }

    // Test form elements
    const formElements = [
      '#receiveUsername',
      '#receiveAmount',
      '#receiveToken',
      '#receiveManageTokensBtn',
      '#shareButton'
    ];

    for (const selector of formElements) {
      const element = await this.page.$(selector);
      if (!element) throw new Error(`Form element ${selector} not found`);
    }

    // Test blockchain radio buttons
    const receiveRadios = ['#receiveSolana', '#receiveEthereum', '#receiveAlgorand'];
    for (const selector of receiveRadios) {
      const element = await this.page.$(selector);
      if (!element) throw new Error(`Radio ${selector} not found`);
    }

    const receiveSolanaChecked = await this.page.$eval('#receiveSolana', el => el.checked);
    if (!receiveSolanaChecked) throw new Error('Receive Solana should be checked by default');

    // Test token options
    await PuppeteerTestUtils.verifyTokenOptions(this.page, '#receiveToken', DEFAULT_TOKENS);

    // Test form functionality and QR generation
    await PuppeteerTestUtils.fillFormFields(this.page, {
      '#receiveUsername': 'testuser',
      '#receiveAmount': '10'
    });
    
    // Wait for QR generation
    await this.page.waitForTimeout(1000);
    const qrContent = await this.page.$eval('#receiveQrCode', el => el.innerHTML);
    if (qrContent.length < 100) throw new Error('QR code not generated properly');
  }

  async testSwapTabFunctionality() {
    // Navigate to Swap tab
    await this.page.click('[data-tab="swap"]');
    await PuppeteerTestUtils.waitForStableElement(this.page, '#swapTab');

    // Test all form elements
    const swapElements = [
      '#swapAmount',
      '#swapFromToken',
      '#swapFromManageTokensBtn',
      '.swap-arrow',
      '.arrow-icon',
      '#swapToToken',
      '#swapToManageTokensBtn',
      '#swapCommandPreview',
      '#swapButton'
    ];

    for (const selector of swapElements) {
      const element = await this.page.$(selector);
      if (!element) throw new Error(`Swap element ${selector} not found`);
    }

    // Test arrow icon
    const arrowText = await this.page.$eval('.arrow-icon', el => el.textContent);
    if (arrowText !== '↓') throw new Error('Arrow icon mismatch');

    // Test blockchain radio buttons
    const swapRadios = ['#swapSolana', '#swapEthereum', '#swapAlgorand'];
    for (const selector of swapRadios) {
      const element = await this.page.$(selector);
      if (!element) throw new Error(`Swap radio ${selector} not found`);
    }

    // Test token options for both selects
    await PuppeteerTestUtils.verifyTokenOptions(this.page, '#swapFromToken', DEFAULT_TOKENS);
    await PuppeteerTestUtils.verifyTokenOptions(this.page, '#swapToToken', DEFAULT_TOKENS);

    // Test form functionality
    await this.page.type('#swapAmount', '10');
    await this.page.select('#swapFromToken', 'SOL');
    await this.page.select('#swapToToken', 'ETH');
    
    // Verify command preview updates
    const commandPreview = await this.page.$eval('#swapCommandPreview', el => el.textContent);
    if (!commandPreview.includes('10') || !commandPreview.includes('SOL') || !commandPreview.includes('ETH')) {
      throw new Error('Swap command preview not updating correctly');
    }

    // Test error when same tokens are selected
    await this.page.select('#swapToToken', 'SOL');
    const errorPreview = await this.page.$eval('#swapCommandPreview', el => el.textContent);
    if (!errorPreview.includes('Please select different tokens for swap')) {
      throw new Error('Same token error not displayed');
    }

    // Fix the error
    await this.page.select('#swapToToken', 'ETH');
    const fixedPreview = await this.page.$eval('#swapCommandPreview', el => el.textContent);
    if (fixedPreview.includes('Please select different tokens for swap')) {
      throw new Error('Error message should be cleared');
    }
  }

  async testFooterAndCommunityFeatures() {
    // Test footer elements
    const versionText = await this.page.$('#versionText');
    const footerLinks = await this.page.$('#footerLinks');

    if (!versionText) throw new Error('Version text not found');
    
    const versionContent = await this.page.$eval('#versionText', el => el.textContent);
    if (!versionContent.includes('NYLA Go v')) throw new Error('Version text mismatch');

    // Footer links may not be visible on mobile, so check conditionally
    if (footerLinks) {
      const isVisible = await this.page.$eval('#footerLinks', el => {
        const style = window.getComputedStyle(el);
        return style.display !== 'none' && style.visibility !== 'hidden';
      });
      
      if (isVisible) {
        const footerContent = await this.page.$eval('#footerLinks', el => el.textContent);
        if (!footerContent.includes('Feedback') || !footerContent.includes('Donate')) {
          throw new Error('Footer links content mismatch');
        }
      }
    }

    // Test floating action button (FAB)
    const fab = await this.page.$('#floatingActionButton');
    const fabIcon = await this.page.$('.fab-icon');
    
    if (!fab || !fabIcon) throw new Error('FAB elements not found');
    
    const fabIconText = await this.page.$eval('.fab-icon', el => el.textContent);
    if (fabIconText !== '⋯') throw new Error('FAB icon mismatch');

    // Test floating menu
    await this.page.click('#floatingActionButton');
    await PuppeteerTestUtils.waitForStableElement(this.page, '#floatingMenu');

    // Check menu items
    const menuItems = await this.page.$$('.floating-menu-item');
    if (menuItems.length !== 2) throw new Error('Expected 2 menu items');
    
    const firstItemText = await this.page.$eval('.floating-menu-item:first-child', el => el.textContent);
    const secondItemText = await this.page.$eval('.floating-menu-item:last-child', el => el.textContent);
    
    if (!firstItemText.includes('Community Raids') || !firstItemText.includes('🎯')) {
      throw new Error('First menu item mismatch');
    }
    
    if (!secondItemText.includes('Community Apps') || !secondItemText.includes('🚀')) {
      throw new Error('Second menu item mismatch');
    }

    // Close menu
    await this.page.click('#floatingActionButton');
    await this.page.waitForTimeout(100);
  }

  async runAllTests() {
    await this.setup();

    const tests = [
      ['Header and Navigation Elements', () => this.testHeaderAndNavigation()],
      ['Send Tab Functionality', () => this.testSendTabFunctionality()],
      ['Receive Tab Functionality', () => this.testReceiveTabFunctionality()],
      ['Swap Tab Functionality', () => this.testSwapTabFunctionality()],
      ['Footer and Community Features', () => this.testFooterAndCommunityFeatures()]
    ];

    for (const [name, testFunc] of tests) {
      await this.runTest(name, testFunc);
    }

    await this.teardown();
    return this.generateReport();
  }

  generateReport() {
    const totalDuration = Date.now() - this.startTime;
    const passed = this.testResults.filter(t => t.status === 'PASSED').length;
    const failed = this.testResults.filter(t => t.status === 'FAILED').length;
    
    console.log('\n🎯 Puppeteer Test Results Summary');
    console.log('=================================');
    console.log(`Total Tests: ${this.testResults.length}`);
    console.log(`✅ Passed: ${passed}`);
    console.log(`❌ Failed: ${failed}`);
    console.log(`⏱️ Total Duration: ${totalDuration}ms`);
    
    if (failed > 0) {
      console.log('\n❌ Failed Tests:');
      this.testResults
        .filter(t => t.status === 'FAILED')
        .forEach(t => console.log(`   ${t.name}: ${t.error}`));
    }
    
    console.log('\n📊 Individual Test Durations:');
    this.testResults.forEach(t => {
      const status = t.status === 'PASSED' ? '✅' : '❌';
      console.log(`   ${status} ${t.name}: ${t.duration}ms`);
    });

    return {
      total: this.testResults.length,
      passed,
      failed,
      duration: totalDuration,
      results: this.testResults
    };
  }
}

module.exports = { PuppeteerPWATests, PuppeteerTestUtils, DEFAULT_TOKENS, EXPECTED_TEXT };