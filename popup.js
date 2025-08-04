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
  const receiveManageTokensBtn = document.getElementById('receiveManageTokensBtn');
  const swapManageTokensBtn = document.getElementById('swapManageTokensBtn');
  const swapManageTokensBtn2 = document.getElementById('swapManageTokensBtn2');
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
  const swapSection = document.getElementById('swapSection');
  const sendSection = document.getElementById('sendSection');
  const receiveSection = document.getElementById('receiveSection');
  const raidSection = document.getElementById('raidSection');
  const appSection = document.getElementById('appSection');
  const raidListItems = document.querySelectorAll('.raid-list-item');
  const appVersionElement = document.getElementById('appVersion');
  
  // Community menu elements
  const communityMenuButton = document.getElementById('communityMenuButton');
  const communityDropdown = document.getElementById('communityDropdown');
  
  // Swap form elements
  const swapAmountInput = document.getElementById('swapAmount');
  const swapFromTokenSelect = document.getElementById('swapFromToken');
  const swapToTokenSelect = document.getElementById('swapToToken');
  const swapCommandPreview = document.getElementById('swapCommandPreview');
  const swapButton = document.getElementById('swapButton');
  
  // Swap blockchain radio buttons
  const swapBlockchainRadios = document.querySelectorAll('input[name="swapBlockchain"]');

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
  
  // Load saved receive values and generate initial QR code
  loadReceiveValues();
  setTimeout(() => {
    if (receiveQrCode) {
      generateReceiveQRCode();
    }
  }, 500);
  
  // Generate raid section from shared data
  generateRaidSection();
  
  // Generate community menu from shared data
  generateCommunityMenu();
  
  // Generate app section from shared data
  generateAppSection();
  
  // Generate footer from shared data
  generateFooter();
  
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
  
  // Function to generate community menu dynamically
  function generateCommunityMenu() {
    if (!communityDropdown || !window.NYLA_COMMUNITY_DATA) return;
    
    // Clear existing content
    communityDropdown.innerHTML = '';
    
    // Generate menu items
    window.NYLA_COMMUNITY_DATA.menuItems.forEach(item => {
      const menuItem = document.createElement('div');
      menuItem.className = 'community-menu-item';
      menuItem.setAttribute('data-action', item.action);
      
      menuItem.innerHTML = `
        <span class="community-menu-icon">${item.icon}</span>
        <div class="community-menu-text">
          <div class="community-menu-title">${item.name}</div>
        </div>
      `;
      
      communityDropdown.appendChild(menuItem);
    });
    
    // Add click handlers to menu items
    addCommunityMenuHandlers();
  }
  
  // Function to generate app section dynamically
  function generateAppSection() {
    const appShowcase = document.getElementById('appShowcase');
    if (!appShowcase) return;
    
    // App section is static in HTML for Extension, no dynamic generation needed
    // Click handlers for app items are added in the app section event listeners
  }
  
  // Function to generate footer from shared data
  function generateFooter() {
    const footerLinks = document.getElementById('footerLinks');
    if (!footerLinks || !window.NYLA_FOOTER_DATA) {
      console.log('NYLA Extension: Footer generation failed - missing elements or data');
      return;
    }
    console.log('NYLA Extension: Generating footer with shared data');
    
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
    console.log('NYLA Extension: Adding footer event listeners');
    // Donate link click handler
    const donateLink = document.getElementById('donateLink');
    if (donateLink) {
      console.log('NYLA Extension: Donate link found, adding event listener');
      donateLink.addEventListener('click', function() {
        // Check if Send tab is not currently active and switch to it
        const sendTab = document.querySelector('.action-tab[data-tab="send"]');
        if (sendTab && !sendTab.classList.contains('active')) {
          sendTab.click();
          console.log('NYLA Extension: Switched to Send tab via donate link');
        }
        
        // Auto-fill recipient with developer's X username
        if (recipientInput) {
          recipientInput.value = '@h2crypto_eth';
        }
        
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
  }
  
  // Function to add click handlers to raid items
  function addRaidClickHandlers() {
    const raidListItems = document.querySelectorAll('.raid-list-item');
    raidListItems.forEach(item => {
      item.addEventListener('click', function() {
        const listUrl = this.dataset.url;
        if (listUrl) {
          console.log('NYLA: Opening raid list:', listUrl);
          chrome.tabs.create({ url: listUrl });
          showStatus('Opening X.com list...', 'success');
          setTimeout(hideStatus, 2000);
        }
      });
    });
  }
  
  // Function to add click handlers to community menu items
  function addCommunityMenuHandlers() {
    const dropdownItems = document.querySelectorAll('.community-menu-item');
    dropdownItems.forEach(item => {
      item.addEventListener('click', function() {
        const action = this.getAttribute('data-action');
        
        if (action === 'showRaid') {
          // Extension: Show raid page with multiple options (like PWA)
          showRaidSection();
        } else if (action === 'showApp') {
          // Switch to app section (part of current tab)
          showAppSection();
        }
        
        // Close dropdown
        closeCommunityDropdown();
      });
    });
  }
  
  // Function to show raid section
  function showRaidSection() {
    // Hide all tab sections
    if (swapSection) swapSection.style.display = 'none';
    if (sendSection) sendSection.style.display = 'none';
    if (receiveSection) receiveSection.style.display = 'none';
    if (appSection) appSection.style.display = 'none';
    
    // Show raid section
    if (raidSection) {
      raidSection.style.display = 'block';
    }
    
    // Update tab states - make sure no tab appears active when showing raid section
    actionTabs.forEach(tab => {
      tab.classList.remove('active');
    });
  }
  
  // Function to show app section
  function showAppSection() {
    // Hide all tab sections
    if (swapSection) swapSection.style.display = 'none';
    if (sendSection) sendSection.style.display = 'none';
    if (receiveSection) receiveSection.style.display = 'none';
    if (raidSection) raidSection.style.display = 'none';
    
    // Show app section
    if (appSection) {
      appSection.style.display = 'block';
    }
    
    // Update tab states - make sure no tab appears active when showing app section
    actionTabs.forEach(tab => {
      tab.classList.remove('active');
    });
  }
  
  // Token Management Functions
  function updateTokenDropdown() {
    if (!tokenSelect) return;
    
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
    if (!customTokensList || !noCustomTokens) return;
    
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
    if (tokenError) {
      tokenError.textContent = '';
    }
    
    if (!cleanToken) {
      if (tokenError) tokenError.textContent = 'Please enter a token symbol';
      return false;
    }
    
    if (cleanToken.length > 10) {
      if (tokenError) tokenError.textContent = 'Token symbol must be 10 characters or less';
      return false;
    }
    
    if (!/^[A-Z0-9]+$/.test(cleanToken)) {
      if (tokenError) tokenError.textContent = 'Token symbol can only contain letters and numbers';
      return false;
    }
    
    // Check if token already exists (in default or custom tokens)
    if (defaultTokens.includes(cleanToken) || customTokens.includes(cleanToken)) {
      if (tokenError) tokenError.textContent = 'Token already exists';
      return false;
    }
    
    // Add token
    customTokens.push(cleanToken);
    saveCustomTokens();
    updateTokenDropdown();
    updateCustomTokensList();
    
    // Clear input
    if (newTokenInput) {
      newTokenInput.value = '';
    }
    
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
      if (tokenSelect && tokenSelect.value === tokenSymbol) {
        tokenSelect.value = defaultTokens[0]; // Switch to NYLA
        validateAndUpdateCommand(); // Update command preview
      }
    }
  }
  
  // Modal Management
  function openModal() {
    if (modalOverlay) {
      modalOverlay.style.display = 'flex';
    }
    // Clear any previous errors when opening modal
    if (tokenError) {
      tokenError.textContent = '';
    }
    if (newTokenInput) {
      newTokenInput.focus();
    }
  }
  
  function closeModal() {
    if (modalOverlay) {
      modalOverlay.style.display = 'none';
    }
    if (tokenError) {
      tokenError.textContent = '';
    }
    if (newTokenInput) {
      newTokenInput.value = '';
    }
  }
  
  // Event Listeners for Token Management
  if (manageTokensBtn) {
    manageTokensBtn.addEventListener('click', openModal);
  }
  if (receiveManageTokensBtn) {
    receiveManageTokensBtn.addEventListener('click', openModal);
  }
  if (swapManageTokensBtn) {
    swapManageTokensBtn.addEventListener('click', openModal);
  }
  if (swapManageTokensBtn2) {
    swapManageTokensBtn2.addEventListener('click', openModal);
  }
  if (closeModalBtn) {
    closeModalBtn.addEventListener('click', closeModal);
  }
  
  if (modalOverlay) {
    modalOverlay.addEventListener('click', function(e) {
      if (e.target === modalOverlay) {
        closeModal();
      }
    });
  }
  
  if (addTokenBtn) {
    addTokenBtn.addEventListener('click', function() {
      addCustomToken(newTokenInput ? newTokenInput.value : '');
    });
  }
  
  if (newTokenInput) {
    newTokenInput.addEventListener('keydown', function(e) {
      if (e.key === 'Enter') {
        addCustomToken(this.value);
      }
    });
    
    newTokenInput.addEventListener('input', function() {
      // Clear error when user starts typing
      if (tokenError) {
        tokenError.textContent = '';
      }
      // Auto-uppercase
      this.value = this.value.toUpperCase();
    });
  }
  
  // Initialize custom tokens
  loadCustomTokens();
  
  // Initialize app version
  updateAppVersion();
  
  
  // Get extension version from manifest
  function updateAppVersion() {
    if (appVersionElement) {
      try {
        // Get version from Chrome extension manifest
        const manifestData = chrome.runtime.getManifest();
        if (manifestData && manifestData.version) {
          appVersionElement.textContent = `NYLA Go v${manifestData.version}`;
          console.log('NYLA: Version updated to', manifestData.version);
        } else {
          // Fallback to hardcoded version if manifest unavailable
          appVersionElement.textContent = 'NYLA Go v2.0.3';
          console.log('NYLA: Using fallback version 0.7.5');
        }
      } catch (error) {
        // Fallback to hardcoded version if error occurs
        appVersionElement.textContent = 'NYLA Go v2.0.3';
        console.log('NYLA: Error getting manifest version, using fallback:', error);
      }
    }
  }
  
  
  // Form validation and command generation
  function validateAndUpdateCommand() {
    if (!recipientInput || !amountInput || !tokenSelect) {
      console.log('NYLA Extension: Form elements not found for validation');
      return;
    }
    
    const recipient = recipientInput.value.trim();
    const amount = amountInput.value.trim();
    const token = tokenSelect.value;
    
    console.log('NYLA Extension: Validating command with:', { recipient, amount, token });
    
    // Get selected blockchain
    const blockchainRadio = document.querySelector('input[name="blockchain"]:checked');
    if (!blockchainRadio) return;
    const selectedBlockchain = blockchainRadio.value;
    
    let isValid = true;
    
    // Clear previous errors
    if (recipientError) {
      recipientError.textContent = '';
    }
    if (amountError) {
      amountError.textContent = '';
    }
    
    // Validate recipient
    if (!recipient) {
      isValid = false;
    } else if (!recipient.startsWith('@')) {
      if (recipientError) recipientError.textContent = 'Username must start with @';
      isValid = false;
    } else if (recipient.length < 2) {
      if (recipientError) recipientError.textContent = 'Please enter a valid username';
      isValid = false;
    }
    
    // Validate amount
    if (!amount) {
      isValid = false;
    } else if (isNaN(amount) || parseFloat(amount) <= 0) {
      if (amountError) amountError.textContent = 'Please enter a valid amount';
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
      if (commandPreview) {
        commandPreview.textContent = command;
        commandPreview.classList.remove('empty');
      }
      if (sendButton) {
        sendButton.disabled = false;
      }
    } else {
      if (commandPreview) {
        commandPreview.textContent = 'Fill in the fields above to see the command';
        commandPreview.classList.add('empty');
      }
      if (sendButton) {
        sendButton.disabled = true;
      }
    }
    
    // Update QR toggle button state
    if (qrToggleBtn) {
      qrToggleBtn.disabled = !isValid || !recipient || !amount;
    }
    
    // Update QR code if in QR mode
    if (isQRMode && isValid && recipient && amount && commandPreview) {
      const command = commandPreview.textContent;
      updateQRCode(command);
    }
  }
  
  // QR Code Functions
  function generateXMobileURL(command) {
    // Add signature to command (linebreak for URL)
    const commandWithSignature = addNYLAGoSignatureForURL(command);
    // URL encode the command text
    const encodedCommand = encodeURIComponent(commandWithSignature);
    // Generate X.com compose URL with pre-filled text
    return `https://x.com/intent/post?text=${encodedCommand}`;
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
  if (recipientInput) {
    recipientInput.addEventListener('input', function() {
      let value = this.value;
      if (value && !value.startsWith('@')) {
        this.value = '@' + value;
      }
      validateAndUpdateCommand();
      saveValues();
    });
  }
  
  // Add event listeners for validation and saving
  if (amountInput) {
    amountInput.addEventListener('input', function() {
      validateAndUpdateCommand();
      saveValues();
    });
  }
  
  if (tokenSelect) {
    tokenSelect.addEventListener('change', function() {
      validateAndUpdateCommand();
      saveValues();
    });
  }
  
  // Swap form event listeners
  if (swapAmountInput) {
    swapAmountInput.addEventListener('input', function() {
      updateSwapCommand();
    });
  }
  
  if (swapFromTokenSelect) {
    swapFromTokenSelect.addEventListener('change', function() {
      updateSwapCommand();
    });
  }
  
  if (swapToTokenSelect) {
    swapToTokenSelect.addEventListener('change', function() {
      updateSwapCommand();
    });
  }
  
  // Swap blockchain radio button event listeners
  swapBlockchainRadios.forEach(radio => {
    if (radio) {
      radio.addEventListener('change', updateSwapCommand);
    }
  });
  
  // Swap button event listener
  if (swapButton) {
    swapButton.addEventListener('click', function() {
      if (!swapCommandPreview) return;
      const command = swapCommandPreview.textContent;
      if (command && !swapCommandPreview.classList.contains('empty')) {
        const commandWithSignature = addNYLAGoSignatureForURL(command);
        const encodedCommand = encodeURIComponent(commandWithSignature);
        const xUrl = `https://x.com/intent/post?text=${encodedCommand}`;
        chrome.tabs.create({ url: xUrl });
        showStatus('Opening X.com with swap command...', 'success');
        setTimeout(hideStatus, 2000);
      }
    });
  }
  
  // Community menu button event listener
  if (communityMenuButton) {
    communityMenuButton.addEventListener('click', function(e) {
      e.stopPropagation();
      toggleCommunityDropdown();
    });
  }
  
  // Close dropdown when clicking outside
  document.addEventListener('click', function(e) {
    if (communityDropdown && !communityDropdown.contains(e.target) && !communityMenuButton.contains(e.target)) {
      closeCommunityDropdown();
    }
  });
  
  // Close dropdown when clicking overlay
  document.addEventListener('click', function(e) {
    if (e.target && e.target.id === 'communityBackdrop') {
      closeCommunityDropdown();
    }
  });
  
  // Add event listeners for blockchain radio buttons
  if (blockchainRadios && blockchainRadios.length > 0) {
    blockchainRadios.forEach(radio => {
      if (radio) {
        radio.addEventListener('change', function() {
          validateAndUpdateCommand();
          saveValues();
        });
      }
    });
  }
  
  // Tab switching functionality
  if (actionTabs && actionTabs.length > 0) {
    actionTabs.forEach(tab => {
      if (tab) {
        tab.addEventListener('click', function() {
          const tabName = this.dataset.tab;
          
          // Remove active class from all tabs and content
          actionTabs.forEach(t => {
            if (t) t.classList.remove('active');
          });
          if (swapSection) swapSection.classList.remove('active');
          if (sendSection) sendSection.classList.remove('active');
          if (receiveSection) receiveSection.classList.remove('active');
          if (raidSection) raidSection.classList.remove('active');
          
          // Add active class to clicked tab
          this.classList.add('active');
          
          // Hide all sections first (including community sections)
          if (swapSection) swapSection.style.display = 'none';
          if (sendSection) sendSection.style.display = 'none';
          if (receiveSection) receiveSection.style.display = 'none';
          if (raidSection) raidSection.style.display = 'none';
          if (appSection) appSection.style.display = 'none';
          
          // Show corresponding content
          if (tabName === 'swap') {
            if (swapSection) {
              swapSection.classList.add('active');
              swapSection.style.display = 'block';
              updateSwapCommand();
            }
          } else if (tabName === 'send') {
            if (sendSection) {
              sendSection.classList.add('active');
              sendSection.style.display = 'block';
            }
          } else if (tabName === 'receive') {
            if (receiveSection) {
              receiveSection.classList.add('active');
              receiveSection.style.display = 'block';
              // Generate QR code when receive tab is opened
              setTimeout(() => {
                generateReceiveQRCode();
              }, 100);
            }
          } else if (tabName === 'raid') {
            if (raidSection) {
              raidSection.classList.add('active');
              raidSection.style.display = 'block';
            }
          }
        });
      }
    });
  }

  // Raid list item click handlers are now added dynamically in generateRaidSection()

  // Generate X.com mobile URL for QR codes (Receive tab)
  function generateReceiveXMobileURL(command) {
    const commandWithSignature = addNYLAGoSignatureForURL(command);
    const encodedCommand = encodeURIComponent(commandWithSignature);
    return `https://x.com/intent/post?text=${encodedCommand}`;
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
    
    // Update instruction text based on token
    const qrInstructionText = document.getElementById('qrInstructionText');
    if (qrInstructionText) {
      qrInstructionText.textContent = `📱 Share this QR code to receive ${token} payments`;
    }
    
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
    const mobileURL = generateReceiveXMobileURL(command);
    
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

  // Receive form event listeners - dynamic QR generation on field changes
  if (receiveUsernameInput) {
    receiveUsernameInput.addEventListener('input', function() {
      generateReceiveQRCode();
      saveReceiveValues();
    });
  }
  if (receiveAmountInput) {
    receiveAmountInput.addEventListener('input', function() {
      generateReceiveQRCode();
      saveReceiveValues();
    });
  }
  if (receiveTokenSelect) {
    receiveTokenSelect.addEventListener('change', function() {
      generateReceiveQRCode();
      saveReceiveValues();
    });
  }
  
  if (receiveBlockchainRadios && receiveBlockchainRadios.length > 0) {
    receiveBlockchainRadios.forEach(radio => {
      if (radio) {
        radio.addEventListener('change', function() {
          generateReceiveQRCode();
          saveReceiveValues();
        });
      }
    });
  }

  // Share Payment Request button
  const shareButton = document.getElementById('shareButton');
  if (shareButton) {
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
      
      const shareText = `💰 Send me ${amount} $${token} via X by using following link:\n\n${mobileURL}`;
      
      // Copy to clipboard (extension environment doesn't have native sharing)
      try {
        await navigator.clipboard.writeText(shareText);
        showStatus('Payment request copied to clipboard!', 'success');
        setTimeout(hideStatus, 3000);
      } catch (error) {
        console.error('Clipboard access failed:', error);
        // Fallback - create a text area and copy
        const textArea = document.createElement('textarea');
        textArea.value = shareText;
        document.body.appendChild(textArea);
        textArea.select();
        try {
          document.execCommand('copy');
          showStatus('Payment request copied to clipboard!', 'success');
        } catch (fallbackError) {
          showStatus('Unable to copy to clipboard', 'error');
        }
        document.body.removeChild(textArea);
        setTimeout(hideStatus, 3000);
      }
    });
  }

  // Add NYLA Go signature to commands (for content script injection - uses dash)
  function addNYLAGoSignatureForTextbox(command) {
    console.log('NYLA Extension: addNYLAGoSignatureForTextbox called with:', command);
    if (!command || command.trim() === '') {
      console.error('NYLA Extension: Empty command passed to signature function!');
      return 'ERROR: Empty command - please fill in recipient, amount, and token fields — Sent via #NYLAGo';
    }
    // Check if signature already exists to prevent double-signature
    if (command.includes('Sent via #NYLAGo')) {
      console.log('NYLA Extension: Signature already exists, returning as-is');
      return command;
    }
    const result = `${command} — Sent via #NYLAGo`;
    console.log('NYLA Extension: Added dash signature for textbox, result:', result);
    return result;
  }

  // Add NYLA Go signature to commands (for URLs - uses linebreaks)
  function addNYLAGoSignatureForURL(command) {
    console.log('NYLA Extension: addNYLAGoSignatureForURL called with:', command);
    if (!command || command.trim() === '') {
      console.error('NYLA Extension: Empty command passed to URL signature function!');
      return 'ERROR: Empty command - please fill in recipient, amount, and token fields\n\nSent via #NYLAGo';
    }
    // Check if signature already exists to prevent double-signature
    if (command.includes('Sent via #NYLAGo')) {
      console.log('NYLA Extension: URL signature already exists, returning as-is');
      return command;
    }
    const result = `${command}\n\nSent via #NYLAGo`;
    console.log('NYLA Extension: Added linebreak signature for URL, result:', result);
    return result;
  }

  // Generate X.com compose URL for fallback (uses linebreak signature)
  function generateXComposeURL(command) {
    const commandWithSignature = addNYLAGoSignatureForURL(command);
    const encodedCommand = encodeURIComponent(commandWithSignature);
    const finalURL = `https://x.com/intent/post?text=${encodedCommand}`;
    console.log('NYLA Extension: Final fallback URL:', finalURL);
    return finalURL;
  }

  // Handle send button click
  if (sendButton) {
    sendButton.addEventListener('click', async function() {
      if (!commandPreview) return;
      
      // Ensure we have a valid command by running validation first
      validateAndUpdateCommand();
      
      const command = commandPreview.textContent;
      console.log('NYLA Extension Send: Command from preview:', command);
      console.log('NYLA Extension Send: Preview has empty class:', commandPreview.classList.contains('empty'));
      
      // Check if command is placeholder text or empty
      if (!command || command.includes('Fill in the fields') || commandPreview.classList.contains('empty')) {
        console.error('NYLA Extension Send: Invalid command detected');
        showStatus('Please fill in all required fields first', 'error');
        setTimeout(hideStatus, 3000);
        return;
      }
    
    try {
      // Check if we're on X.com
      const [tab] = await chrome.tabs.query({active: true, currentWindow: true});
      
      if (!tab.url.includes('x.com') && !tab.url.includes('twitter.com')) {
        // Not on X.com - use fallback to open new window
        console.log('NYLA Extension: Not on X.com, using fallback to open new window');
        console.log('NYLA Extension: Original command being passed:', command);
        const composeURL = generateXComposeURL(command);
        console.log('NYLA Extension: Generated compose URL:', composeURL);
        window.open(composeURL, '_blank');
        showStatus('Opening X.com with your command...', 'success');
        
        // Clear form and storage after successful send
        setTimeout(() => {
          clearForm();
          hideStatus();
        }, 2000);
        return;
      }
      
      // Try to send command to content script (use dash signature for textbox)
      try {
        const commandWithSignature = addNYLAGoSignatureForTextbox(command);
        const response = await chrome.tabs.sendMessage(tab.id, {
          action: 'insertCommand',
          command: commandWithSignature
        });
        
        if (response.success) {
          showStatus('Command sent to X.com!', 'success');
          
          // Clear form and storage after successful send
          setTimeout(() => {
            clearForm();
            hideStatus();
          }, 2000);
        } else {
          throw new Error(response.error || 'Failed to insert command');
        }
        
      } catch (contentScriptError) {
        // Content script failed (no text box found) - use fallback
        console.log('NYLA Extension: Content script failed, using fallback:', contentScriptError);
        const composeURL = generateXComposeURL(command);
        window.open(composeURL, '_blank');
        showStatus('Text box not found - opening X.com compose window...', 'success');
        
        // Clear form and storage after successful fallback
        setTimeout(() => {
          clearForm();
          hideStatus();
        }, 2000);
      }
      
    } catch (error) {
      console.error('Error in send button handler:', error);
      // Final fallback - always try to open compose window
      const composeURL = generateXComposeURL(command);
      window.open(composeURL, '_blank');
      showStatus('Opening X.com with your command...', 'success');
      
      setTimeout(() => {
        clearForm();
        hideStatus();
      }, 2000);
    }
    });
  }
  
  function showStatus(message, type) {
    if (statusDiv) {
      statusDiv.textContent = message;
      statusDiv.className = `status ${type}`;
      statusDiv.style.display = 'block';
    }
  }
  
  function hideStatus() {
    if (statusDiv) {
      statusDiv.style.display = 'none';
    }
  }
  
  // Save form values to storage
  function saveValues() {
    if (!amountInput || !tokenSelect) return;
    
    const blockchainRadio = document.querySelector('input[name="blockchain"]:checked');
    if (!blockchainRadio) return;
    
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      const values = {
        // Don't save recipient - let it reset each time for safety
        amount: amountInput.value,
        token: tokenSelect.value,
        blockchain: blockchainRadio.value
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
          blockchain: blockchainRadio.value
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
            if (recipientInput) {
              recipientInput.value = detectedRecipient || '';
            }
            if (amountInput) {
              amountInput.value = values.amount || '1';
            }
            // Only set token if it exists in the current dropdown options
            if (tokenSelect) {
              const allTokens = [...defaultTokens, ...customTokens];
              if (allTokens.includes(values.token)) {
                tokenSelect.value = values.token;
              } else {
                tokenSelect.value = defaultTokens[0]; // Default to NYLA
              }
            }
            // Set blockchain selection (default to Solana if not saved)
            const savedBlockchain = values.blockchain || 'Solana';
            const blockchainRadio = document.querySelector(`input[name="blockchain"][value="${savedBlockchain}"]`);
            if (blockchainRadio) {
              blockchainRadio.checked = true;
            }
          } else if (detectedRecipient) {
            // If no saved values but we detected a recipient, use it
            if (recipientInput) {
              recipientInput.value = detectedRecipient;
            }
            if (amountInput) {
              amountInput.value = '1';
            }
          } else {
            // Clear recipient field for fresh start
            if (recipientInput) {
              recipientInput.value = '';
            }
            if (amountInput) {
              amountInput.value = '1';
            }
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
        if (recipientInput) {
          recipientInput.value = detectedRecipient || '';
        }
        if (amountInput) {
          amountInput.value = values.amount || '1';
        }
        // Only set token if it exists in the current dropdown options
        if (tokenSelect) {
          const allTokens = [...defaultTokens, ...customTokens];
          if (allTokens.includes(values.token)) {
            tokenSelect.value = values.token;
          } else {
            tokenSelect.value = defaultTokens[0]; // Default to NYLA
          }
        }
        // Set blockchain selection (default to Solana if not saved)
        const savedBlockchain = values.blockchain || 'Solana';
        const blockchainRadio = document.querySelector(`input[name="blockchain"][value="${savedBlockchain}"]`);
        if (blockchainRadio) {
          blockchainRadio.checked = true;
        }
      } else if (detectedRecipient) {
        // If no saved values but we detected a recipient, use it
        if (recipientInput) {
          recipientInput.value = detectedRecipient;
        }
        if (amountInput) {
          amountInput.value = '1';
        }
      } else {
        // Clear recipient field for fresh start
        if (recipientInput) {
          recipientInput.value = '';
        }
        if (amountInput) {
          amountInput.value = '1';
        }
      }
      validateAndUpdateCommand();
    } catch (e) {
      console.log('localStorage load failed:', e);
    }
  }
  
  // Clear form and storage
  function clearForm() {
    if (recipientInput) {
      recipientInput.value = '';
    }
    if (amountInput) {
      amountInput.value = '1';
    }
    if (tokenSelect) {
      tokenSelect.selectedIndex = 0;
    }
    
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
  
  // Save receive form values to storage
  function saveReceiveValues() {
    if (!receiveUsernameInput || !receiveAmountInput || !receiveTokenSelect) return;
    
    const receiveBlockchainRadio = document.querySelector('input[name="receiveBlockchain"]:checked');
    if (!receiveBlockchainRadio) return;
    
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      const values = {
        receiveUsername: receiveUsernameInput.value,
        receiveAmount: receiveAmountInput.value,
        receiveToken: receiveTokenSelect.value,
        receiveBlockchain: receiveBlockchainRadio.value
      };
      chrome.storage.local.set({ nylaReceiveValues: values }).catch(err => {
        console.log('Receive storage save failed:', err);
        // Fallback to localStorage
        try {
          localStorage.setItem('nylaReceiveValues', JSON.stringify(values));
        } catch (e) {
          console.log('localStorage fallback failed:', e);
        }
      });
    } else {
      // Fallback to localStorage
      try {
        const values = {
          receiveUsername: receiveUsernameInput.value,
          receiveAmount: receiveAmountInput.value,
          receiveToken: receiveTokenSelect.value,
          receiveBlockchain: receiveBlockchainRadio.value
        };
        localStorage.setItem('nylaReceiveValues', JSON.stringify(values));
      } catch (e) {
        console.log('localStorage fallback failed:', e);
      }
    }
  }
  
  // Load saved receive values from storage
  function loadReceiveValues() {
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      chrome.storage.local.get(['nylaReceiveValues']).then(result => {
        if (result.nylaReceiveValues) {
          const values = result.nylaReceiveValues;
          if (receiveUsernameInput) {
            receiveUsernameInput.value = values.receiveUsername || 'h2crypto_eth';
          }
          if (receiveAmountInput) {
            receiveAmountInput.value = values.receiveAmount || '1';
          }
          if (receiveTokenSelect) {
            receiveTokenSelect.value = values.receiveToken || 'NYLA';
          }
          // Set blockchain selection (default to Solana if not saved)
          const savedBlockchain = values.receiveBlockchain || 'Solana';
          const blockchainRadio = document.querySelector(`input[name="receiveBlockchain"][value="${savedBlockchain}"]`);
          if (blockchainRadio) {
            blockchainRadio.checked = true;
          }
        } else {
          // Set default values
          if (receiveUsernameInput) {
            receiveUsernameInput.value = 'h2crypto_eth';
          }
          if (receiveAmountInput) {
            receiveAmountInput.value = '1';
          }
        }
      }).catch(err => {
        console.log('Receive storage load failed:', err);
        // Fallback to localStorage
        loadReceiveFromLocalStorage();
      });
    } else {
      // Fallback to localStorage
      loadReceiveFromLocalStorage();
    }
  }
  
  // Fallback localStorage loading for receive values
  function loadReceiveFromLocalStorage() {
    try {
      const saved = localStorage.getItem('nylaReceiveValues');
      if (saved) {
        const values = JSON.parse(saved);
        if (receiveUsernameInput) {
          receiveUsernameInput.value = values.receiveUsername || 'h2crypto_eth';
        }
        if (receiveAmountInput) {
          receiveAmountInput.value = values.receiveAmount || '1';
        }
        if (receiveTokenSelect) {
          receiveTokenSelect.value = values.receiveToken || 'NYLA';
        }
        // Set blockchain selection (default to Solana if not saved)
        const savedBlockchain = values.receiveBlockchain || 'Solana';
        const blockchainRadio = document.querySelector(`input[name="receiveBlockchain"][value="${savedBlockchain}"]`);
        if (blockchainRadio) {
          blockchainRadio.checked = true;
        }
      } else {
        // Set default values
        if (receiveUsernameInput) {
          receiveUsernameInput.value = 'h2crypto_eth';
        }
        if (receiveAmountInput) {
          receiveAmountInput.value = '1';
        }
      }
    } catch (e) {
      console.log('localStorage load failed:', e);
    }
  }

  // Community dropdown functions
  function toggleCommunityDropdown() {
    if (!communityDropdown) return;
    
    const isVisible = communityDropdown.style.display === 'block';
    if (isVisible) {
      closeCommunityDropdown();
    } else {
      openCommunityDropdown();
    }
  }
  
  function openCommunityDropdown() {
    if (!communityDropdown || !communityMenuButton) return;
    
    // Blur main content
    const mainContainer = document.querySelector('.main-container');
    if (mainContainer) {
      mainContainer.classList.add('menu-open');
    }
    
    // Add dark overlay
    const overlay = document.createElement('div');
    overlay.className = 'backdrop-overlay';
    overlay.id = 'communityBackdrop';
    document.body.appendChild(overlay);
    
    // Position dropdown relative to button
    const buttonRect = communityMenuButton.getBoundingClientRect();
    communityDropdown.style.position = 'fixed';
    communityDropdown.style.top = (buttonRect.bottom + 5) + 'px';
    communityDropdown.style.right = (window.innerWidth - buttonRect.right) + 'px';
    
    // Show dropdown
    communityDropdown.style.display = 'block';
  }
  
  function closeCommunityDropdown() {
    if (!communityDropdown) return;
    
    // Remove blur from main content
    const mainContainer = document.querySelector('.main-container');
    if (mainContainer) {
      mainContainer.classList.remove('menu-open');
    }
    
    // Remove overlay
    const overlay = document.getElementById('communityBackdrop');
    if (overlay) {
      overlay.remove();
    }
    
    // Hide dropdown
    communityDropdown.style.display = 'none';
  }
  
  // Swap command generation
  function updateSwapCommand() {
    if (!swapAmountInput || !swapFromTokenSelect || !swapToTokenSelect || !swapCommandPreview) {
      return;
    }
    
    const amount = swapAmountInput.value.trim();
    const fromToken = swapFromTokenSelect.value;
    const toToken = swapToTokenSelect.value;
    
    // Get selected blockchain
    let blockchain = 'Solana'; // default
    swapBlockchainRadios.forEach(radio => {
      if (radio.checked) {
        blockchain = radio.value;
      }
    });
    
    if (amount && fromToken && toToken && amount > 0) {
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
      if (swapButton) {
        swapButton.disabled = false;
      }
    } else {
      swapCommandPreview.textContent = 'Fill in the tokens above to see the swap command';
      swapCommandPreview.classList.add('empty');
      if (swapButton) {
        swapButton.disabled = true;
      }
    }
  }
  
  // App section click handlers
  const appItems = document.querySelectorAll('.app-item');
  appItems.forEach(item => {
    item.addEventListener('click', function() {
      const url = this.getAttribute('data-url');
      if (url) {
        chrome.tabs.create({ url: url });
        showStatus('Opening community app...', 'success');
        setTimeout(hideStatus, 2000);
      }
    });
  });
  
  // Back button handlers
  const raidBackButton = document.getElementById('raidBackButton');
  const appBackButton = document.getElementById('appBackButton');
  
  if (raidBackButton) {
    raidBackButton.addEventListener('click', function() {
      // Go back to the Send tab (default tab)
      const sendTab = document.querySelector('.action-tab[data-tab="send"]');
      if (sendTab) {
        sendTab.click();
      }
    });
  }
  
  if (appBackButton) {
    appBackButton.addEventListener('click', function() {
      // Go back to the Send tab (default tab)
      const sendTab = document.querySelector('.action-tab[data-tab="send"]');
      if (sendTab) {
        sendTab.click();
      }
    });
  }
  
  // Set default active tab to Send (different from PWA)
  setTimeout(() => {
    const sendTab = document.querySelector('.action-tab[data-tab="send"]');
    if (sendTab && !document.querySelector('.action-tab.active')) {
      sendTab.click();
    }
  }, 100);
  
  // Initialize
  validateAndUpdateCommand();
  updateSwapCommand();
});