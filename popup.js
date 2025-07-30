document.addEventListener('DOMContentLoaded', function() {
  const recipientInput = document.getElementById('recipient');
  const amountInput = document.getElementById('amount');
  const tokenSelect = document.getElementById('token');
  const commandPreview = document.getElementById('commandPreview');
  const sendButton = document.getElementById('sendButton');
  const statusDiv = document.getElementById('status');
  
  // Blockchain radio buttons
  const blockchainRadios = document.querySelectorAll('input[name="blockchain"]');
  
  const recipientError = document.getElementById('recipientError');
  const amountError = document.getElementById('amountError');
  
  // Token management elements
  const manageTokensBtn = document.getElementById('manageTokensBtn');
  const modalOverlay = document.getElementById('modalOverlay');
  const closeModalBtn = document.getElementById('closeModalBtn');
  const newTokenInput = document.getElementById('newTokenInput');
  const addTokenBtn = document.getElementById('addTokenBtn');
  const customTokensList = document.getElementById('customTokensList');
  const noCustomTokens = document.getElementById('noCustomTokens');
  const tokenError = document.getElementById('tokenError');
  
  // Developer credit element
  const developerCredit = document.getElementById('developerCredit');
  
  // QR Code elements
  const qrToggleBtn = document.getElementById('qrToggleBtn');
  const qrCodeContainer = document.getElementById('qrCodeContainer');
  const qrCodeDiv = document.getElementById('qrCode');
  let qrCodeInstance = null;
  let isQRMode = false;

  // Tab elements
  const actionTabs = document.querySelectorAll('.action-tab');
  const sendSection = document.getElementById('sendSection');
  const receiveSection = document.getElementById('receiveSection');
  const raidSection = document.getElementById('raidSection');
  const raidListItems = document.querySelectorAll('.raid-list-item');
  const appVersionElement = document.getElementById('appVersion');
  const developerCredit = document.getElementById('developerCredit');

  // Receive elements
  const receiveUsernameInput = document.getElementById('receiveUsername');
  const receiveAmountInput = document.getElementById('receiveAmount');
  const receiveTokenSelect = document.getElementById('receiveToken');
  const receiveQrCode = document.getElementById('receiveQrCode');
  const receiveBlockchainRadios = document.querySelectorAll('input[name="receiveBlockchain"]');
  
  // Debug QR elements
  console.log('NYLA QR: Elements found:', {
    qrToggleBtn: !!qrToggleBtn,
    qrCodeContainer: !!qrCodeContainer,
    qrCodeDiv: !!qrCodeDiv
  });
  
  // Default tokens in order
  const defaultTokens = ['NYLA', 'SOL', 'ETH', 'ALGO', 'USDC', 'USDT'];
  let customTokens = [];
  
  // Load saved values and custom tokens from storage
  loadSavedValues();
  
  // Generate initial receive QR code with default values
  setTimeout(() => {
    if (receiveQrCode) {
      generateReceiveQRCode();
    }
  }, 500);
  
  // Token Management Functions
  function updateTokenDropdown() {
    const currentValue = tokenSelect.value;
    const allTokens = [...defaultTokens, ...customTokens];
    
    // Clear existing options
    tokenSelect.innerHTML = '';
    
    // Add all tokens to dropdown
    allTokens.forEach(token => {
      const option = document.createElement('option');
      option.value = token;
      option.textContent = token;
      tokenSelect.appendChild(option);
    });
    
    // Restore previous selection if it still exists
    if (allTokens.includes(currentValue)) {
      tokenSelect.value = currentValue;
    } else if (allTokens.length > 0) {
      tokenSelect.value = allTokens[0]; // Default to first token (NYLA)
    }
    
    validateAndUpdateCommand();
  }
  
  function loadCustomTokens() {
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      chrome.storage.local.get(['customTokens']).then(result => {
        if (result.customTokens && Array.isArray(result.customTokens)) {
          customTokens = result.customTokens;
          updateTokenDropdown();
          updateCustomTokensList();
        }
      }).catch(err => {
        console.log('Failed to load custom tokens:', err);
        // Try localStorage fallback
        try {
          const saved = localStorage.getItem('customTokens');
          if (saved) {
            customTokens = JSON.parse(saved);
            updateTokenDropdown();
            updateCustomTokensList();
          }
        } catch (e) {
          console.log('LocalStorage fallback failed:', e);
        }
      });
    } else {
      // Fallback to localStorage
      try {
        const saved = localStorage.getItem('customTokens');
        if (saved) {
          customTokens = JSON.parse(saved);
          updateTokenDropdown();
          updateCustomTokensList();
        }
      } catch (e) {
        console.log('LocalStorage fallback failed:', e);
      }
    }
  }
  
  function saveCustomTokens() {
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      chrome.storage.local.set({ customTokens: customTokens }).catch(err => {
        console.log('Failed to save custom tokens:', err);
        // Fallback to localStorage
        try {
          localStorage.setItem('customTokens', JSON.stringify(customTokens));
        } catch (e) {
          console.log('LocalStorage fallback failed:', e);
        }
      });
    } else {
      // Fallback to localStorage
      try {
        localStorage.setItem('customTokens', JSON.stringify(customTokens));
      } catch (e) {
        console.log('LocalStorage fallback failed:', e);
      }
    }
  }
  
  function updateCustomTokensList() {
    console.log('NYLA: Updating custom tokens list. Current tokens:', customTokens);
    
    // Always clear existing items first
    const existingItems = customTokensList.querySelectorAll('.custom-token-item');
    console.log('NYLA: Removing', existingItems.length, 'existing items');
    existingItems.forEach(item => item.remove());
    
    // Check if we have custom tokens
    if (customTokens.length === 0) {
      console.log('NYLA: No custom tokens, showing empty message');
      noCustomTokens.style.display = 'block';
      return;
    }
    
    // Hide "no tokens" message
    console.log('NYLA: Hiding empty message, showing', customTokens.length, 'tokens');
    noCustomTokens.style.display = 'none';
    
    // Add custom token items
    customTokens.forEach(token => {
      const tokenItem = document.createElement('div');
      tokenItem.className = 'custom-token-item';
      
      tokenItem.innerHTML = `
        <span class="token-symbol">${token}</span>
        <button type="button" class="remove-token-btn" data-token="${token}">Remove</button>
      `;
      
      customTokensList.appendChild(tokenItem);
    });
    
    // Add event listeners to remove buttons
    const removeButtons = customTokensList.querySelectorAll('.remove-token-btn');
    removeButtons.forEach(btn => {
      btn.addEventListener('click', function() {
        const tokenToRemove = this.getAttribute('data-token');
        removeCustomToken(tokenToRemove);
      });
    });
  }
  
  function addCustomToken(tokenSymbol) {
    // Validate token symbol
    const cleanToken = tokenSymbol.trim().toUpperCase();
    
    // Clear previous errors
    tokenError.textContent = '';
    
    if (!cleanToken) {
      tokenError.textContent = 'Please enter a token symbol';
      return false;
    }
    
    if (cleanToken.length > 10) {
      tokenError.textContent = 'Token symbol must be 10 characters or less';
      return false;
    }
    
    if (!/^[A-Z0-9]+$/.test(cleanToken)) {
      tokenError.textContent = 'Token symbol can only contain letters and numbers';
      return false;
    }
    
    // Check if token already exists (in default or custom tokens)
    if (defaultTokens.includes(cleanToken) || customTokens.includes(cleanToken)) {
      tokenError.textContent = 'Token already exists';
      return false;
    }
    
    // Add token
    customTokens.push(cleanToken);
    saveCustomTokens();
    updateTokenDropdown();
    updateCustomTokensList();
    
    // Clear input
    newTokenInput.value = '';
    
    return true;
  }
  
  function removeCustomToken(tokenSymbol) {
    const index = customTokens.indexOf(tokenSymbol);
    if (index > -1) {
      // Remove from array
      customTokens.splice(index, 1);
      console.log('NYLA: Removed token:', tokenSymbol, 'Remaining:', customTokens);
      
      // Save to storage
      saveCustomTokens();
      
      // Update UI immediately
      updateTokenDropdown();
      updateCustomTokensList();
      
      // If the removed token was selected in the dropdown, switch to default
      if (tokenSelect.value === tokenSymbol) {
        tokenSelect.value = defaultTokens[0]; // Switch to NYLA
        validateAndUpdateCommand(); // Update command preview
      }
    }
  }
  
  // Modal Management
  function openModal() {
    modalOverlay.style.display = 'flex';
    newTokenInput.focus();
  }
  
  function closeModal() {
    modalOverlay.style.display = 'none';
    tokenError.textContent = '';
    newTokenInput.value = '';
  }
  
  // Event Listeners for Token Management
  manageTokensBtn.addEventListener('click', openModal);
  closeModalBtn.addEventListener('click', closeModal);
  
  modalOverlay.addEventListener('click', function(e) {
    if (e.target === modalOverlay) {
      closeModal();
    }
  });
  
  addTokenBtn.addEventListener('click', function() {
    addCustomToken(newTokenInput.value);
  });
  
  newTokenInput.addEventListener('keydown', function(e) {
    if (e.key === 'Enter') {
      addCustomToken(newTokenInput.value);
    }
  });
  
  newTokenInput.addEventListener('input', function() {
    // Clear error when user starts typing
    tokenError.textContent = '';
    // Auto-uppercase
    this.value = this.value.toUpperCase();
  });
  
  // Initialize custom tokens
  loadCustomTokens();
  
  // Initialize app version
  updateAppVersion();
  
  // Developer credit click handler
  if (developerCredit) {
    developerCredit.addEventListener('click', function() {
      // Check if Send tab is not currently active and switch to it
      const sendTab = document.querySelector('.action-tab[data-tab="send"]');
      if (sendTab && !sendTab.classList.contains('active')) {
        sendTab.click();
        console.log('NYLA: Switched to Send tab via developer credit');
      }
      
      // Auto-fill recipient with developer's X username
      recipientInput.value = '@h2crypto_eth';
      
      // Update command preview and validation
      validateAndUpdateCommand();
      
      // Save the new values
      saveValues();
      
      // Show a subtle feedback animation
      this.style.transform = 'scale(0.95)';
      setTimeout(() => {
        this.style.transform = 'scale(1)';
      }, 150);
      
      // Optional: Show a brief thank you message
      showStatus('Thanks for considering a donation! 💜', 'success');
      setTimeout(() => {
        hideStatus();
      }, 2000);
    });
  }
  
  // Get extension version from manifest
  function updateAppVersion() {
    if (appVersionElement) {
      // Get version from Chrome extension manifest
      const manifestData = chrome.runtime.getManifest();
      if (manifestData && manifestData.version) {
        appVersionElement.textContent = `NYLA Go v${manifestData.version}`;
        console.log('NYLA: Version updated to', manifestData.version);
      }
    }
  }
  
  
  // Form validation and command generation
  function validateAndUpdateCommand() {
    const recipient = recipientInput.value.trim();
    const amount = amountInput.value.trim();
    const token = tokenSelect.value;
    
    // Get selected blockchain
    const selectedBlockchain = document.querySelector('input[name="blockchain"]:checked').value;
    
    let isValid = true;
    
    // Clear previous errors
    recipientError.textContent = '';
    amountError.textContent = '';
    
    // Validate recipient
    if (!recipient) {
      isValid = false;
    } else if (!recipient.startsWith('@')) {
      recipientError.textContent = 'Username must start with @';
      isValid = false;
    } else if (recipient.length < 2) {
      recipientError.textContent = 'Please enter a valid username';
      isValid = false;
    }
    
    // Validate amount
    if (!amount) {
      isValid = false;
    } else if (isNaN(amount) || parseFloat(amount) <= 0) {
      amountError.textContent = 'Please enter a valid amount';
      isValid = false;
    }
    
    // Update command preview
    if (isValid && recipient && amount) {
      let command;
      if (selectedBlockchain === 'Solana') {
        // Solana: Hey @AgentNyla transfer [AMOUNT] $[TOKEN] @[USERNAME]
        command = `Hey @AgentNyla transfer ${amount} $${token} ${recipient}`;
      } else {
        // Non-Solana: Hey @AgentNyla transfer [AMOUNT] $[TOKEN] @[USERNAME] [BlockChain]
        command = `Hey @AgentNyla transfer ${amount} $${token} ${recipient} ${selectedBlockchain}`;
      }
      commandPreview.textContent = command;
      commandPreview.classList.remove('empty');
      sendButton.disabled = false;
    } else {
      commandPreview.textContent = 'Fill in the fields above to see the command';
      commandPreview.classList.add('empty');
      sendButton.disabled = true;
    }
    
    // Update QR toggle button state
    if (qrToggleBtn) {
      qrToggleBtn.disabled = !isValid || !recipient || !amount;
    }
    
    // Update QR code if in QR mode
    if (isQRMode && isValid && recipient && amount) {
      updateQRCode(command);
    }
  }
  
  // QR Code Functions
  function generateXMobileURL(command) {
    // URL encode the command text
    const encodedCommand = encodeURIComponent(command);
    // Generate X.com compose URL with pre-filled text
    return `https://twitter.com/intent/tweet?text=${encodedCommand}`;
  }
  
  function updateQRCode(command) {
    if (!command) {
      console.log('NYLA QR: No command provided');
      return;
    }
    
    console.log('NYLA QR: Updating QR code with command:', command);
    
    // Clear existing QR code
    if (qrCodeDiv) {
      qrCodeDiv.innerHTML = '';
    }
    
    // Generate the mobile URL
    const mobileURL = generateXMobileURL(command);
    console.log('NYLA QR: Generated URL:', mobileURL);
    console.log('NYLA QR: URL length:', mobileURL.length);
    
    try {
      // Use SimpleQR class for proper QR generation
      if (typeof SimpleQR !== 'undefined') {
        console.log('NYLA QR: Using SimpleQR generator');
        
        // Show loading state with QR placeholder and NYLA logo
        qrCodeDiv.innerHTML = `
          <div style="text-align: center;">
            <div style="width: 180px; height: 180px; margin: 0 auto; background: #f7f9fa; border: 1px dashed #e1e8ed; border-radius: 4px; display: flex; flex-direction: column; align-items: center; justify-content: center; position: relative;">
              <!-- QR-like pattern placeholder -->
              <div style="position: absolute; top: 8px; left: 8px; width: 20px; height: 20px; background: #e1e8ed; opacity: 0.3; border-radius: 2px;"></div>
              <div style="position: absolute; top: 8px; right: 8px; width: 20px; height: 20px; background: #e1e8ed; opacity: 0.3; border-radius: 2px;"></div>
              <div style="position: absolute; bottom: 8px; left: 8px; width: 20px; height: 20px; background: #e1e8ed; opacity: 0.3; border-radius: 2px;"></div>
              
              <!-- Center NYLA logo placeholder -->
              <div style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); width: 36px; height: 36px; background: white; border-radius: 8px; padding: 4px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); display: flex; align-items: center; justify-content: center;">
                <div style="background: linear-gradient(135deg, #FF8C42, #FF6B35); color: white; width: 28px; height: 28px; border-radius: 4px; display: flex; align-items: center; justify-content: center; font-family: Arial, sans-serif; font-weight: 900; font-size: 10px;">NYLA</div>
              </div>
              
              <!-- Loading text below -->
              <div style="position: absolute; bottom: 15px; left: 50%; transform: translateX(-50%); text-align: center; color: #657786;">
                <div style="font-size: 12px; margin-bottom: 2px;">⏳ Generating...</div>
                <div style="font-size: 9px; color: #8899a6;">QR Code</div>
              </div>
            </div>
            <div style="margin-top: 10px; padding: 8px; background: #f7f9fa; border-radius: 4px; font-size: 10px; color: #8899a6; text-align: center; opacity: 0.7;">
              <strong>📱 Scan or Click QR Code</strong><br>
              <span style="color: #aab8c2;">Manual Link →</span>
            </div>
          </div>
        `;
        
        // Generate QR code (async)
        setTimeout(() => {
          try {
            // Clear loading state
            qrCodeDiv.innerHTML = '';
            
            // Create QR element
            const qrElement = SimpleQR.create(mobileURL, 180);
            
            // Add container styling (no blue border)
            qrElement.style.margin = '0 auto';
            qrElement.style.cursor = 'pointer';
            qrElement.title = 'Click to open X.com compose';
            qrElement.style.borderRadius = '4px';
            
            // Add click handler to open URL
            qrElement.addEventListener('click', () => {
              window.open(mobileURL, '_blank');
            });
            
            // Add to container
            qrCodeDiv.appendChild(qrElement);
            
            // Add URL display below QR code
            const urlDisplay = document.createElement('div');
            urlDisplay.style.cssText = `
              margin-top: 10px; 
              padding: 8px; 
              background: #f7f9fa; 
              border-radius: 4px; 
              font-size: 10px; 
              color: #657786; 
              word-break: break-all;
              text-align: center;
            `;
            urlDisplay.innerHTML = `
              <strong>📱 Scan or Click QR Code</strong><br>
              <a href="${mobileURL}" target="_blank" style="color: #1da1f2; text-decoration: none;">Manual Link →</a>
            `;
            qrCodeDiv.appendChild(urlDisplay);
            
            console.log('NYLA QR: SimpleQR code generated successfully');
          } catch (innerError) {
            console.error('NYLA QR: QR generation failed during async creation:', innerError);
            qrCodeDiv.innerHTML = `
              <div style="text-align: center; padding: 20px; color: #e0245e;">
                <div style="font-size: 18px; margin-bottom: 10px;">⚠️</div>
                <div style="font-size: 12px;">QR generation failed</div>
                <a href="${mobileURL}" target="_blank" style="color: #1da1f2; font-size: 11px; display: inline-block; margin-top: 8px; text-decoration: underline;">Open manually →</a>
              </div>
            `;
          }
        }, 200); // Small delay to show loading state
        
      } else {
        throw new Error('SimpleQR not available');
      }
      
    } catch (error) {
      console.error('NYLA QR: Local generation failed:', error);
      
      // Fallback: Show URL directly
      qrCodeDiv.innerHTML = `
        <div style="color: #657786; padding: 20px; text-align: center; border: 1px dashed #e1e8ed; border-radius: 4px;">
          <p style="margin: 10px 0; font-weight: 600;">⚠️ QR Generation Failed</p>
          <p style="font-size: 12px; margin: 10px 0;">Click the link below to open on mobile:</p>
          <a href="${mobileURL}" target="_blank" style="color: #1da1f2; word-break: break-all; font-size: 11px; text-decoration: underline; display: inline-block; padding: 8px; background: #f0f8ff; border-radius: 4px; margin: 5px 0;">${mobileURL}</a>
          <p style="font-size: 10px; margin: 10px 0; color: #8899a6;">Copy this link to your phone to compose the tweet</p>
        </div>
      `;
    }
  }
  
  function toggleQRMode() {
    console.log('NYLA QR: Toggle clicked, current mode:', isQRMode ? 'QR' : 'Text');
    isQRMode = !isQRMode;
    console.log('NYLA QR: Switching to mode:', isQRMode ? 'QR' : 'Text');
    
    if (isQRMode) {
      // Switch to QR mode
      console.log('NYLA QR: Switching to QR mode');
      if (commandPreview) commandPreview.style.display = 'none';
      if (qrCodeContainer) qrCodeContainer.style.display = 'block';
      if (qrToggleBtn) {
        qrToggleBtn.classList.add('active');
        const qrText = qrToggleBtn.querySelector('.qr-text');
        const qrIcon = qrToggleBtn.querySelector('.qr-icon');
        if (qrText) qrText.textContent = 'Switch to Text';
        if (qrIcon) qrIcon.textContent = '💬';
      }
      
      // Generate QR code with current command
      const command = commandPreview ? commandPreview.textContent : '';
      console.log('NYLA QR: Command from preview:', command);
      console.log('NYLA QR: Command preview is empty:', commandPreview ? commandPreview.classList.contains('empty') : true);
      
      if (command && commandPreview && !commandPreview.classList.contains('empty')) {
        console.log('NYLA QR: Generating QR code with command:', command);
        // Add a small delay to ensure UI is ready
        setTimeout(() => {
          updateQRCode(command);
        }, 100);
      } else {
        console.log('NYLA QR: No valid command to generate QR code');
        if (qrCodeDiv) {
          qrCodeDiv.innerHTML = '<div style="color: #657786; padding: 20px; text-align: center;">Fill in the form to generate QR code</div>';
        }
      }
    } else {
      // Switch to text mode
      console.log('NYLA QR: Switching to text mode');
      if (commandPreview) commandPreview.style.display = 'block';
      if (qrCodeContainer) qrCodeContainer.style.display = 'none';
      if (qrToggleBtn) {
        qrToggleBtn.classList.remove('active');
        const qrText = qrToggleBtn.querySelector('.qr-text');
        const qrIcon = qrToggleBtn.querySelector('.qr-icon');
        if (qrText) qrText.textContent = 'Switch to QR Code';
        if (qrIcon) qrIcon.textContent = '📱';
      }
    }
  }
  
  // QR Toggle Button Event Listener
  if (qrToggleBtn) {
    qrToggleBtn.addEventListener('click', toggleQRMode);
  }
  
  
  // Add auto @ symbol to recipient and save values
  recipientInput.addEventListener('input', function() {
    let value = this.value;
    if (value && !value.startsWith('@')) {
      this.value = '@' + value;
    }
    validateAndUpdateCommand();
    saveValues();
  });
  
  // Add event listeners for validation and saving
  amountInput.addEventListener('input', function() {
    validateAndUpdateCommand();
    saveValues();
  });
  
  tokenSelect.addEventListener('change', function() {
    validateAndUpdateCommand();
    saveValues();
  });
  
  // Add event listeners for blockchain radio buttons
  blockchainRadios.forEach(radio => {
    radio.addEventListener('change', function() {
      validateAndUpdateCommand();
      saveValues();
    });
  });
  
  // Tab switching functionality
  actionTabs.forEach(tab => {
    tab.addEventListener('click', function() {
      const tabName = this.dataset.tab;
      
      // Remove active class from all tabs and content
      actionTabs.forEach(t => t.classList.remove('active'));
      sendSection.classList.remove('active');
      receiveSection.classList.remove('active');
      raidSection.classList.remove('active');
      
      // Add active class to clicked tab
      this.classList.add('active');
      
      // Hide all sections first
      sendSection.style.display = 'none';
      receiveSection.style.display = 'none';
      raidSection.style.display = 'none';
      
      // Show corresponding content
      if (tabName === 'send') {
        sendSection.classList.add('active');
        sendSection.style.display = 'block';
      } else if (tabName === 'receive') {
        receiveSection.classList.add('active');
        receiveSection.style.display = 'block';
        // Generate initial QR code when receive tab is opened
        generateReceiveQRCode();
      } else if (tabName === 'raid') {
        raidSection.classList.add('active');
        raidSection.style.display = 'block';
      }
    });
  });

  // Raid list item click handlers
  raidListItems.forEach(item => {
    item.addEventListener('click', function() {
      const listUrl = this.dataset.url;
      const listName = this.querySelector('.list-name').textContent;
      
      // Open the X.com list in a new tab
      chrome.tabs.create({ 
        url: listUrl,
        active: true  // Focus the new tab
      });
      
      // Show feedback
      showStatus(`Opened ${listName} in new tab`, 'success');
      
      // Hide status after 2 seconds
      setTimeout(() => {
        hideStatus();
      }, 2000);
    });
  });

  // Generate X.com mobile URL for QR codes
  function generateXMobileURL(command) {
    const encodedCommand = encodeURIComponent(command);
    return `https://x.com/compose/post?text=${encodedCommand}`;
  }

  // Receive QR Code generation  
  function generateReceiveQRCode() {
    if (!receiveUsernameInput || !receiveAmountInput || !receiveTokenSelect || !receiveQrCode) {
      console.log('NYLA: Receive elements not found, skipping QR generation');
      return;
    }
    
    const username = receiveUsernameInput.value.trim().replace('@', '') || 'h2crypto_eth';
    const amount = receiveAmountInput.value || '1';
    const token = receiveTokenSelect.value || 'NYLA';
    
    // Get selected blockchain
    let blockchain = 'Solana'; // default
    receiveBlockchainRadios.forEach(radio => {
      if (radio.checked) {
        blockchain = radio.value;
      }
    });
    
    // Generate command for QR code (same format as send)
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
      width: 180px;
      height: 180px;
      background: #f0f0f0;
      border-radius: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
      color: #666;
      font-size: 14px;
    `;
    loadingDiv.textContent = 'Generating...';
    receiveQrCode.appendChild(loadingDiv);
    
    // Generate QR code after small delay
    setTimeout(() => {
      receiveQrCode.innerHTML = '';
      const qrElement = SimpleQR.create(mobileURL, 180);
      receiveQrCode.appendChild(qrElement);
    }, 100);
  }

  // Receive form event listeners
  receiveUsernameInput.addEventListener('input', generateReceiveQRCode);
  receiveAmountInput.addEventListener('input', generateReceiveQRCode);
  receiveTokenSelect.addEventListener('change', generateReceiveQRCode);
  
  receiveBlockchainRadios.forEach(radio => {
    radio.addEventListener('change', generateReceiveQRCode);
  });

  // Refresh QR button
  refreshQrButton.addEventListener('click', function() {
    generateReceiveQRCode();
    showStatus('QR Code refreshed!', 'success');
    setTimeout(() => {
      hideStatus();
    }, 2000);
  });

  // Handle send button click
  sendButton.addEventListener('click', async function() {
    const command = commandPreview.textContent;
    
    try {
      // Check if we're on X.com
      const [tab] = await chrome.tabs.query({active: true, currentWindow: true});
      
      if (!tab.url.includes('x.com') && !tab.url.includes('twitter.com')) {
        showStatus('Please navigate to X.com first', 'error');
        return;
      }
      
      // Send command to content script
      await chrome.tabs.sendMessage(tab.id, {
        action: 'insertCommand',
        command: command
      });
      
      showStatus('Command sent to X.com!', 'success');
      
      // Clear form and storage after successful send
      setTimeout(() => {
        clearForm();
        hideStatus();
      }, 2000);
      
    } catch (error) {
      console.error('Error sending command:', error);
      showStatus('Error: Make sure you are on X.com and refresh the page', 'error');
    }
  });
  
  function showStatus(message, type) {
    statusDiv.textContent = message;
    statusDiv.className = `status ${type}`;
    statusDiv.style.display = 'block';
  }
  
  function hideStatus() {
    statusDiv.style.display = 'none';
  }
  
  // Save form values to storage
  function saveValues() {
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      const values = {
        // Don't save recipient - let it reset each time for safety
        amount: amountInput.value,
        token: tokenSelect.value,
        blockchain: document.querySelector('input[name="blockchain"]:checked').value
      };
      chrome.storage.local.set({ nylaFormValues: values }).catch(err => {
        console.log('Storage save failed:', err);
        // Fallback to localStorage
        try {
          localStorage.setItem('nylaFormValues', JSON.stringify(values));
        } catch (e) {
          console.log('localStorage fallback failed:', e);
        }
      });
    } else {
      // Fallback to localStorage
      try {
        const values = {
          // Don't save recipient - let it reset each time for safety
          amount: amountInput.value,
          token: tokenSelect.value,
          blockchain: document.querySelector('input[name="blockchain"]:checked').value
        };
        localStorage.setItem('nylaFormValues', JSON.stringify(values));
      } catch (e) {
        console.log('localStorage fallback failed:', e);
      }
    }
  }
  
  // Load saved values from storage and detect reply recipient
  function loadSavedValues() {
    // First try to get reply recipient from X.com page
    chrome.tabs.query({active: true, currentWindow: true}, async function(tabs) {
      let detectedRecipient = '';
      
      if (tabs[0] && (tabs[0].url.includes('x.com') || tabs[0].url.includes('twitter.com'))) {
        try {
          const response = await chrome.tabs.sendMessage(tabs[0].id, {
            action: 'getReplyRecipient'
          });
          
          if (response && response.recipient) {
            detectedRecipient = response.recipient;
            console.log('Detected reply recipient:', detectedRecipient);
          }
        } catch (error) {
          console.log('Could not detect reply recipient:', error);
        }
      }
      
      // Then load saved values
      if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
        chrome.storage.local.get(['nylaFormValues']).then(result => {
          if (result.nylaFormValues) {
            const values = result.nylaFormValues;
            // Only use detected recipient - clear any saved recipient for fresh start
            recipientInput.value = detectedRecipient || '';
            amountInput.value = values.amount || '1';
            // Only set token if it exists in the current dropdown options
            const allTokens = [...defaultTokens, ...customTokens];
            if (allTokens.includes(values.token)) {
              tokenSelect.value = values.token;
            } else {
              tokenSelect.value = defaultTokens[0]; // Default to NYLA
            }
            // Set blockchain selection (default to Solana if not saved)
            const savedBlockchain = values.blockchain || 'Solana';
            const blockchainRadio = document.querySelector(`input[name="blockchain"][value="${savedBlockchain}"]`);
            if (blockchainRadio) {
              blockchainRadio.checked = true;
            }
          } else if (detectedRecipient) {
            // If no saved values but we detected a recipient, use it
            recipientInput.value = detectedRecipient;
            amountInput.value = '1';
          } else {
            // Clear recipient field for fresh start
            recipientInput.value = '';
            amountInput.value = '1';
          }
          validateAndUpdateCommand();
        }).catch(err => {
          console.log('Storage load failed:', err);
          // Fallback to localStorage
          loadFromLocalStorage(detectedRecipient);
        });
      } else {
        // Fallback to localStorage
        loadFromLocalStorage(detectedRecipient);
      }
    });
  }
  
  // Fallback localStorage loading
  function loadFromLocalStorage(detectedRecipient = '') {
    try {
      const saved = localStorage.getItem('nylaFormValues');
      if (saved) {
        const values = JSON.parse(saved);
        // Only use detected recipient - clear any saved recipient for fresh start
        recipientInput.value = detectedRecipient || '';
        amountInput.value = values.amount || '1';
        // Only set token if it exists in the current dropdown options
        const allTokens = [...defaultTokens, ...customTokens];
        if (allTokens.includes(values.token)) {
          tokenSelect.value = values.token;
        } else {
          tokenSelect.value = defaultTokens[0]; // Default to NYLA
        }
        // Set blockchain selection (default to Solana if not saved)
        const savedBlockchain = values.blockchain || 'Solana';
        const blockchainRadio = document.querySelector(`input[name="blockchain"][value="${savedBlockchain}"]`);
        if (blockchainRadio) {
          blockchainRadio.checked = true;
        }
      } else if (detectedRecipient) {
        // If no saved values but we detected a recipient, use it
        recipientInput.value = detectedRecipient;
        amountInput.value = '1';
      } else {
        // Clear recipient field for fresh start
        recipientInput.value = '';
        amountInput.value = '1';
      }
      validateAndUpdateCommand();
    } catch (e) {
      console.log('localStorage load failed:', e);
    }
  }
  
  // Clear form and storage
  function clearForm() {
    recipientInput.value = '';
    amountInput.value = '1';
    tokenSelect.selectedIndex = 0;
    
    // Clear from Chrome storage
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      chrome.storage.local.remove(['nylaFormValues']).catch(err => {
        console.log('Storage clear failed:', err);
      });
    }
    
    // Clear from localStorage fallback
    try {
      localStorage.removeItem('nylaFormValues');
    } catch (e) {
      console.log('localStorage clear failed:', e);
    }
    
    validateAndUpdateCommand();
  }
  
  // Initialize
  validateAndUpdateCommand();
});