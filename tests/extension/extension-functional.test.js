// @ts-check
const { test, expect } = require('@playwright/test');
const path = require('path');

test.describe('NYLA Go Extension - Functional Tests', () => {
  let context;
  let extensionId;

  test.beforeAll(async ({ browser }) => {
    // Load extension
    const pathToExtension = path.join(__dirname, '../../');
    context = await browser.newContext({
      args: [
        `--disable-extensions-except=${pathToExtension}`,
        `--load-extension=${pathToExtension}`,
      ],
    });

    // Get extension ID
    const page = await context.newPage();
    await page.goto('chrome://extensions/');
    await page.waitForTimeout(1000);
    
    // Find extension ID from the page
    const extensionElement = await page.locator('[data-test-extension-id]').first();
    if (await extensionElement.count() > 0) {
      extensionId = await extensionElement.getAttribute('data-test-extension-id');
    } else {
      // Fallback: try to find extension by name
      const extensionCard = await page.locator('text=NYLA Go').first().locator('..').locator('..');
      const idElement = await extensionCard.locator('[id]').first();
      if (await idElement.count() > 0) {
        const id = await idElement.getAttribute('id');
        extensionId = id?.replace('toggle-', '');
      }
    }
    
    await page.close();
  });

  test.afterAll(async () => {
    await context.close();
  });

  async function openExtensionPopup() {
    const page = await context.newPage();
    await page.goto(`chrome-extension://${extensionId}/popup.html`);
    await page.waitForLoadState('domcontentloaded');
    return page;
  }

  test.describe('Header Elements', () => {
    test('should display NYLA Go logo', async () => {
      const page = await openExtensionPopup();
      
      const logo = page.locator('.header-logo');
      await expect(logo).toBeVisible();
      await expect(logo).toHaveAttribute('alt', 'NYLA GO');
      await expect(logo).toHaveAttribute('src', /NYLAGO-Logo-v2\.png/);
      
      await page.close();
    });

    test('should display tagline', async () => {
      const page = await openExtensionPopup();
      
      const tagline = page.locator('.header p');
      await expect(tagline).toBeVisible();
      await expect(tagline).toHaveText('Your AI agent for payments and community');
      
      await page.close();
    });
  });

  test.describe('Navigation Elements', () => {
    test('should display all navigation tabs', async () => {
      const page = await openExtensionPopup();
      
      const sendTab = page.locator('[data-tab="send"]');
      const receiveTab = page.locator('[data-tab="receive"]');
      const swapTab = page.locator('[data-tab="swap"]');

      await expect(sendTab).toBeVisible();
      await expect(sendTab).toHaveText('Send');
      
      await expect(receiveTab).toBeVisible();
      await expect(receiveTab).toHaveText('Receive');
      
      await expect(swapTab).toBeVisible();
      await expect(swapTab).toHaveText('Swap');
      
      await page.close();
    });

    test('should have Receive tab active by default', async () => {
      const page = await openExtensionPopup();
      
      const receiveTab = page.locator('[data-tab="receive"]');
      await expect(receiveTab).toHaveClass(/active/);
      
      await page.close();
    });
  });

  test.describe('Send Tab Elements', () => {
    test('should display all Send tab form elements', async () => {
      const page = await openExtensionPopup();
      
      // Navigate to Send tab
      await page.click('[data-tab="send"]');
      await expect(page.locator('#sendTab')).toBeVisible();

      // Username field
      const usernameField = page.locator('#sendRecipient');
      await expect(usernameField).toBeVisible();
      await expect(usernameField).toHaveAttribute('placeholder', '@username');

      // Amount field
      const amountField = page.locator('#sendAmount');
      await expect(amountField).toBeVisible();
      await expect(amountField).toHaveAttribute('placeholder', '1');

      // Token select
      const tokenSelect = page.locator('#sendToken');
      await expect(tokenSelect).toBeVisible();

      // Custom token management button
      const manageTokensBtn = page.locator('#sendManageTokensBtn');
      await expect(manageTokensBtn).toBeVisible();
      await expect(manageTokensBtn).toHaveText('📝');
      
      await page.close();
    });

    test('should display blockchain radio buttons', async () => {
      const page = await openExtensionPopup();
      
      await page.click('[data-tab="send"]');
      
      const solanaRadio = page.locator('#sendSolana');
      const ethereumRadio = page.locator('#sendEthereum');
      const algorandRadio = page.locator('#sendAlgorand');

      await expect(solanaRadio).toBeVisible();
      await expect(ethereumRadio).toBeVisible();
      await expect(algorandRadio).toBeVisible();

      // Solana should be checked by default
      await expect(solanaRadio).toBeChecked();
      
      await page.close();
    });

    test('should display command preview', async () => {
      const page = await openExtensionPopup();
      
      await page.click('[data-tab="send"]');
      
      const commandPreview = page.locator('#sendCommandPreview');
      await expect(commandPreview).toBeVisible();
      
      await page.close();
    });

    test('should display Send to X.com button', async () => {
      const page = await openExtensionPopup();
      
      await page.click('[data-tab="send"]');
      
      const sendButton = page.locator('#sendButton');
      await expect(sendButton).toBeVisible();
      await expect(sendButton).toHaveText('💸 Send to X.com');
      
      await page.close();
    });

    test('should update command preview when form is filled', async () => {
      const page = await openExtensionPopup();
      
      await page.click('[data-tab="send"]');
      
      // Fill form
      await page.fill('#sendRecipient', 'testuser');
      await page.fill('#sendAmount', '10');
      await page.selectOption('#sendToken', 'SOL');

      // Check command preview updates
      const commandPreview = page.locator('#sendCommandPreview');
      await expect(commandPreview).toContainText('Hey @AgentNyla transfer 10 $SOL @testuser');
      
      await page.close();
    });
  });

  test.describe('Receive Tab Elements', () => {
    test('should display QR code container', async () => {
      const page = await openExtensionPopup();
      
      // Receive tab should be active by default
      const qrContainer = page.locator('.receive-qr-container');
      await expect(qrContainer).toBeVisible();

      const qrCodeBlock = page.locator('#receiveQrCode');
      await expect(qrCodeBlock).toBeVisible();
      
      await page.close();
    });

    test('should display QR instructions', async () => {
      const page = await openExtensionPopup();
      
      const qrInstructions = page.locator('.qr-instructions');
      await expect(qrInstructions).toBeVisible();

      const instructionText = page.locator('#qrInstructionText');
      await expect(instructionText).toBeVisible();
      await expect(instructionText).toContainText('Share this QR code to receive');

      const hintText = page.locator('.qr-hint');
      await expect(hintText).toBeVisible();
      await expect(hintText).toHaveText('Others can scan to send you tokens instantly');
      
      await page.close();
    });

    test('should display all Receive tab form elements', async () => {
      const page = await openExtensionPopup();
      
      // Username field
      const usernameField = page.locator('#receiveUsername');
      await expect(usernameField).toBeVisible();
      await expect(usernameField).toHaveAttribute('placeholder', '@username');

      // Amount field
      const amountField = page.locator('#receiveAmount');
      await expect(amountField).toBeVisible();
      await expect(amountField).toHaveAttribute('placeholder', '1');

      // Token select
      const tokenSelect = page.locator('#receiveToken');
      await expect(tokenSelect).toBeVisible();

      // Custom token management button
      const manageTokensBtn = page.locator('#receiveManageTokensBtn');
      await expect(manageTokensBtn).toBeVisible();
      await expect(manageTokensBtn).toHaveText('📝');
      
      await page.close();
    });

    test('should display blockchain radio buttons', async () => {
      const page = await openExtensionPopup();
      
      const solanaRadio = page.locator('#receiveSolana');
      const ethereumRadio = page.locator('#receiveEthereum');
      const algorandRadio = page.locator('#receiveAlgorand');

      await expect(solanaRadio).toBeVisible();
      await expect(ethereumRadio).toBeVisible();
      await expect(algorandRadio).toBeVisible();

      // Solana should be checked by default
      await expect(solanaRadio).toBeChecked();
      
      await page.close();
    });

    test('should display Share Payment Request button', async () => {
      const page = await openExtensionPopup();
      
      const shareButton = page.locator('#shareButton');
      await expect(shareButton).toBeVisible();
      await expect(shareButton).toHaveText('📤 Share Payment Request');
      
      await page.close();
    });

    test('should generate QR code when form is filled', async () => {
      const page = await openExtensionPopup();
      
      // Fill form
      await page.fill('#receiveUsername', 'testuser');
      await page.fill('#receiveAmount', '5');
      await page.selectOption('#receiveToken', 'NYLA');

      // Wait for QR code generation
      await page.waitForTimeout(500);

      // Check if QR code is generated
      const qrCode = page.locator('#receiveQrCode');
      const qrContent = await qrCode.innerHTML();
      expect(qrContent).not.toBe('');
      expect(qrContent).not.toContain('Generating QR Code...');
      
      await page.close();
    });
  });

  test.describe('Swap Tab Elements', () => {
    test('should display all Swap tab form elements', async () => {
      const page = await openExtensionPopup();
      
      // Navigate to Swap tab
      await page.click('[data-tab="swap"]');
      await expect(page.locator('#swapTab')).toBeVisible();

      // Amount field
      const amountField = page.locator('#swapAmount');
      await expect(amountField).toBeVisible();
      await expect(amountField).toHaveAttribute('placeholder', '1');

      // From token select
      const fromTokenSelect = page.locator('#swapFromToken');
      await expect(fromTokenSelect).toBeVisible();

      // From token management button
      const fromManageTokensBtn = page.locator('#swapFromManageTokensBtn');
      await expect(fromManageTokensBtn).toBeVisible();
      await expect(fromManageTokensBtn).toHaveText('📝');

      // To token select
      const toTokenSelect = page.locator('#swapToToken');
      await expect(toTokenSelect).toBeVisible();

      // To token management button
      const toManageTokensBtn = page.locator('#swapToManageTokensBtn');
      await expect(toManageTokensBtn).toBeVisible();
      await expect(toManageTokensBtn).toHaveText('📝');
      
      await page.close();
    });

    test('should display swap arrow', async () => {
      const page = await openExtensionPopup();
      
      await page.click('[data-tab="swap"]');
      
      const swapArrow = page.locator('.swap-arrow');
      await expect(swapArrow).toBeVisible();

      const arrowIcon = page.locator('.arrow-icon');
      await expect(arrowIcon).toBeVisible();
      await expect(arrowIcon).toHaveText('↓');
      
      await page.close();
    });

    test('should display blockchain radio buttons', async () => {
      const page = await openExtensionPopup();
      
      await page.click('[data-tab="swap"]');
      
      const solanaRadio = page.locator('#swapSolana');
      const ethereumRadio = page.locator('#swapEthereum');
      const algorandRadio = page.locator('#swapAlgorand');

      await expect(solanaRadio).toBeVisible();
      await expect(ethereumRadio).toBeVisible();
      await expect(algorandRadio).toBeVisible();

      // Solana should be checked by default
      await expect(solanaRadio).toBeChecked();
      
      await page.close();
    });

    test('should display command preview', async () => {
      const page = await openExtensionPopup();
      
      await page.click('[data-tab="swap"]');
      
      const commandPreview = page.locator('#swapCommandPreview');
      await expect(commandPreview).toBeVisible();
      
      await page.close();
    });

    test('should display Send to X.com button', async () => {
      const page = await openExtensionPopup();
      
      await page.click('[data-tab="swap"]');
      
      const swapButton = page.locator('#swapButton');
      await expect(swapButton).toBeVisible();
      await expect(swapButton).toHaveText('🔄 Send to X.com');
      
      await page.close();
    });

    test('should update command preview when tokens are selected', async () => {
      const page = await openExtensionPopup();
      
      await page.click('[data-tab="swap"]');
      
      // Select different tokens
      await page.fill('#swapAmount', '2');
      await page.selectOption('#swapFromToken', 'ETH');
      await page.selectOption('#swapToToken', 'NYLA');

      // Check command preview updates
      const commandPreview = page.locator('#swapCommandPreview');
      await expect(commandPreview).toContainText('Hey @AgentNyla swap 2 $ETH for $NYLA');
      
      await page.close();
    });

    test('should show error when same tokens are selected', async () => {
      const page = await openExtensionPopup();
      
      await page.click('[data-tab="swap"]');
      
      // Select same tokens
      await page.selectOption('#swapFromToken', 'SOL');
      await page.selectOption('#swapToToken', 'SOL');

      // Check error message
      const commandPreview = page.locator('#swapCommandPreview');
      await expect(commandPreview).toHaveText('Please select different tokens for swap');
      await expect(commandPreview).toHaveClass(/empty/);
      
      await page.close();
    });
  });

  test.describe('Custom Token Management', () => {
    test('should open custom token modal when manage button is clicked', async () => {
      const page = await openExtensionPopup();
      
      // Click manage tokens button in Receive tab
      await page.click('#receiveManageTokensBtn');

      // Check modal opens
      const modal = page.locator('#modalOverlay');
      await expect(modal).toBeVisible();

      const modalTitle = page.locator('.modal-header h2');
      await expect(modalTitle).toHaveText('Manage Custom Tokens');
      
      await page.close();
    });

    test('should display modal elements', async () => {
      const page = await openExtensionPopup();
      
      // Open modal
      await page.click('#receiveManageTokensBtn');

      // Check modal elements
      const newTokenInput = page.locator('#newTokenInput');
      await expect(newTokenInput).toBeVisible();
      await expect(newTokenInput).toHaveAttribute('placeholder', 'Enter token symbol (e.g., BTC)');

      const addTokenBtn = page.locator('#addTokenBtn');
      await expect(addTokenBtn).toBeVisible();
      await expect(addTokenBtn).toHaveText('Add Token');

      const customTokensList = page.locator('#customTokensList');
      await expect(customTokensList).toBeVisible();

      const closeBtn = page.locator('#closeModalBtn');
      await expect(closeBtn).toBeVisible();
      
      await page.close();
    });

    test('should close modal when close button is clicked', async () => {
      const page = await openExtensionPopup();
      
      // Open modal
      await page.click('#receiveManageTokensBtn');
      await expect(page.locator('#modalOverlay')).toBeVisible();

      // Close modal
      await page.click('#closeModalBtn');
      await expect(page.locator('#modalOverlay')).not.toBeVisible();
      
      await page.close();
    });
  });

  test.describe('Footer Elements', () => {
    test('should display version text', async () => {
      const page = await openExtensionPopup();
      
      const versionText = page.locator('#versionText');
      await expect(versionText).toBeVisible();
      await expect(versionText).toContainText('NYLA Go v');
      
      await page.close();
    });

    test('should display footer links', async () => {
      const page = await openExtensionPopup();
      
      const footerLinks = page.locator('#footerLinks');
      await expect(footerLinks).toBeVisible();
      
      // Should contain Feedback and Donate links
      await expect(footerLinks).toContainText('Feedback');
      await expect(footerLinks).toContainText('Donate');
      
      await page.close();
    });
  });

  test.describe('Community Features', () => {
    test('should display three-dot menu button', async () => {
      const page = await openExtensionPopup();
      
      const menuButton = page.locator('#threeDotMenu');
      await expect(menuButton).toBeVisible();
      await expect(menuButton).toHaveText('⋯');
      
      await page.close();
    });

    test('should show community menu when three-dot button is clicked', async () => {
      const page = await openExtensionPopup();
      
      // Click three-dot menu
      await page.click('#threeDotMenu');

      // Check menu appears
      const communityMenu = page.locator('#communityMenu');
      await expect(communityMenu).toBeVisible();

      // Check menu items
      const raidItem = page.locator('[data-action="raid"]');
      const appItem = page.locator('[data-action="app"]');

      await expect(raidItem).toBeVisible();
      await expect(raidItem).toContainText('Community Raids');

      await expect(appItem).toBeVisible();
      await expect(appItem).toContainText('Community Apps');
      
      await page.close();
    });
  });

  test.describe('Token Options', () => {
    test('should have default token options in all selects', async () => {
      const page = await openExtensionPopup();
      
      const expectedTokens = ['NYLA', 'SOL', 'ETH', 'ALGO', 'USDC', 'USDT'];
      
      // Check Send tab token select
      await page.click('[data-tab="send"]');
      const sendTokenOptions = await page.locator('#sendToken option').allTextContents();
      expectedTokens.forEach(token => {
        expect(sendTokenOptions).toContain(token);
      });

      // Check Receive tab token select
      await page.click('[data-tab="receive"]');
      const receiveTokenOptions = await page.locator('#receiveToken option').allTextContents();
      expectedTokens.forEach(token => {
        expect(receiveTokenOptions).toContain(token);
      });

      // Check Swap tab token selects
      await page.click('[data-tab="swap"]');
      const swapFromTokenOptions = await page.locator('#swapFromToken option').allTextContents();
      const swapToTokenOptions = await page.locator('#swapToToken option').allTextContents();
      
      expectedTokens.forEach(token => {
        expect(swapFromTokenOptions).toContain(token);
        expect(swapToTokenOptions).toContain(token);
      });
      
      await page.close();
    });
  });
});