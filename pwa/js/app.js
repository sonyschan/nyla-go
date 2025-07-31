// NYLA GO PWA - Main Application Logic

document.addEventListener('DOMContentLoaded', function() {
  // Splash Screen Elements
  const splashScreen = document.getElementById('splashScreen');
  const splashVideo = document.getElementById('splashVideo');
  const splashFallback = document.getElementById('splashFallback');
  const appContainer = document.getElementById('appContainer');

  // DOM Elements
  const receiveUsernameInput = document.getElementById('receiveUsername');
  const receiveAmountInput = document.getElementById('receiveAmount');
  const receiveTokenSelect = document.getElementById('receiveToken');
  const receiveQrCode = document.getElementById('receiveQrCode');
  const shareButton = document.getElementById('shareButton');
  const statusDiv = document.getElementById('status');
  const receiveBlockchainRadios = document.querySelectorAll('input[name="receiveBlockchain"]');
  const qrInstructionText = document.getElementById('qrInstructionText');
  const versionText = document.getElementById('versionText');
  
  // Tab Elements
  const tabButtons = document.querySelectorAll('.tab-button');
  const receiveTab = document.getElementById('receiveTab');
  const raidTab = document.getElementById('raidTab');
  const appTab = document.getElementById('appTab');
  const raidListItems = document.querySelectorAll('.raid-list-item');
  const appItems = document.querySelectorAll('.app-item');

  // App version - will be dynamically determined
  let APP_VERSION = '0.7.6';

  // Initialize app
  console.log('NYLA GO PWA: Starting application');
  
  // Initialize splash screen
  initializeSplashScreen();
  
  // Generate initial QR code with default values (after splash)
  function initializeApp() {
    // Load saved username from localStorage
    const savedUsername = localStorage.getItem('nylaGoUsername');
    if (savedUsername) {
      receiveUsernameInput.value = savedUsername;
    }
    
    // Update version text dynamically
    updateVersionText();
    
    setTimeout(() => {
      generateReceiveQRCode();
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

  // Generate X.com mobile URL for QR codes
  function generateXMobileURL(command) {
    const encodedCommand = encodeURIComponent(command);
    return `https://x.com/compose/post?text=${encodedCommand}`;
  }

  // Update QR instruction text based on token
  function updateQRInstructionText() {
    const token = receiveTokenSelect.value || 'NYLA';
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

  // Save username to localStorage when changed
  function saveUsername() {
    const username = receiveUsernameInput.value.trim();
    if (username) {
      localStorage.setItem('nylaGoUsername', username);
    } else {
      localStorage.removeItem('nylaGoUsername');
    }
  }

  // Event Listeners
  receiveUsernameInput.addEventListener('input', function() {
    saveUsername();
    generateReceiveQRCode();
  });
  receiveAmountInput.addEventListener('input', generateReceiveQRCode);
  receiveTokenSelect.addEventListener('change', generateReceiveQRCode);
  
  receiveBlockchainRadios.forEach(radio => {
    radio.addEventListener('change', generateReceiveQRCode);
  });

  // Tab switching functionality
  tabButtons.forEach(button => {
    button.addEventListener('click', function() {
      const tabName = this.dataset.tab;
      
      // Remove active class from all tabs and buttons
      tabButtons.forEach(btn => btn.classList.remove('active'));
      if (receiveTab) receiveTab.classList.remove('active');
      if (raidTab) raidTab.classList.remove('active');
      if (appTab) appTab.classList.remove('active');
      
      // Hide all tab content
      if (receiveTab) receiveTab.style.display = 'none';
      if (raidTab) raidTab.style.display = 'none';
      if (appTab) appTab.style.display = 'none';
      
      // Show selected tab
      this.classList.add('active');
      
      if (tabName === 'receive') {
        if (receiveTab) {
          receiveTab.classList.add('active');
          receiveTab.style.display = 'block';
          // Generate QR code when switching to receive tab
          generateReceiveQRCode();
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

  // Raid list item click handlers
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


  // Share functionality
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
    
    if (navigator.share) {
      // Native sharing (mobile)
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
          fallbackShare(shareText);
        }
      }
    } else {
      // Fallback sharing
      fallbackShare(shareText);
    }
  });

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

  console.log('NYLA GO PWA: Application initialized successfully');
});