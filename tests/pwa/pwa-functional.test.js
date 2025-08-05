// @ts-check
const { test, expect } = require('@playwright/test');
const { waitForStableElement, fillFormFields, verifyTokenOptions, takeTimestampedScreenshot, DEFAULT_TOKENS, EXPECTED_TEXT } = require('../test-utils');

test.describe('NYLA Go PWA - Functional Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to PWA with test parameter to skip splash screen
    await page.goto('/');
    
    // Skip splash screen by immediately calling completeSplash function
    await page.evaluate(() => {
      // Override splash screen behavior for tests
      const splashScreen = document.getElementById('splashScreen');
      const appContainer = document.getElementById('appContainer');
      
      if (splashScreen && appContainer) {
        splashScreen.style.display = 'none';
        appContainer.style.opacity = '1';
        
        // Manually trigger app initialization
        if (typeof window.initializeApp === 'function') {
          window.initializeApp();
        } else {
          // Trigger DOMContentLoaded events that might be waiting
          const event = new Event('DOMContentLoaded');
          document.dispatchEvent(event);
        }
      }
    });
    
    // Wait for app container to be visible
    await waitForStableElement(page, '.app-container');
    
    // Ensure PWA data is loaded
    await page.waitForFunction(() => {
      return window.NYLA_FOOTER_DATA && window.NYLA_RAID_DATA;
    }, { timeout: 5000 });
  });

  test('should display all header and navigation elements correctly', async ({ page }) => {
    // Test header elements
    const logo = page.locator('.header-logo');
    await expect(logo).toBeVisible();
    await expect(logo).toHaveAttribute('alt', 'NYLA GO');
    await expect(logo).toHaveAttribute('src', /NYLAGO-Logo-v2\.png/);

    const tagline = page.locator('.header p');
    await expect(tagline).toBeVisible();
    await expect(tagline).toHaveText(EXPECTED_TEXT.tagline);

    // Test navigation tabs
    const sendTab = page.locator('[data-tab="send"]');
    const receiveTab = page.locator('[data-tab="receive"]');
    const swapTab = page.locator('[data-tab="swap"]');

    await expect(sendTab).toBeVisible();
    await expect(sendTab).toHaveText('Send');
    
    await expect(receiveTab).toBeVisible();
    await expect(receiveTab).toHaveText('Receive');
    await expect(receiveTab).toHaveClass(/active/); // Should be active by default
    
    await expect(swapTab).toBeVisible();
    await expect(swapTab).toHaveText('Swap');

    // Test tab switching works
    await sendTab.click();
    await expect(sendTab).toHaveClass(/active/);
    await expect(receiveTab).not.toHaveClass(/active/);
    
    await swapTab.click();
    await expect(swapTab).toHaveClass(/active/);
    await expect(sendTab).not.toHaveClass(/active/);
    
    // Return to Receive tab for other tests
    await receiveTab.click();
    await expect(receiveTab).toHaveClass(/active/);
  });

  test('should have complete Send tab functionality in single scenario', async ({ page }) => {
    // Navigate to Send tab
    await page.click('[data-tab="send"]');
    await expect(page.locator('#sendTab')).toBeVisible();

    // Test all form elements exist
    const usernameField = page.locator('#sendRecipient');
    const amountField = page.locator('#sendAmount');
    const tokenSelect = page.locator('#sendToken');
    const manageTokensBtn = page.locator('#sendManageTokensBtn');
    const commandPreview = page.locator('#sendCommandPreview');
    const sendButton = page.locator('#sendButton');

    await expect(usernameField).toBeVisible();
    await expect(usernameField).toHaveAttribute('placeholder', '@username');
    await expect(amountField).toBeVisible();
    await expect(amountField).toHaveAttribute('placeholder', '1');
    await expect(tokenSelect).toBeVisible();
    await expect(manageTokensBtn).toBeVisible();
    await expect(manageTokensBtn).toHaveText('📝');
    await expect(commandPreview).toBeVisible();
    await expect(sendButton).toBeVisible();
    await expect(sendButton).toHaveText(EXPECTED_TEXT.buttons.send);

    // Test blockchain radio buttons
    const solanaRadio = page.locator('#sendSolana');
    const ethereumRadio = page.locator('#sendEthereum');
    const algorandRadio = page.locator('#sendAlgorand');

    await expect(solanaRadio).toBeVisible();
    await expect(ethereumRadio).toBeVisible();
    await expect(algorandRadio).toBeVisible();
    await expect(solanaRadio).toBeChecked(); // Should be default

    // Test token options
    await verifyTokenOptions(page, '#sendToken', DEFAULT_TOKENS);

    // Test custom token management modal
    await manageTokensBtn.click();
    const modal = page.locator('#modalOverlay');
    const modalHeader = page.locator('.modal-header h2');
    const tokenInput = page.locator('#newTokenInput');
    const addButton = page.locator('#addTokenBtn');
    const closeButton = page.locator('#closeModalBtn');
    
    await expect(modal).toBeVisible();
    await expect(modalHeader).toHaveText('Manage Custom Tokens');
    await expect(tokenInput).toBeVisible();
    await expect(addButton).toBeVisible();
    await expect(closeButton).toBeVisible();
    
    await closeButton.click();
    await expect(modal).not.toBeVisible();

    // Test form functionality
    await fillFormFields(page, {
      '#sendRecipient': 'testuser',
      '#sendAmount': '10'
    });
    
    // Verify command preview updates
    await expect(commandPreview).toContainText('testuser');
    await expect(commandPreview).toContainText('10');

    // Test blockchain switching
    await ethereumRadio.click();
    await expect(ethereumRadio).toBeChecked();
    await expect(solanaRadio).not.toBeChecked();
    
    // Reset to Solana for consistency
    await solanaRadio.click();
    await expect(solanaRadio).toBeChecked();
  });

  test('should have complete Receive tab functionality in single scenario', async ({ page }) => {
    // Ensure we're on Receive tab (should be default)
    await page.click('[data-tab="receive"]');
    await expect(page.locator('#receiveTab')).toBeVisible();

    // Test QR code container and instructions
    const qrContainer = page.locator('.receive-qr-container');
    const qrCodeBlock = page.locator('#receiveQrCode');
    const qrInstructions = page.locator('.qr-instructions');
    const instructionText = page.locator('#qrInstructionText');
    const hintText = page.locator('.qr-hint');

    await expect(qrContainer).toBeVisible();
    await expect(qrCodeBlock).toBeVisible();
    await expect(qrInstructions).toBeVisible();
    await expect(instructionText).toBeVisible();
    await expect(instructionText).toContainText(EXPECTED_TEXT.qrInstruction);
    await expect(hintText).toBeVisible();
    await expect(hintText).toHaveText(EXPECTED_TEXT.qrHint);

    // Test all form elements
    const usernameField = page.locator('#receiveUsername');
    const amountField = page.locator('#receiveAmount');
    const tokenSelect = page.locator('#receiveToken');
    const manageTokensBtn = page.locator('#receiveManageTokensBtn');
    const shareButton = page.locator('#shareButton');

    await expect(usernameField).toBeVisible();
    await expect(usernameField).toHaveAttribute('placeholder', '@username');
    await expect(amountField).toBeVisible();
    await expect(amountField).toHaveAttribute('placeholder', '1');
    await expect(tokenSelect).toBeVisible();
    await expect(manageTokensBtn).toBeVisible();
    await expect(manageTokensBtn).toHaveText('📝');
    await expect(shareButton).toBeVisible();
    await expect(shareButton).toHaveText(EXPECTED_TEXT.buttons.share);

    // Test blockchain radio buttons
    const solanaRadio = page.locator('#receiveSolana');
    const ethereumRadio = page.locator('#receiveEthereum');
    const algorandRadio = page.locator('#receiveAlgorand');

    await expect(solanaRadio).toBeVisible();
    await expect(ethereumRadio).toBeVisible();
    await expect(algorandRadio).toBeVisible();
    await expect(solanaRadio).toBeChecked(); // Should be default

    // Test token options
    await verifyTokenOptions(page, '#receiveToken', DEFAULT_TOKENS);

    // Test custom token management modal
    await manageTokensBtn.click();
    const modal = page.locator('#modalOverlay');
    const modalHeader = page.locator('.modal-header h2');
    const tokenInput = page.locator('#newTokenInput');
    const addButton = page.locator('#addTokenBtn');
    const closeButton = page.locator('#closeModalBtn');
    
    await expect(modal).toBeVisible();
    await expect(modalHeader).toHaveText('Manage Custom Tokens');
    await expect(tokenInput).toBeVisible();
    await expect(addButton).toBeVisible();
    await expect(closeButton).toBeVisible();
    
    await closeButton.click();
    await expect(modal).not.toBeVisible();

    // Test form functionality and QR generation
    await fillFormFields(page, {
      '#receiveUsername': 'testuser',
      '#receiveAmount': '10'
    });
    
    // QR code should update (check if it contains data)
    await page.waitForTimeout(1000); // Allow QR generation time
    const qrContent = await qrCodeBlock.innerHTML();
    expect(qrContent.length).toBeGreaterThan(100); // QR should have significant content

    // Test blockchain switching
    await ethereumRadio.click();
    await expect(ethereumRadio).toBeChecked();
    await expect(solanaRadio).not.toBeChecked();
    
    // Reset to Solana for consistency
    await solanaRadio.click();
    await expect(solanaRadio).toBeChecked();
  });

  test('should have complete Swap tab functionality in single scenario', async ({ page }) => {
    // Navigate to Swap tab
    await page.click('[data-tab="swap"]');
    await expect(page.locator('#swapTab')).toBeVisible();

    // Test all form elements
    const amountField = page.locator('#swapAmount');
    const fromTokenSelect = page.locator('#swapFromToken');
    const fromManageTokensBtn = page.locator('#swapFromManageTokensBtn');
    const swapArrow = page.locator('.swap-arrow');
    const arrowIcon = page.locator('.arrow-icon');
    const toTokenSelect = page.locator('#swapToToken');
    const toManageTokensBtn = page.locator('#swapToManageTokensBtn');
    const commandPreview = page.locator('#swapCommandPreview');
    const swapButton = page.locator('#swapButton');

    await expect(amountField).toBeVisible();
    await expect(amountField).toHaveAttribute('placeholder', '1');
    await expect(fromTokenSelect).toBeVisible();
    await expect(fromManageTokensBtn).toBeVisible();
    await expect(fromManageTokensBtn).toHaveText('📝');
    await expect(swapArrow).toBeVisible();
    await expect(arrowIcon).toBeVisible();
    await expect(arrowIcon).toHaveText('↓');
    await expect(toTokenSelect).toBeVisible();
    await expect(toManageTokensBtn).toBeVisible();
    await expect(toManageTokensBtn).toHaveText('📝');
    await expect(commandPreview).toBeVisible();
    await expect(swapButton).toBeVisible();
    await expect(swapButton).toHaveText(EXPECTED_TEXT.buttons.swap);

    // Test blockchain radio buttons
    const solanaRadio = page.locator('#swapSolana');
    const ethereumRadio = page.locator('#swapEthereum');
    const algorandRadio = page.locator('#swapAlgorand');

    await expect(solanaRadio).toBeVisible();
    await expect(ethereumRadio).toBeVisible();
    await expect(algorandRadio).toBeVisible();
    await expect(solanaRadio).toBeChecked(); // Should be default

    // Test token options for both selects
    await verifyTokenOptions(page, '#swapFromToken', DEFAULT_TOKENS);
    await verifyTokenOptions(page, '#swapToToken', DEFAULT_TOKENS);

    // Test custom token management modals for both selects
    await fromManageTokensBtn.click();
    const modal = page.locator('#modalOverlay');
    await expect(modal).toBeVisible();
    await page.locator('#closeModalBtn').click();
    await expect(modal).not.toBeVisible();

    await toManageTokensBtn.click();
    await expect(modal).toBeVisible();
    await page.locator('#closeModalBtn').click();
    await expect(modal).not.toBeVisible();

    // Test form functionality and command preview
    await amountField.fill('10');
    await fromTokenSelect.selectOption('SOL');
    await toTokenSelect.selectOption('ETH');
    
    // Verify command preview updates
    await expect(commandPreview).toContainText('10');
    await expect(commandPreview).toContainText('SOL');
    await expect(commandPreview).toContainText('ETH');

    // Test error when same tokens are selected
    await toTokenSelect.selectOption('SOL');
    await expect(commandPreview).toContainText('Please select different tokens for swap');

    // Fix the error by selecting different tokens
    await toTokenSelect.selectOption('ETH');
    await expect(commandPreview).not.toContainText('Please select different tokens for swap');

    // Test blockchain switching
    await ethereumRadio.click();
    await expect(ethereumRadio).toBeChecked();
    await expect(solanaRadio).not.toBeChecked();
    
    // Reset to Solana for consistency
    await solanaRadio.click();
    await expect(solanaRadio).toBeChecked();
  });

  test('should have complete footer and community features in single scenario', async ({ page }) => {
    // Test footer elements
    const versionText = page.locator('#versionText');
    const footerLinks = page.locator('#footerLinks');

    await expect(versionText).toBeVisible();
    await expect(versionText).toContainText('NYLA Go v');
    
    // Footer links may not be visible on mobile, so make them optional
    const isFooterVisible = await footerLinks.isVisible();
    if (isFooterVisible) {
      await expect(footerLinks).toContainText('Feedback');
      await expect(footerLinks).toContainText('Donate');
    }

    // Test floating action button (FAB)
    const fab = page.locator('#floatingActionButton');
    const fabIcon = page.locator('.fab-icon');
    
    await expect(fab).toBeVisible();
    await expect(fabIcon).toBeVisible();
    await expect(fabIcon).toHaveText('⋯');

    // Test floating menu
    await fab.click();
    const floatingMenu = page.locator('#floatingMenu');
    await expect(floatingMenu).toBeVisible();

    // Check menu items
    const menuItems = page.locator('.floating-menu-item');
    await expect(menuItems).toHaveCount(2);
    
    const firstMenuItem = menuItems.first();
    const secondMenuItem = menuItems.last();
    
    await expect(firstMenuItem).toContainText('Community Raids');
    await expect(firstMenuItem).toContainText('🎯');
    await expect(secondMenuItem).toContainText('Community Apps');
    await expect(secondMenuItem).toContainText('🚀');

    // Close menu by clicking FAB again
    await fab.click();
    await expect(floatingMenu).not.toBeVisible();

    // Test donate link functionality (should open modal)
    const donateLink = page.locator('#donateLink');
    if (await donateLink.isVisible()) {
      await donateLink.click();
      // Check if donate modal or alert appears (implementation specific)
      // This might vary based on the actual implementation
    }
  });
});