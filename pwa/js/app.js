// NYLA GO PWA - Main Application Logic

document.addEventListener('DOMContentLoaded', function() {
  // Splash Screen Elements
  const splashScreen = document.getElementById('splashScreen');
  const splashVideo = document.getElementById('splashVideo');
  const splashFallback = document.getElementById('splashFallback');
  const appContainer = document.getElementById('appContainer');

  // DOM Elements - Receive Tab
  const receiveUsernameInput = document.getElementById('receiveUsername');
  const receiveAmountInput = document.getElementById('receiveAmount');
  const receiveTokenSelect = document.getElementById('receiveToken');
  const receiveQrCode = document.getElementById('receiveQrCode');
  const shareButton = document.getElementById('shareButton');
  const receiveBlockchainRadios = document.querySelectorAll('input[name="receiveBlockchain"]');
  const qrInstructionText = document.getElementById('qrInstructionText');
  
  // DOM Elements - Swap Tab
  const swapAmount = document.getElementById('swapAmount');
  const swapFromToken = document.getElementById('swapFromToken');
  const swapToToken = document.getElementById('swapToToken');
  const swapCommandPreview = document.getElementById('swapCommandPreview');
  const swapButton = document.getElementById('swapButton');
  
  // DOM Elements - Send Tab
  const sendRecipient = document.getElementById('sendRecipient');
  const sendAmount = document.getElementById('sendAmount');
  const sendToken = document.getElementById('sendToken');
  const sendCommandPreview = document.getElementById('sendCommandPreview');
  const sendButton = document.getElementById('sendButton');
  const sendBlockchainRadios = document.querySelectorAll('input[name="sendBlockchain"]');
  
  // Common Elements
  const statusDiv = document.getElementById('status');
  const versionText = document.getElementById('versionText');
  
  // Custom Token Management Elements
  const modalOverlay = document.getElementById('modalOverlay');
  const closeModalBtn = document.getElementById('closeModalBtn');
  const newTokenInput = document.getElementById('newTokenInput');
  const addTokenBtn = document.getElementById('addTokenBtn');
  const customTokensList = document.getElementById('customTokensList');
  const noCustomTokens = document.getElementById('noCustomTokens');
  const tokenError = document.getElementById('tokenError');
  
  // Custom Token Management Buttons
  const sendManageTokensBtn = document.getElementById('sendManageTokensBtn');
  const receiveManageTokensBtn = document.getElementById('receiveManageTokensBtn');
  const swapFromManageTokensBtn = document.getElementById('swapFromManageTokensBtn');
  const swapToManageTokensBtn = document.getElementById('swapToManageTokensBtn');
  
  // Tab Elements
  const tabButtons = document.querySelectorAll('.tab-button');
  const nylaTab = document.getElementById('nylaTab');
  const swapTab = document.getElementById('swapTab');
  const receiveTab = document.getElementById('receiveTab');
  const sendTab = document.getElementById('sendTab');
  const raidTab = document.getElementById('raidTab');
  const appTab = document.getElementById('appTab');
  const raidListItems = document.querySelectorAll('.raid-list-item');
  const appItems = document.querySelectorAll('.app-item');

  // App version - will be dynamically determined
  let APP_VERSION = '2.6.0';

  // Default tokens (same as Extension)
  const defaultTokens = ['NYLA', 'SOL', 'ETH', 'ALGO', 'USDC', 'USDT'];
  
  // Custom token management state
  let currentManageTokensSelect = null;

  // i18n is Extension-only - removed from PWA

  // Initialize app
  console.log('NYLA GO PWA: Starting application');
  
  // Generate footer from shared data
  function generateFooter() {
    const footerLinks = document.getElementById('footerLinks');
    if (!footerLinks) {
      console.log('NYLA PWA: Footer generation failed - footerLinks element not found');
      return;
    }
    
    if (!window.NYLA_FOOTER_DATA) {
      console.log('NYLA PWA: Footer generation failed - NYLA_FOOTER_DATA not available, using fallback');
      // Fallback footer content
      footerLinks.innerHTML = '<a href="https://x.com/h2crypto_eth" target="_blank">Feedback</a> | <span class="donate-link" id="donateLink">Donate</span>';
      addFooterEventListeners();
      return;
    }
    
    console.log('NYLA PWA: Generating footer with shared data');
    
    // Clear existing content
    footerLinks.innerHTML = '';
    
    // Generate links from shared data
    const linkElements = window.NYLA_FOOTER_DATA.links.map(link => {
      if (link.type === 'link') {
        return `<a href="${link.url}" target="${link.target || '_self'}">${link.text}</a>`;
      } else if (link.type === 'action') {
        return `<span class="donate-link" id="${link.id}Link">${link.text}</span>`;
      }
    });
    
    // Join with separator
    footerLinks.innerHTML = linkElements.join(' | ');
    
    // Add event listeners after generating footer
    addFooterEventListeners();
  }
  
  // Add event listeners to dynamically generated footer links
  function addFooterEventListeners() {
    console.log('NYLA PWA: Adding footer event listeners');
    // Donate link click handler (same behavior as Extension)
    const donateLink = document.getElementById('donateLink');
    if (donateLink) {
      console.log('NYLA PWA: Donate link found, adding event listener');
    donateLink.addEventListener('click', function() {
      // Check if Send tab is not currently active and switch to it
      const sendButton = document.querySelector('.tab-button[data-tab="send"]');
      if (sendButton && !sendButton.classList.contains('active')) {
        sendButton.click();
        console.log('NYLA PWA: Switched to Send tab via donate link');
      }
      
      // Auto-fill recipient with developer's X username
      const sendRecipientInput = document.getElementById('sendRecipient');
      if (sendRecipientInput) {
        sendRecipientInput.value = '@h2crypto_eth';
      }
      
      // Update command preview - PWA will auto-update via event listeners
      
      // Save the username
      saveUsername();
      
      // Show a subtle feedback animation
      this.style.transform = 'scale(0.95)';
      setTimeout(() => {
        this.style.transform = 'scale(1)';
      }, 150);
      
      // Optional: Show a brief thank you message
      showStatus('Thanks for considering a donation! 💜', 'success');
    });
    }
  }
  
  // Initialize device detection and layout
  initializeDeviceDetection();
  
  // Initialize splash screen
  initializeSplashScreen();
  
  // Generate initial QR code with default values (after splash)
  async function initializeApp() {
    // Load saved username from localStorage
    const savedUsername = localStorage.getItem('nylaGoUsername');
    if (savedUsername) {
      receiveUsernameInput.value = savedUsername;
    }
    
    // Load custom tokens and update dropdowns
    updateAllTokenDropdowns();
    
    // Generate footer from shared data
    generateFooter();
    
    // Update version text dynamically
    updateVersionText();
    
    // Generate raid section from shared data
    generateRaidSection();
    
    // Load Roboto font for NYLA conversation
    loadRobotoFont();
    
    // Start WebLLM preload in background for faster NYLA responses (desktop only)
    // This happens after splash screen, so users can use other tabs while engine loads
    const isLikelyMobile = /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    
    if (isLikelyMobile) {
      console.log('PWA: 📱 Mobile device detected - skipping WebLLM preload to save resources');
      console.log('PWA: NYLA assistant will be disabled on mobile devices');
    } else {
      // Check LLM provider configuration before preloading WebLLM
      const llmConfig = window.NYLALLMConfig;
      const currentProvider = llmConfig ? llmConfig.getCurrentProviderName() : 'unknown';
      
      if (currentProvider === 'hosted') {
        console.log('PWA: 🖥️ Desktop device detected but using hosted LLM - skipping WebLLM preload');
      } else if (currentProvider === 'unknown') {
        console.log('PWA: ⚠️ LLM config not yet available, will retry WebLLM check in fallback logic');
      } else if (window.nylaSystemController && typeof window.nylaSystemController.preloadLLMEngine === 'function') {
        console.log('PWA: 🖥️ Desktop device detected - starting WebLLM preload for faster NYLA responses...');
        setTimeout(() => {
          try {
            // Double-check the method still exists before calling
            if (window.nylaSystemController && typeof window.nylaSystemController.preloadLLMEngine === 'function') {
              window.nylaSystemController.preloadLLMEngine();
            } else {
              console.warn('PWA: preloadLLMEngine method no longer available in setTimeout callback');
              console.warn('PWA: System controller exists:', !!window.nylaSystemController);
              console.warn('PWA: Method type:', typeof window.nylaSystemController?.preloadLLMEngine);
            }
          } catch (error) {
            console.warn('PWA: Failed to preload LLM engine:', error.message);
          }
        }, 500); // Small delay to let UI finish initializing
      } else {
        console.warn('PWA: System controller or preloadLLMEngine method not available yet');
        // Retry after a longer delay to allow system controller to fully initialize (desktop only)
        setTimeout(() => {
          const retryLlmConfig = window.NYLALLMConfig;
          const retryProvider = retryLlmConfig ? retryLlmConfig.getCurrentProviderName() : 'unknown';
          
          if (retryProvider === 'hosted') {
            console.log('PWA: Retry skipped - using hosted LLM');
          } else if (!isLikelyMobile && window.nylaSystemController && typeof window.nylaSystemController.preloadLLMEngine === 'function') {
            console.log('PWA: 🚀 Retrying WebLLM preload...');
            try {
              // Triple-check before calling in retry
              if (window.nylaSystemController && typeof window.nylaSystemController.preloadLLMEngine === 'function') {
                window.nylaSystemController.preloadLLMEngine();
              } else {
                console.warn('PWA: Method disappeared during retry execution');
              }
            } catch (error) {
              console.warn('PWA: Retry failed to preload LLM engine:', error.message);
            }
          } else {
            console.warn('PWA: System controller still not ready after retry - skipping LLM preload');
            console.warn('PWA: System controller exists:', !!window.nylaSystemController);
            console.warn('PWA: Method type:', typeof window.nylaSystemController?.preloadLLMEngine);
          }
        }, 2000); // Longer delay for retry
      }
    }
    
    setTimeout(() => {
      generateReceiveQRCode();
      generateSwapCommand();
      generateSendCommand();
    }, 200);
  }

  // Get version from service worker cache or fallback to default
  async function getAppVersion() {
    try {
      // Try to get version from service worker
      if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
        // Check cache names to extract version
        const cacheNames = await caches.keys();
        const nylaCache = cacheNames.find(name => name.includes('nyla-go-pwa-v'));
        if (nylaCache) {
          const versionMatch = nylaCache.match(/v(\d+\.\d+\.\d+)/);
          if (versionMatch) {
            return versionMatch[1];
          }
        }
      }
    } catch (error) {
      console.log('NYLA GO PWA: Could not get version from service worker, using default');
    }
    return APP_VERSION; // fallback to default
  }

  // Update version text in footer
  async function updateVersionText() {
    if (versionText) {
      const version = await getAppVersion();
      versionText.textContent = `NYLA Go v${version}`;
      console.log('NYLA GO PWA: Version updated to', version);
    }
  }

  // Add NYLA Go signature to commands
  function addNYLAGoSignature(command) {
    if (!command || command.trim() === '') {
      console.error('NYLA PWA: Empty command passed to signature function!');
      return 'ERROR: Empty command - please fill in recipient, amount, and token fields\n\nSent via #NYLAGo';
    }
    // Check if signature already exists to prevent double-signature
    if (command.includes('Sent via #NYLAGo')) {
      return command;
    }
    return `${command}\n\nSent via #NYLAGo`;
  }

  // Generate X.com mobile URL for QR codes
  function generateXMobileURL(command) {
    const commandWithSignature = addNYLAGoSignature(command);
    const encodedCommand = encodeURIComponent(commandWithSignature);
    return `https://x.com/intent/post?text=${encodedCommand}`;
  }

  // Update QR instruction text based on token
  function updateQRInstructionText() {
    const token = receiveTokenSelect.value || 'NYLA';
    // PWA uses static English text (i18n is Extension-only)
    qrInstructionText.textContent = `📱 Share this QR code to receive ${token} payments`;
  }

  // Generate QR Code for payment requests
  function generateReceiveQRCode() {
    const username = receiveUsernameInput.value.trim().replace('@', '') || 'username';
    const amount = receiveAmountInput.value || '1';
    const token = receiveTokenSelect.value || 'NYLA';
    
    // Update instruction text
    updateQRInstructionText();
    
    // Get selected blockchain
    let blockchain = 'Solana'; // default
    receiveBlockchainRadios.forEach(radio => {
      if (radio.checked) {
        blockchain = radio.value;
      }
    });
    
    // Generate command for QR code
    let command;
    if (blockchain === 'Solana') {
      command = `Hey @AgentNyla transfer ${amount} $${token} @${username}`;
    } else {
      command = `Hey @AgentNyla transfer ${amount} $${token} @${username} ${blockchain}`;
    }
    
    // Generate mobile URL
    const mobileURL = generateXMobileURL(command);
    
    // Clear existing QR code
    receiveQrCode.innerHTML = '';
    
    // Add loading placeholder
    const loadingDiv = document.createElement('div');
    loadingDiv.style.cssText = `
      width: 200px;
      height: 200px;
      background: #f0f0f0;
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      color: #666;
      font-size: 14px;
      margin: 0 auto;
    `;
    loadingDiv.textContent = 'Generating QR Code...';
    receiveQrCode.appendChild(loadingDiv);
    
    // Generate QR code after small delay
    setTimeout(() => {
      try {
        receiveQrCode.innerHTML = '';
        const qrElement = SimpleQR.create(mobileURL, 200);
        
        // Style the QR element
        qrElement.style.margin = '0 auto';
        qrElement.style.borderRadius = '8px';
        qrElement.style.cursor = 'pointer';
        qrElement.title = 'Tap to open X.com compose';
        
        // Add click handler for mobile
        qrElement.addEventListener('click', () => {
          window.open(mobileURL, '_blank');
        });
        
        receiveQrCode.appendChild(qrElement);
        console.log('NYLA GO PWA: QR code generated successfully');
      } catch (error) {
        console.error('NYLA GO PWA: QR generation failed:', error);
        receiveQrCode.innerHTML = `
          <div style="color: #ef4444; padding: 20px; text-align: center;">
            <div style="font-size: 18px; margin-bottom: 10px;">⚠️</div>
            <div style="font-size: 14px;">QR generation failed</div>
            <a href="${mobileURL}" target="_blank" style="color: #FF6B35; font-size: 12px; display: inline-block; margin-top: 8px; text-decoration: underline;">Open X.com manually →</a>
          </div>
        `;
      }
    }, 200);
  }

  // Generate Swap Command Preview
  function generateSwapCommand() {
    if (!swapAmount || !swapFromToken || !swapToToken || !swapCommandPreview) return;
    
    const amount = swapAmount.value || '1';
    const fromToken = swapFromToken.value || 'SOL';
    const toToken = swapToToken.value || 'NYLA';
    
    // Get selected blockchain
    const swapBlockchainRadios = document.querySelectorAll('input[name="swapBlockchain"]');
    let blockchain = 'Solana'; // default
    swapBlockchainRadios.forEach(radio => {
      if (radio.checked) {
        blockchain = radio.value;
      }
    });
    
    if (fromToken === toToken) {
      swapCommandPreview.textContent = 'Please select different tokens for swap';
      swapCommandPreview.classList.add('empty');
      return;
    }
    
    let command;
    if (blockchain === 'Solana') {
      // Default blockchain (Solana) - no blockchain suffix needed
      command = `Hey @AgentNyla swap ${amount} $${fromToken} for $${toToken}`;
    } else {
      // Non-default blockchains (Ethereum, Algorand) - add blockchain suffix
      command = `Hey @AgentNyla swap ${amount} $${fromToken} for $${toToken} ${blockchain}`;
    }
    
    swapCommandPreview.textContent = command;
    swapCommandPreview.classList.remove('empty');
  }

  // Generate Send Command Preview
  function generateSendCommand() {
    if (!sendRecipient || !sendAmount || !sendToken || !sendCommandPreview) return;
    
    const recipient = sendRecipient.value.trim().replace('@', '') || 'username';
    const amount = sendAmount.value || '1';
    const token = sendToken.value || 'NYLA';
    
    // Get selected blockchain
    let blockchain = 'Solana'; // default
    sendBlockchainRadios.forEach(radio => {
      if (radio && radio.checked) {
        blockchain = radio.value;
      }
    });
    
    // Generate command
    let command;
    if (blockchain === 'Solana') {
      command = `Hey @AgentNyla transfer ${amount} $${token} @${recipient}`;
    } else {
      command = `Hey @AgentNyla transfer ${amount} $${token} @${recipient} ${blockchain}`;
    }
    
    sendCommandPreview.textContent = command;
    sendCommandPreview.classList.remove('empty');
  }

  // Save username to localStorage when changed
  function saveUsername() {
    const username = receiveUsernameInput.value.trim();
    if (username) {
      localStorage.setItem('nylaGoUsername', username);
    } else {
      localStorage.removeItem('nylaGoUsername');
    }
  }

  // === CUSTOM TOKEN MANAGEMENT FUNCTIONS ===
  
  // Get custom tokens from localStorage
  function getCustomTokens() {
    try {
      const stored = localStorage.getItem('nylaGoCustomTokens');
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error('NYLA PWA: Error loading custom tokens:', error);
      return [];
    }
  }

  // Save custom tokens to localStorage
  function saveCustomTokens(tokens) {
    try {
      localStorage.setItem('nylaGoCustomTokens', JSON.stringify(tokens));
      console.log('NYLA PWA: Custom tokens saved:', tokens);
    } catch (error) {
      console.error('NYLA PWA: Error saving custom tokens:', error);
      showTokenError('Failed to save custom tokens');
    }
  }

  // Validate token symbol
  function validateTokenSymbol(symbol) {
    if (!symbol || symbol.trim().length === 0) {
      return 'Token symbol cannot be empty';
    }
    
    const trimmedSymbol = symbol.trim().toUpperCase();
    
    if (trimmedSymbol.length > 10) {
      return 'Token symbol cannot exceed 10 characters';
    }
    
    if (!/^[A-Z0-9]+$/.test(trimmedSymbol)) {
      return 'Token symbol can only contain letters and numbers';
    }
    
    // Check if token already exists (default or custom)
    const customTokens = getCustomTokens();
    const allTokens = [...defaultTokens, ...customTokens];
    
    if (allTokens.includes(trimmedSymbol)) {
      return 'Token already exists in the list';
    }
    
    return null; // Valid
  }

  // Add new custom token
  function addCustomToken() {
    const symbol = newTokenInput.value.trim().toUpperCase();
    
    // Clear previous error
    clearTokenError();
    
    // Validate token
    const validationError = validateTokenSymbol(symbol);
    if (validationError) {
      showTokenError(validationError);
      return;
    }
    
    // Add to custom tokens
    const customTokens = getCustomTokens();
    customTokens.push(symbol);
    customTokens.sort(); // Keep alphabetical order
    saveCustomTokens(customTokens);
    
    // Update all token dropdowns
    updateAllTokenDropdowns();
    
    // Clear input and update display
    newTokenInput.value = '';
    updateCustomTokensList();
    
    // Show success feedback
    showStatus(`Token ${symbol} added successfully!`, 'success');
    setTimeout(hideStatus, 2000);
  }

  // Remove custom token
  function removeCustomToken(symbol) {
    const customTokens = getCustomTokens();
    const updatedTokens = customTokens.filter(token => token !== symbol);
    saveCustomTokens(updatedTokens);
    
    // Update all token dropdowns
    updateAllTokenDropdowns();
    
    // Update display
    updateCustomTokensList();
    
    // Show feedback
    showStatus(`Token ${symbol} removed`, 'success');
    setTimeout(hideStatus, 2000);
  }

  // Update all token dropdown options
  function updateAllTokenDropdowns() {
    const customTokens = getCustomTokens();
    const allTokens = [...defaultTokens, ...customTokens];
    
    // Update all token selects
    const tokenSelects = [sendToken, receiveToken, swapFromToken, swapToToken];
    
    tokenSelects.forEach(select => {
      if (select) {
        const currentValue = select.value;
        
        // Clear existing options
        select.innerHTML = '';
        
        // Add all tokens as options
        allTokens.forEach(token => {
          const option = document.createElement('option');
          option.value = token;
          option.textContent = token;
          select.appendChild(option);
        });
        
        // Restore previous selection if still valid
        if (allTokens.includes(currentValue)) {
          select.value = currentValue;
        } else {
          select.value = 'NYLA'; // Default fallback
        }
      }
    });
    
    // Trigger update events for any active tab
    if (receiveTab && receiveTab.style.display !== 'none') {
      generateReceiveQRCode();
    }
    if (sendTab && sendTab.style.display !== 'none') {
      generateSendCommand();
    }
    if (swapTab && swapTab.style.display !== 'none') {
      generateSwapCommand();
    }
  }

  // Update custom tokens list display
  function updateCustomTokensList() {
    const customTokens = getCustomTokens();
    
    if (customTokens.length === 0) {
      customTokensList.innerHTML = '<div class="no-custom-tokens" id="noCustomTokens">No custom tokens added yet.</div>';
    } else {
      customTokensList.innerHTML = customTokens.map(token => `
        <div class="custom-token-item">
          <span class="token-symbol">${token}</span>
          <button type="button" class="remove-token-btn" onclick="removeCustomToken('${token}')">Remove</button>
        </div>
      `).join('');
    }
  }

  // Show/hide token error messages
  function showTokenError(message) {
    if (tokenError) {
      tokenError.textContent = message;
      tokenError.style.display = 'block';
    }
  }

  function clearTokenError() {
    if (tokenError) {
      tokenError.textContent = '';
      tokenError.style.display = 'none';
    }
  }

  // Open custom tokens modal
  function openCustomTokensModal(selectElement) {
    currentManageTokensSelect = selectElement;
    updateCustomTokensList();
    clearTokenError();
    
    if (modalOverlay) {
      modalOverlay.style.display = 'flex';
      
      // Focus the input after modal opens
      setTimeout(() => {
        if (newTokenInput) {
          newTokenInput.focus();
        }
      }, 100);
    }
  }

  // Close custom tokens modal
  function closeCustomTokensModal() {
    if (modalOverlay) {
      modalOverlay.style.display = 'none';
    }
    currentManageTokensSelect = null;
    clearTokenError();
  }

  // Make removeCustomToken globally available for onclick handlers
  window.removeCustomToken = removeCustomToken;

  // Function to generate raid section dynamically
  function generateRaidSection() {
    const raidCategoriesContainer = document.getElementById('raidCategories');
    if (!raidCategoriesContainer || !window.NYLA_RAID_DATA) return;
    
    // Clear existing content
    raidCategoriesContainer.innerHTML = '';
    
    // Generate categories
    window.NYLA_RAID_DATA.categories.forEach(category => {
      const categoryDiv = document.createElement('div');
      categoryDiv.className = 'raid-category';
      
      const categoryTitle = document.createElement('h4');
      categoryTitle.textContent = category.title;
      categoryDiv.appendChild(categoryTitle);
      
      // Generate items for this category
      category.items.forEach(item => {
        const itemDiv = document.createElement('div');
        itemDiv.className = 'raid-list-item';
        itemDiv.setAttribute('data-url', item.url);
        
        itemDiv.innerHTML = `
          <div class="list-info">
            <div class="list-name">${item.name}</div>
            <div class="list-description">${item.description}</div>
          </div>
          <div class="list-action">
            <span class="open-icon">${item.icon}</span>
          </div>
        `;
        
        categoryDiv.appendChild(itemDiv);
      });
      
      raidCategoriesContainer.appendChild(categoryDiv);
    });
    
    // Add click handlers to dynamically generated items
    addRaidClickHandlers();
  }
  
  // Function to add click handlers to raid items
  function addRaidClickHandlers() {
    const raidListItems = document.querySelectorAll('.raid-list-item');
    raidListItems.forEach(item => {
      item.addEventListener('click', function() {
        const listUrl = this.dataset.url;
        if (listUrl) {
          console.log('NYLA GO PWA: Opening raid list:', listUrl);
          window.open(listUrl, '_blank');
          showStatus('Opening X.com list...', 'success');
          setTimeout(hideStatus, 2000);
        }
      });
    });
  }

  // Event Listeners - Receive Tab
  if (receiveUsernameInput) {
    receiveUsernameInput.addEventListener('input', function() {
      saveUsername();
      generateReceiveQRCode();
    });
  }
  if (receiveAmountInput) receiveAmountInput.addEventListener('input', generateReceiveQRCode);
  if (receiveTokenSelect) receiveTokenSelect.addEventListener('change', generateReceiveQRCode);
  
  receiveBlockchainRadios.forEach(radio => {
    if (radio) radio.addEventListener('change', generateReceiveQRCode);
  });

  // Event Listeners - Swap Tab
  if (swapAmount) swapAmount.addEventListener('input', generateSwapCommand);
  if (swapFromToken) swapFromToken.addEventListener('change', generateSwapCommand);
  if (swapToToken) swapToToken.addEventListener('change', generateSwapCommand);
  
  // Swap blockchain radio button event listeners
  const swapBlockchainRadios = document.querySelectorAll('input[name="swapBlockchain"]');
  swapBlockchainRadios.forEach(radio => {
    if (radio) radio.addEventListener('change', generateSwapCommand);
  });
  
  // Event Listeners - Send Tab
  if (sendRecipient) sendRecipient.addEventListener('input', generateSendCommand);
  if (sendAmount) sendAmount.addEventListener('input', generateSendCommand);
  if (sendToken) sendToken.addEventListener('change', generateSendCommand);
  
  sendBlockchainRadios.forEach(radio => {
    if (radio) radio.addEventListener('change', generateSendCommand);
  });

  // === CUSTOM TOKEN MANAGEMENT EVENT LISTENERS ===
  
  // Custom token management button event listeners
  if (sendManageTokensBtn) {
    sendManageTokensBtn.addEventListener('click', () => openCustomTokensModal(sendToken));
  }
  
  if (receiveManageTokensBtn) {
    receiveManageTokensBtn.addEventListener('click', () => openCustomTokensModal(receiveToken));
  }
  
  if (swapFromManageTokensBtn) {
    swapFromManageTokensBtn.addEventListener('click', () => openCustomTokensModal(swapFromToken));
  }
  
  if (swapToManageTokensBtn) {
    swapToManageTokensBtn.addEventListener('click', () => openCustomTokensModal(swapToToken));
  }

  // Modal event listeners
  if (closeModalBtn) {
    closeModalBtn.addEventListener('click', closeCustomTokensModal);
  }

  if (addTokenBtn) {
    addTokenBtn.addEventListener('click', addCustomToken);
  }

  if (newTokenInput) {
    // Allow Enter key to add token
    newTokenInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        addCustomToken();
      }
    });
    
    // Clear error on input
    newTokenInput.addEventListener('input', clearTokenError);
  }

  // Close modal when clicking overlay
  if (modalOverlay) {
    modalOverlay.addEventListener('click', (e) => {
      if (e.target === modalOverlay) {
        closeCustomTokensModal();
      }
    });
  }

  // Close modal with Escape key
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && modalOverlay && modalOverlay.style.display === 'flex') {
      closeCustomTokensModal();
    }
  });

  // Tab switching functionality
  tabButtons.forEach(button => {
    button.addEventListener('click', function() {
      const tabName = this.dataset.tab;
      
      // Check if this is the NYLA tab on mobile - prevent activation
      const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
      if (tabName === 'nyla' && isMobile) {
        console.log('NYLA GO PWA: NYLA tab disabled on mobile devices');
        showStatus('NYLA assistant is temporarily disabled on mobile devices', 'info');
        setTimeout(hideStatus, 3000);
        return; // Exit early, don't switch to NYLA tab
      }
      
      // Remove active class from all tabs and buttons
      tabButtons.forEach(btn => btn.classList.remove('active'));
      if (nylaTab) nylaTab.classList.remove('active');
      if (swapTab) swapTab.classList.remove('active');
      if (receiveTab) receiveTab.classList.remove('active');
      if (sendTab) sendTab.classList.remove('active');
      if (raidTab) raidTab.classList.remove('active');
      if (appTab) appTab.classList.remove('active');
      
      // Hide all tab content
      if (nylaTab) nylaTab.style.display = 'none';
      if (swapTab) swapTab.style.display = 'none';
      if (receiveTab) receiveTab.style.display = 'none';
      if (sendTab) sendTab.style.display = 'none';
      if (raidTab) raidTab.style.display = 'none';
      if (appTab) appTab.style.display = 'none';
      
      // Show selected tab
      this.classList.add('active');
      
      if (tabName === 'nyla') {
        if (nylaTab) {
          nylaTab.classList.add('active');
          nylaTab.style.display = 'block';
          // Notify NYLA assistant that tab is activated
          if (window.nylaAssistant && window.nylaAssistant.conversationManager) {
            window.nylaAssistant.onTabActivated();
          } else {
            console.log('NYLA tab activated but assistant not fully initialized');
          }
        }
      } else if (tabName === 'swap') {
        if (swapTab) {
          swapTab.classList.add('active');
          swapTab.style.display = 'block';
          generateSwapCommand();
        }
      } else if (tabName === 'receive') {
        if (receiveTab) {
          receiveTab.classList.add('active');
          receiveTab.style.display = 'block';
          // Generate QR code when switching to receive tab
          generateReceiveQRCode();
        }
      } else if (tabName === 'send') {
        if (sendTab) {
          sendTab.classList.add('active');
          sendTab.style.display = 'block';
          generateSendCommand();
        }
      } else if (tabName === 'raid') {
        if (raidTab) {
          raidTab.classList.add('active');
          raidTab.style.display = 'block';
        }
      } else if (tabName === 'app') {
        if (appTab) {
          appTab.classList.add('active');
          appTab.style.display = 'block';
        }
      }
    });
  });

  // Raid list item click handlers are now added dynamically in generateRaidSection()

  // App item click handlers  
  appItems.forEach(item => {
    item.addEventListener('click', function() {
      const appUrl = this.dataset.url;
      if (appUrl) {
        console.log('NYLA GO PWA: Opening community app:', appUrl);
        window.open(appUrl, '_blank');
        showStatus('Opening community app...', 'success');
        setTimeout(hideStatus, 2000);
      }
    });
  });

  // Swap button click handler
  if (swapButton) {
    swapButton.addEventListener('click', function() {
      const amount = swapAmount?.value || '1';
      const fromToken = swapFromToken?.value || 'SOL';
      const toToken = swapToToken?.value || 'NYLA';
      
      if (fromToken === toToken) {
        showStatus('Please select different tokens for swap', 'error');
        setTimeout(hideStatus, 3000);
        return;
      }
      
      const command = `Hey @AgentNyla swap ${amount} ${fromToken} to ${toToken}`;
      const mobileURL = generateXMobileURL(command);
      
      window.open(mobileURL, '_blank');
      showStatus('Opening X.com with swap command...', 'success');
      setTimeout(hideStatus, 3000);
    });
  }

  // Send button click handler
  if (sendButton) {
    sendButton.addEventListener('click', function() {
      const recipient = sendRecipient?.value?.trim()?.replace('@', '') || '';
      const amount = sendAmount?.value || '1';
      const token = sendToken?.value || 'NYLA';
      
      if (!recipient) {
        showStatus('Please enter a recipient username', 'error');
        setTimeout(hideStatus, 3000);
        return;
      }
      
      // Get selected blockchain
      let blockchain = 'Solana';
      sendBlockchainRadios.forEach(radio => {
        if (radio && radio.checked) blockchain = radio.value;
      });
      
      // Generate command
      let command;
      if (blockchain === 'Solana') {
        command = `Hey @AgentNyla transfer ${amount} $${token} @${recipient}`;
      } else {
        command = `Hey @AgentNyla transfer ${amount} $${token} @${recipient} ${blockchain}`;
      }
      
      
      const mobileURL = generateXMobileURL(command);
      
      window.open(mobileURL, '_blank');
      showStatus('Opening X.com with transfer command...', 'success');
      setTimeout(hideStatus, 3000);
    });
  }

  // Adaptive sharing functionality
  shareButton.addEventListener('click', async function() {
    const username = receiveUsernameInput.value.trim().replace('@', '') || 'username';
    const amount = receiveAmountInput.value || '1';
    const token = receiveTokenSelect.value || 'NYLA';
    
    let blockchain = 'Solana';
    receiveBlockchainRadios.forEach(radio => {
      if (radio.checked) blockchain = radio.value;
    });
    
    // Generate the actual transfer command
    let command;
    if (blockchain === 'Solana') {
      command = `Hey @AgentNyla transfer ${amount} $${token} @${username}`;
    } else {
      command = `Hey @AgentNyla transfer ${amount} $${token} @${username} ${blockchain}`;
    }
    
    // Generate mobile URL for the command
    const mobileURL = generateXMobileURL(command);
    
    // Adaptive sharing based on device type
    const isDesktop = document.body.classList.contains('desktop-mode');
    
    if (isDesktop) {
      // Desktop: Show direct link dialog and copy to clipboard
      showDesktopShareDialog(command, mobileURL, amount, token, username);
    } else {
      // Mobile: Use native sharing or fallback
      const shareText = `💰 Send me ${amount} $${token} via X`;
      
      if (navigator.share) {
        try {
          await navigator.share({
            title: 'NYLA Payment Request',
            text: shareText,
            url: mobileURL
          });
          showStatus('Shared successfully!', 'success');
          setTimeout(hideStatus, 3000);
        } catch (error) {
          if (error.name !== 'AbortError') {
            // Fallback with full text including URL
            fallbackShare(`${shareText}\n\n${mobileURL}`);
          }
        }
      } else {
        // Fallback with full text including URL
        fallbackShare(`${shareText}\n\n${mobileURL}`);
      }
    }
  });

  // Desktop-specific share dialog
  function showDesktopShareDialog(command, mobileURL, amount, token, username) {
    // Create modal overlay
    const overlay = document.createElement('div');
    overlay.className = 'desktop-share-overlay';
    overlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.8);
      backdrop-filter: blur(4px);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 10000;
      animation: fadeIn 0.2s ease-out;
    `;
    
    // Create dialog
    const dialog = document.createElement('div');
    dialog.className = 'desktop-share-dialog';
    dialog.style.cssText = `
      background: #1a1a1a;
      border: 1px solid #333333;
      border-radius: 16px;
      padding: 2rem;
      max-width: 600px;
      width: 90%;
      box-shadow: 0 20px 40px rgba(0,0,0,0.6);
      animation: slideInUp 0.3s ease-out;
    `;
    
    dialog.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem;">
        <h3 style="color: #FF6B35; font-size: 20px; margin: 0;">💰 Payment Request Created</h3>
        <button class="close-dialog" style="background: none; border: none; color: #888; font-size: 24px; cursor: pointer; padding: 0; width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; border-radius: 50%; transition: all 0.2s ease;">×</button>
      </div>
      
      <div style="margin-bottom: 1.5rem;">
        <p style="color: #cccccc; margin: 0 0 1rem 0;">Request ${amount} ${token} from @${username}</p>
        <div style="background: #2a2a2a; border: 1px solid #444; border-radius: 8px; padding: 1rem; margin-bottom: 1rem;">
          <div style="color: #888; font-size: 12px; margin-bottom: 0.5rem;">X.com Command:</div>
          <div style="color: #ffffff; font-family: monospace; font-size: 14px; word-break: break-all;">${command}</div>
        </div>
        <div style="background: #2a2a2a; border: 1px solid #444; border-radius: 8px; padding: 1rem;">
          <div style="color: #888; font-size: 12px; margin-bottom: 0.5rem;">Shareable Link:</div>
          <div style="color: #FF6B35; font-size: 14px; word-break: break-all; cursor: pointer;" class="copy-link">${mobileURL}</div>
        </div>
      </div>
      
      <div style="display: flex; gap: 1rem; flex-wrap: wrap;">
        <button class="copy-command" style="flex: 1; min-width: 140px; background: #FF6B35; color: #000; border: none; padding: 12px 16px; border-radius: 8px; font-weight: 600; cursor: pointer; transition: all 0.2s ease;">
          📋 Copy Command
        </button>
        <button class="copy-link" style="flex: 1; min-width: 140px; background: #333; color: #fff; border: 1px solid #555; padding: 12px 16px; border-radius: 8px; font-weight: 600; cursor: pointer; transition: all 0.2s ease;">
          🔗 Copy Link
        </button>
        <button class="open-twitter" style="flex: 1; min-width: 140px; background: #1DA1F2; color: #fff; border: none; padding: 12px 16px; border-radius: 8px; font-weight: 600; cursor: pointer; transition: all 0.2s ease;">
          🐦 Open X.com
        </button>
      </div>
    `;
    
    // Add styles
    const style = document.createElement('style');
    style.textContent = `
      @keyframes fadeIn {
        from { opacity: 0; }
        to { opacity: 1; }
      }
      
      @keyframes slideInUp {
        from { 
          opacity: 0;
          transform: translateY(20px) scale(0.95);
        }
        to { 
          opacity: 1;
          transform: translateY(0) scale(1);
        }
      }
      
      .desktop-share-dialog button:hover {
        transform: translateY(-1px);
        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
      }
      
      .close-dialog:hover {
        background: #333 !important;
        color: #fff !important;
      }
      
      .copy-link:hover {
        background: #444 !important;
        border-color: #FF6B35 !important;
      }
      
      .copy-command:hover {
        background: #FF5722 !important;
      }
      
      .open-twitter:hover {
        background: #1991DA !important;
      }
    `;
    document.head.appendChild(style);
    
    overlay.appendChild(dialog);
    document.body.appendChild(overlay);
    
    // Event handlers
    const copyCommand = async () => {
      try {
        await navigator.clipboard.writeText(command);
        showStatus('Command copied to clipboard!', 'success');
        setTimeout(hideStatus, 2000);
      } catch (error) {
        showStatus('Failed to copy command', 'error');
      }
    };
    
    const copyLink = async () => {
      try {
        await navigator.clipboard.writeText(mobileURL);
        showStatus('Link copied to clipboard!', 'success');
        setTimeout(hideStatus, 2000);
      } catch (error) {
        showStatus('Failed to copy link', 'error');
      }
    };
    
    const openTwitter = () => {
      window.open(mobileURL, '_blank');
      closeDialog();
    };
    
    const closeDialog = () => {
      overlay.style.animation = 'fadeOut 0.2s ease-out forwards';
      setTimeout(() => {
        document.body.removeChild(overlay);
        document.head.removeChild(style);
      }, 200);
    };
    
    // Add event listeners
    dialog.querySelector('.close-dialog').addEventListener('click', closeDialog);
    dialog.querySelector('.copy-command').addEventListener('click', copyCommand);
    dialog.querySelector('.copy-link').addEventListener('click', copyLink);
    dialog.querySelector('.open-twitter').addEventListener('click', openTwitter);
    
    // Click link to copy
    dialog.querySelector('.copy-link[style*="color: #FF6B35"]').addEventListener('click', copyLink);
    
    // Close on overlay click
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) closeDialog();
    });
    
    // Close on Escape key
    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        closeDialog();
        document.removeEventListener('keydown', handleEscape);
      }
    };
    document.addEventListener('keydown', handleEscape);
    
    // Add fadeOut animation
    style.textContent += `
      @keyframes fadeOut {
        from { opacity: 1; }
        to { opacity: 0; }
      }
    `;
  }

  function fallbackShare(text) {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text).then(() => {
        showStatus('Payment request copied to clipboard!', 'success');
      }).catch(() => {
        showStatus('Unable to copy to clipboard', 'error');
      });
    } else {
      showStatus('Sharing not supported on this device', 'error');
    }
  }

  // Status messages
  function showStatus(message, type) {
    statusDiv.textContent = message;
    statusDiv.className = `status ${type}`;
    statusDiv.style.display = 'block';
  }

  function hideStatus() {
    statusDiv.style.display = 'none';
  }

  // PWA Install prompt
  let deferredPrompt;
  
  window.addEventListener('beforeinstallprompt', (e) => {
    console.log('NYLA GO PWA: Install prompt available');
    e.preventDefault();
    deferredPrompt = e;
    showInstallPrompt();
  });

  function showInstallPrompt() {
    const installPrompt = document.createElement('div');
    installPrompt.className = 'install-prompt';
    installPrompt.innerHTML = `
      📱 Install NYLA GO for quick access to payment requests!
      <button onclick="installApp()">Install</button>
      <button onclick="this.parentElement.remove()" style="background: transparent; color: #000;">Later</button>
    `;
    document.body.appendChild(installPrompt);
    
    // Auto-hide after 10 seconds
    setTimeout(() => {
      if (installPrompt.parentElement) {
        installPrompt.remove();
      }
    }, 10000);
  }

  // Global install function
  window.installApp = async function() {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      console.log('NYLA GO PWA: Install outcome:', outcome);
      deferredPrompt = null;
      document.querySelector('.install-prompt')?.remove();
    }
  };

  // App installed handler
  window.addEventListener('appinstalled', (evt) => {
    console.log('NYLA GO PWA: App was installed');
    showStatus('NYLA GO installed successfully!', 'success');
    setTimeout(hideStatus, 3000);
  });

  // Online/offline handling
  window.addEventListener('online', () => {
    showStatus('Back online! QR codes will generate normally.', 'success');
    setTimeout(hideStatus, 3000);
  });

  window.addEventListener('offline', () => {
    showStatus('Offline mode - QR generation may be limited.', 'error');
    setTimeout(hideStatus, 5000);
  });

  // Splash Screen Management
  function initializeSplashScreen() {
    let splashCompleted = false;
    let minDisplayTime = 4500; // Minimum 4.5 seconds display
    let startTime = Date.now();
    
    // Detect iOS and user preferences
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || 
                  (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    
    console.log('NYLA GO PWA: Platform detection - iOS:', isIOS, 'Reduced motion:', prefersReducedMotion);
    
    if (prefersReducedMotion) {
      // Skip video, show fallback immediately
      showSplashFallback();
      setTimeout(completeSplash, 2000); // Shorter duration for accessibility
      return;
    }
    
    // iOS-specific adjustments
    if (isIOS) {
      minDisplayTime = 5000; // Slightly longer for iOS loading
      console.log('NYLA GO PWA: iOS detected, adjusting splash timing');
    }
    
    // Try to play video
    splashVideo.addEventListener('canplay', function() {
      console.log('NYLA GO PWA: Splash video ready to play');
      
      // Hide fallback and show video smoothly
      splashFallback.classList.add('hide');
      
      setTimeout(function() {
        splashVideo.classList.add('loaded');
        splashVideo.play().catch(function(error) {
          console.log('NYLA GO PWA: Video autoplay failed:', error.name, error.message);
          if (isIOS) {
            console.log('NYLA GO PWA: iOS autoplay restriction detected');
          }
          showSplashFallback();
        });
      }, isIOS ? 500 : 300); // Longer delay for iOS
    });
    
    // Video ended handler
    splashVideo.addEventListener('ended', function() {
      console.log('NYLA GO PWA: Splash video ended');
      checkSplashCompletion();
    });
    
    // Video error handler
    splashVideo.addEventListener('error', function() {
      console.log('NYLA GO PWA: Video error, showing fallback');
      showSplashFallback();
    });
    
    // Fallback timer (iOS needs more time)
    const fallbackTimeout = isIOS ? 3000 : 2000;
    setTimeout(function() {
      if (!splashCompleted && splashVideo.paused) {
        console.log(`NYLA GO PWA: Video loading timeout after ${fallbackTimeout}ms, showing fallback`);
        if (isIOS) {
          console.log('NYLA GO PWA: iOS video loading took too long');
        }
        showSplashFallback();
      }
    }, fallbackTimeout);
    
    // Ensure minimum display time
    setTimeout(function() {
      checkSplashCompletion();
    }, minDisplayTime);
    
    function showSplashFallback() {
      splashVideo.style.opacity = '0';
      splashFallback.classList.remove('hide');
    }
    
    function checkSplashCompletion() {
      const elapsedTime = Date.now() - startTime;
      if (elapsedTime >= minDisplayTime && !splashCompleted) {
        completeSplash();
      }
    }
    
    function completeSplash() {
      if (splashCompleted) return;
      splashCompleted = true;
      
      console.log('NYLA GO PWA: Splash screen complete, showing app');
      
      // Fade out splash screen
      splashScreen.classList.add('fade-out');
      
      // Show app container
      appContainer.style.opacity = '1';
      appContainer.style.transition = 'opacity 0.5s ease-in';
      
      // Remove splash screen after fade
      setTimeout(function() {
        splashScreen.style.display = 'none';
        initializeApp();
      }, 500);
    }
    
    // Skip splash on click/tap (after 1 second minimum)
    splashScreen.addEventListener('click', function() {
      const elapsedTime = Date.now() - startTime;
      if (elapsedTime >= 1000) {
        completeSplash();
      }
    });
  }

  // Device Detection and Layout Management
  function initializeDeviceDetection() {
    const DeviceDetector = {
      isDesktop() {
        // Priority check: if it's clearly mobile, always return false
        if (this.isLikelyMobile()) {
          return false;
        }
        
        // Enhanced desktop detection with user agent check
        const hasDesktopDimensions = window.innerWidth >= 1024 && window.innerHeight >= 768;
        const hasDesktopUserAgent = this.isDesktopUserAgent();
        const hasLimitedTouchSupport = !this.hasTouchSupport() || this.isDesktopWithTouch();
        
        // True desktop: good dimensions + desktop UA + limited/no touch
        return hasDesktopDimensions && hasDesktopUserAgent && hasLimitedTouchSupport;
      },
      
      isDesktopUserAgent() {
        const userAgent = navigator.userAgent.toLowerCase();
        
        // Definitely mobile/tablet patterns
        if (/android|iphone|ipad|ipod|blackberry|iemobile|opera mini|mobile/i.test(userAgent)) {
          return false;
        }
        
        // Desktop OS patterns
        const desktopPatterns = [
          /windows nt/,           // Windows
          /macintosh|mac os x/,   // macOS
          /linux/,                // Linux
          /x11/,                  // Unix/Linux
          /cros/                  // Chrome OS
        ];
        
        return desktopPatterns.some(pattern => pattern.test(userAgent));
      },
      
      isDesktopWithTouch() {
        // Surface, touchscreen laptops, etc. - still desktop but with touch
        const userAgent = navigator.userAgent.toLowerCase();
        return /windows nt.*touch/i.test(userAgent) || 
               /macintosh.*touch/i.test(userAgent) ||
               (this.isDesktopUserAgent() && navigator.maxTouchPoints <= 10); // Limit touch points for desktop
      },
      
      hasTouchSupport() {
        return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
      },
      
      isLikelyMobile() {
        return /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
      },
      
      updateLayout() {
        const body = document.body;
        const isDesktop = this.isDesktop(); // Enhanced detection already includes touch logic
        
        // Debug logging for enhanced detection
        console.log('NYLA GO PWA: Enhanced Device Detection:');
        console.log('  - Screen dimensions:', `${window.innerWidth}x${window.innerHeight}`);
        console.log('  - User Agent:', navigator.userAgent);
        console.log('  - Desktop dimensions:', window.innerWidth >= 1024 && window.innerHeight >= 768);
        console.log('  - Desktop user agent:', this.isDesktopUserAgent());
        console.log('  - Touch support:', this.hasTouchSupport());
        console.log('  - Desktop with touch:', this.isDesktopWithTouch());
        console.log('  - Final desktop decision:', isDesktop);
        console.log('  - Mobile pattern match:', this.isLikelyMobile());
        
        // Remove existing classes
        body.classList.remove('desktop-mode', 'mobile-mode');
        
        // Add appropriate class
        if (isDesktop) {
          body.classList.add('desktop-mode');
          console.log('NYLA GO PWA: Desktop mode activated');
          this.enableDesktopFeatures();
        } else {
          body.classList.add('mobile-mode');
          console.log('NYLA GO PWA: Mobile mode activated');
          this.enableMobileFeatures();
        }
        
        // Update tab behavior
        this.updateTabBehavior(isDesktop);
      },
      
      updateTabBehavior(isDesktop) {
        const tabContents = document.querySelectorAll('.tab-content');
        
        // Both desktop and mobile now use traditional tab switching
        // Desktop gets sidebar navigation, mobile gets horizontal tabs
        console.log(`NYLA GO PWA: ${isDesktop ? 'Desktop' : 'Mobile'} mode - using traditional tab switching`);
        const activeTab = document.querySelector('.tab-content.active');
        tabContents.forEach(content => {
          content.style.display = content === activeTab ? 'block' : 'none';
        });
      },
      
      enableDesktopFeatures() {
        // Add keyboard navigation
        this.addKeyboardNavigation();
        
        // Show NYLA tab button on desktop devices
        const nylaTabButton = document.querySelector('[data-tab="nyla"]');
        if (nylaTabButton) {
          nylaTabButton.style.display = 'block';
          console.log('NYLA GO PWA: NYLA tab button shown on desktop');
        }
        
        // Enhanced hover states are handled by CSS
        console.log('NYLA GO PWA: Desktop features enabled');
      },
      
      enableMobileFeatures() {
        // Initialize mobile gestures only for mobile devices
        if (!this.isDesktop()) {
          initializeMobileGestures();
        }
        
        // Hide NYLA tab button on mobile devices
        const nylaTabButton = document.querySelector('[data-tab="nyla"]');
        if (nylaTabButton) {
          nylaTabButton.style.display = 'none';
          console.log('NYLA GO PWA: NYLA tab button hidden on mobile');
        }
        
        console.log('NYLA GO PWA: Mobile features enabled');
      },
      
      addKeyboardNavigation() {
        document.addEventListener('keydown', (e) => {
          // Tab navigation with Ctrl+1, Ctrl+2, Ctrl+3
          if (e.ctrlKey || e.metaKey) {
            switch(e.key) {
              case '1':
                e.preventDefault();
                document.querySelector('[data-tab="receive"]')?.click();
                break;
              case '2':
                e.preventDefault();
                document.querySelector('[data-tab="raid"]')?.click();
                break;
              case '3':
                e.preventDefault();
                document.querySelector('[data-tab="app"]')?.click();
                break;
            }
          }
          
          // Escape to clear focus
          if (e.key === 'Escape') {
            document.activeElement?.blur();
          }
        });
      },
      
      handleResize() {
        // Debounce resize events
        clearTimeout(this.resizeTimeout);
        this.resizeTimeout = setTimeout(() => {
          this.updateLayout();
        }, 250);
      },
      
      init() {
        this.updateLayout();
        window.addEventListener('resize', this.handleResize.bind(this));
        
        // Listen for orientation changes on mobile
        window.addEventListener('orientationchange', () => {
          setTimeout(() => this.updateLayout(), 100);
        });
      }
    };
    
    DeviceDetector.init();
  }

  // Mobile Gesture System
  function initializeMobileGestures() {
    const MobileGestureManager = {
      // Configuration
      config: {
        swipeThreshold: 50,           // Minimum distance for swipe (reduced for easier swiping)
        velocityThreshold: 0.3,       // Minimum velocity for swipe
        fastSwipeThreshold: 1.5,      // Velocity for fast swipe
        maxVerticalDeviation: 40,     // Max vertical movement during horizontal swipe (stricter)
        minHorizontalRatio: 2.5,      // Minimum horizontal:vertical ratio for swipe detection (stricter)
        gestureDetectionThreshold: 10, // Minimum movement to start tracking gestures
        pinchThreshold: 1.1,          // Minimum scale change for pinch
        hapticSupport: 'vibrate' in navigator
      },
      
      // State
      state: {
        isGesturing: false,
        startX: 0,
        startY: 0,
        currentX: 0,
        currentY: 0,
        startTime: 0,
        currentTab: 1,
        tabs: ['swap', 'receive', 'send'],
        gestureDebounce: false,
      },
      
      // Elements
      elements: {
        mainContent: null,
        tabContents: null,
        tabButtons: null,
        swipeLeftIndicator: null,
        swipeRightIndicator: null,
        fastSwipeIndicator: null,
        velocityIndicator: null,
        qrContent: null
      },
      
      init() {
        this.cacheElements();
        this.bindEvents();
        this.setupInitialState();
        this.bindGlobalCleanup();
        console.log('NYLA GO PWA: Mobile gestures initialized');
      },
      
      cacheElements() {
        this.elements.mainContent = document.querySelector('.main-content');
        this.elements.tabContents = document.querySelectorAll('.tab-content');
        this.elements.tabButtons = document.querySelectorAll('.tab-button');
        this.elements.swipeLeftIndicator = document.getElementById('swipeLeftIndicator');
        this.elements.swipeRightIndicator = document.getElementById('swipeRightIndicator');
        this.elements.fastSwipeIndicator = document.getElementById('fastSwipeIndicator');
        this.elements.velocityIndicator = document.getElementById('velocityIndicator');
        this.elements.qrContent = document.getElementById('receiveQrCode');
      },
      
      setupInitialState() {
        // Find currently active tab among visible tabs only
        const visibleTabButtons = Array.from(this.elements.tabButtons).filter(button => {
          return window.getComputedStyle(button).display !== 'none';
        });
        
        visibleTabButtons.forEach((button, index) => {
          if (button.classList.contains('active')) {
            this.state.currentTab = index;
          }
        });
        
        // Show swipe hints briefly on first load
        setTimeout(() => {
          this.showSwipeHints();
        }, 2000);
      },
      
      bindEvents() {
        // Touch events for swipe navigation
        if (this.elements.mainContent) {
          this.elements.mainContent.addEventListener('touchstart', this.handleTouchStart.bind(this), { passive: false });
          this.elements.mainContent.addEventListener('touchmove', this.handleTouchMove.bind(this), { passive: false });
          this.elements.mainContent.addEventListener('touchend', this.handleTouchEnd.bind(this), { passive: false });
        }
        
      },
      
      bindGlobalCleanup() {
        // Add a global touch listener to force cleanup any lingering effects
        document.addEventListener('touchstart', (e) => {
          if (!this.state.isGesturing) {
            this.forceCleanup();
          }
        }, { passive: true });
        
        // Also cleanup on scroll events
        document.addEventListener('scroll', () => {
          if (!this.state.isGesturing) {
            this.forceCleanup();
          }
        }, { passive: true });
      },
      
      forceCleanup() {
        // Force remove any lingering visual effects
        this.elements.tabContents.forEach(content => {
          content.classList.remove('swiping', 'swipe-preview', 'elastic-left', 'elastic-right');
          if (content.style.transform) {
            content.style.transform = '';
          }
        });
        document.body.classList.remove('gesture-active');
        this.hideVelocityIndicator();
      },
      
      handleTouchStart(e) {
        if (document.body.classList.contains('desktop-mode') || this.state.gestureDebounce) return;
        
        const touch = e.touches[0];
        this.state.startX = touch.clientX;
        this.state.startY = touch.clientY;
        this.state.currentX = touch.clientX;
        this.state.currentY = touch.clientY;
        this.state.startTime = Date.now();
        this.state.isGesturing = false; // Don't start gesturing immediately
      },
      
      handleTouchMove(e) {
        if (document.body.classList.contains('desktop-mode')) return;
        
        const touch = e.touches[0];
        this.state.currentX = touch.clientX;
        this.state.currentY = touch.clientY;
        
        const deltaX = this.state.currentX - this.state.startX;
        const deltaY = Math.abs(this.state.currentY - this.state.startY);
        const absDeltaX = Math.abs(deltaX);
        
        // Only start gesture tracking if there's enough movement
        if (!this.state.isGesturing && (absDeltaX > this.config.gestureDetectionThreshold || deltaY > this.config.gestureDetectionThreshold)) {
          // Determine if this should be a horizontal gesture
          const isHorizontalIntent = absDeltaX > deltaY && 
            absDeltaX > this.config.gestureDetectionThreshold &&
            (deltaY === 0 || absDeltaX / deltaY >= this.config.minHorizontalRatio);
          
          if (isHorizontalIntent) {
            this.state.isGesturing = true;
            document.body.classList.add('gesture-active');
          } else {
            // This is clearly a vertical scroll, don't track it
            return;
          }
        }
        
        // Continue only if we're tracking a horizontal gesture
        if (!this.state.isGesturing) return;
        
        // Check if still a valid horizontal gesture
        const isValidHorizontalGesture = absDeltaX > 15 && 
          deltaY < this.config.maxVerticalDeviation && 
          (deltaY === 0 || absDeltaX / deltaY >= this.config.minHorizontalRatio);
        
        if (isValidHorizontalGesture) {
          e.preventDefault(); // Prevent scrolling
          
          // Mark tab content as swiping (only when horizontal gesture detected)
          this.elements.tabContents.forEach(content => {
            content.classList.add('swiping');
          });
          
          // Show velocity indicator
          const velocity = this.calculateVelocity();
          this.showVelocityIndicator(velocity);
          
          // Visual feedback during swipe
          this.updateSwipeVisuals(deltaX);
        }
      },
      
      handleTouchEnd(e) {
        if (document.body.classList.contains('desktop-mode')) return;
        
        // If we weren't tracking a gesture, nothing to clean up
        if (!this.state.isGesturing) return;
        
        const deltaX = this.state.currentX - this.state.startX;
        const deltaY = Math.abs(this.state.currentY - this.state.startY);
        const velocity = this.calculateVelocity();
        
        // Clean up - always remove all gesture-related classes
        this.state.isGesturing = false;
        document.body.classList.remove('gesture-active');
        this.elements.tabContents.forEach(content => {
          content.classList.remove('swiping', 'swipe-preview', 'elastic-left', 'elastic-right');
        });
        this.hideVelocityIndicator();
        
        // Reset any lingering transforms and ensure clean state
        this.elements.tabContents.forEach(content => {
          if (content.style.transform) {
            content.style.transform = '';
          }
          // Force remove any lingering classes
          content.classList.remove('swiping', 'swipe-preview', 'elastic-left', 'elastic-right');
        });
        
        // Ensure body is clean
        document.body.classList.remove('gesture-active');
        
        // Determine if swipe should trigger tab change with improved detection
        const absDeltaX = Math.abs(deltaX);
        const isValidSwipe = absDeltaX > this.config.swipeThreshold && 
            deltaY < this.config.maxVerticalDeviation &&
            velocity > this.config.velocityThreshold &&
            (deltaY === 0 || absDeltaX / deltaY >= this.config.minHorizontalRatio);
            
        if (isValidSwipe) {
          
          const direction = deltaX > 0 ? -1 : 1; // Right swipe = previous tab, Left swipe = next tab
          
          // Check for fast swipe
          if (velocity > this.config.fastSwipeThreshold) {
            this.handleFastSwipe(direction);
          } else {
            this.handleNormalSwipe(direction);
          }
        } else {
          // Only show elastic boundary if there was a clear horizontal gesture attempt
          const wasHorizontalAttempt = absDeltaX > 35 && 
            deltaY < this.config.maxVerticalDeviation &&
            absDeltaX / Math.max(deltaY, 1) >= this.config.minHorizontalRatio;
            
          if (wasHorizontalAttempt) {
            this.showElasticBoundary(deltaX);
          }
        }
        
        // Add brief debounce to prevent rapid gesture conflicts
        this.state.gestureDebounce = true;
        setTimeout(() => {
          this.state.gestureDebounce = false;
        }, 50);
      },
      
      calculateVelocity() {
        const deltaTime = Date.now() - this.state.startTime;
        const deltaX = Math.abs(this.state.currentX - this.state.startX);
        return deltaTime > 0 ? deltaX / deltaTime : 0;
      },
      
      handleNormalSwipe(direction) {
        const newTabIndex = this.state.currentTab + direction;
        
        if (newTabIndex >= 0 && newTabIndex < this.state.tabs.length) {
          this.switchToTab(newTabIndex);
          this.triggerHapticFeedback('light');
        } else {
          this.showElasticBoundary(direction > 0 ? 100 : -100);
          this.triggerHapticFeedback('error');
        }
      },
      
      handleFastSwipe(direction) {
        // Fast swipe jumps to first/last tab
        const newTabIndex = direction > 0 ? this.state.tabs.length - 1 : 0;
        
        if (newTabIndex !== this.state.currentTab) {
          this.showFastSwipeIndicator();
          this.switchToTab(newTabIndex);
          this.triggerHapticFeedback('medium');
        } else {
          this.showElasticBoundary(direction > 0 ? 100 : -100);
          this.triggerHapticFeedback('error');
        }
      },
      
      switchToTab(tabIndex) {
        this.state.currentTab = tabIndex;
        
        // Get visible tab buttons only (exclude hidden NYLA tab on mobile)
        const visibleTabButtons = Array.from(this.elements.tabButtons).filter(button => {
          return window.getComputedStyle(button).display !== 'none';
        });
        
        const targetButton = visibleTabButtons[tabIndex];
        if (targetButton) {
          targetButton.click();
        }
      },
      
      updateSwipeVisuals(deltaX) {
        const activeContent = document.querySelector('.tab-content.active');
        if (activeContent && Math.abs(deltaX) > 25) {
          activeContent.classList.add('swipe-preview');
        }
      },
      
      showElasticBoundary(deltaX) {
        const activeContent = document.querySelector('.tab-content.active');
        if (activeContent) {
          activeContent.classList.add(deltaX > 0 ? 'elastic-left' : 'elastic-right');
          setTimeout(() => {
            activeContent.classList.remove('elastic-left', 'elastic-right');
          }, 200);
        }
      },
      
      showSwipeHints() {
        if (this.elements.swipeLeftIndicator && this.elements.swipeRightIndicator) {
          this.elements.swipeLeftIndicator.classList.add('show');
          this.elements.swipeRightIndicator.classList.add('show');
          
          setTimeout(() => {
            this.elements.swipeLeftIndicator.classList.remove('show');
            this.elements.swipeRightIndicator.classList.remove('show');
          }, 3000);
        }
      },
      
      showFastSwipeIndicator() {
        if (this.elements.fastSwipeIndicator) {
          this.elements.fastSwipeIndicator.classList.add('show');
          setTimeout(() => {
            this.elements.fastSwipeIndicator.classList.remove('show');
          }, 1000);
        }
      },
      
      showVelocityIndicator(velocity) {
        if (this.elements.velocityIndicator) {
          this.elements.velocityIndicator.textContent = `Velocity: ${velocity.toFixed(2)}`;
          this.elements.velocityIndicator.classList.add('show');
        }
      },
      
      hideVelocityIndicator() {
        if (this.elements.velocityIndicator) {
          this.elements.velocityIndicator.classList.remove('show');
        }
      },
      
      
      // Haptic Feedback
      triggerHapticFeedback(type = 'light') {
        if (!this.config.hapticSupport) return;
        
        const patterns = {
          light: 10,
          medium: 20,
          heavy: 40,
          error: [10, 50, 10],
          success: [10, 30, 10, 30, 10]
        };
        
        const pattern = patterns[type] || patterns.light;
        
        try {
          if (Array.isArray(pattern)) {
            navigator.vibrate(pattern);
          } else {
            navigator.vibrate(pattern);
          }
        } catch (error) {
          console.log('Haptic feedback not supported:', error);
        }
      }
    };
    
    // Initialize if on mobile
    if (document.body.classList.contains('mobile-mode')) {
      MobileGestureManager.init();
    }
  }

  // Floating Action Button functionality
  const floatingActionButton = document.getElementById('floatingActionButton');
  const floatingMenu = document.getElementById('floatingMenu');
  
  if (floatingActionButton && floatingMenu) {
    let isMenuOpen = false;
    
    floatingActionButton.addEventListener('click', function() {
      isMenuOpen = !isMenuOpen;
      
      if (isMenuOpen) {
        floatingActionButton.classList.add('active');
        floatingMenu.style.display = 'block';
      } else {
        floatingActionButton.classList.remove('active');
        floatingMenu.style.display = 'none';
      }
    });
    
    // Floating Menu Item handlers
    const floatingMenuItems = document.querySelectorAll('.floating-menu-item');
    floatingMenuItems.forEach(item => {
      item.addEventListener('click', function() {
        const action = this.dataset.action;
        
        if (action === 'raid') {
          // Show raid tab
          if (raidTab) {
            // Hide all tabs
            if (swapTab) swapTab.style.display = 'none';
            if (receiveTab) receiveTab.style.display = 'none';
            if (sendTab) sendTab.style.display = 'none';
            if (appTab) appTab.style.display = 'none';
            
            // Show raid tab
            raidTab.style.display = 'block';
            raidTab.classList.add('active');
            
            // Update tab buttons
            tabButtons.forEach(btn => btn.classList.remove('active'));
            
            console.log('NYLA GO PWA: Showing Community Raids');
          }
        } else if (action === 'app') {
          // Show app tab
          if (appTab) {
            // Hide all tabs
            if (swapTab) swapTab.style.display = 'none';
            if (receiveTab) receiveTab.style.display = 'none';
            if (sendTab) sendTab.style.display = 'none';
            if (raidTab) raidTab.style.display = 'none';
            
            // Show app tab
            appTab.style.display = 'block';
            appTab.classList.add('active');
            
            // Update tab buttons
            tabButtons.forEach(btn => btn.classList.remove('active'));
            
            console.log('NYLA GO PWA: Showing Community Apps');
          }
        }
        
        // Close floating menu
        isMenuOpen = false;
        floatingActionButton.classList.remove('active');
        floatingMenu.style.display = 'none';
      });
    });
    
    // Close menu when clicking outside
    document.addEventListener('click', function(e) {
      if (isMenuOpen && !floatingActionButton.contains(e.target) && !floatingMenu.contains(e.target)) {
        isMenuOpen = false;
        floatingActionButton.classList.remove('active');
        floatingMenu.style.display = 'none';
      }
    });
  }

  console.log('NYLA GO PWA: Application initialized successfully');

  // Font loading function
  function loadRobotoFont() {
    console.log('PWA: Loading Roboto font for NYLA conversation...');
    
    // Use Font Loading API if available
    if ('fonts' in document) {
      const robotoRegular = new FontFace('Roboto', 'url(https://fonts.gstatic.com/s/roboto/v30/KFOmCnqEu92Fr1Mu4mxK.woff2)', {
        weight: '400',
        style: 'normal',
        display: 'swap'
      });
      
      const robotoMedium = new FontFace('Roboto', 'url(https://fonts.gstatic.com/s/roboto/v30/KFOlCnqEu92Fr1MmEU9fBBc4.woff2)', {
        weight: '500',
        style: 'normal',
        display: 'swap'
      });
      
      Promise.all([
        robotoRegular.load(),
        robotoMedium.load()
      ]).then(function(fonts) {
        fonts.forEach(function(font) {
          document.fonts.add(font);
        });
        console.log('PWA: ✅ Roboto fonts loaded successfully');
        
        // Force font update on NYLA elements
        updateNYLAFontDisplay();
      }).catch(function(error) {
        console.warn('PWA: ⚠️ Roboto font loading failed, using fallback:', error);
      });
    } else {
      console.log('PWA: Font Loading API not available, relying on CSS');
    }
  }

  // Force font update on NYLA elements
  function updateNYLAFontDisplay() {
    // Add a slight delay to ensure DOM is ready
    setTimeout(() => {
      const nylaElements = document.querySelectorAll('.nyla-chat-container, .nyla-chat-container *');
      nylaElements.forEach(element => {
        element.style.fontFamily = "'Roboto', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";
      });
      console.log('PWA: ✅ Roboto font applied to', nylaElements.length, 'NYLA elements');
    }, 100);
  }
});