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
  
  // Default tokens in order
  const defaultTokens = ['NYLA', 'SOL', 'ETH', 'ALGO', 'USDC', 'USDT'];
  let customTokens = [];
  
  // Load saved values and custom tokens from storage
  loadSavedValues();
  
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
  
  // Developer Credit Click Handler
  developerCredit.addEventListener('click', function() {
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
            amountInput.value = values.amount || '';
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
          } else {
            // Clear recipient field for fresh start
            recipientInput.value = '';
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
        amountInput.value = values.amount || '';
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
      } else {
        // Clear recipient field for fresh start
        recipientInput.value = '';
      }
      validateAndUpdateCommand();
    } catch (e) {
      console.log('localStorage load failed:', e);
    }
  }
  
  // Clear form and storage
  function clearForm() {
    recipientInput.value = '';
    amountInput.value = '';
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