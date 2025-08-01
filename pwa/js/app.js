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
  let APP_VERSION = '1.4.5';

  // Initialize app
  console.log('NYLA GO PWA: Starting application');
  
  // Initialize device detection and layout
  initializeDeviceDetection();
  
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
    
    // Generate raid section from shared data
    generateRaidSection();
    
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
      const shareText = `💰 Send me ${amount} $${token} via X by using following link:\n\n${mobileURL}`;
      
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
            fallbackShare(shareText);
          }
        }
      } else {
        fallbackShare(shareText);
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
      isDesktop: () => window.innerWidth >= 1024 && window.innerHeight >= 768,
      hasTouchSupport: () => 'ontouchstart' in window || navigator.maxTouchPoints > 0,
      isLikelyMobile: () => /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent),
      
      updateLayout() {
        const body = document.body;
        const isDesktop = this.isDesktop() && !this.hasTouchSupport;
        
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
        const tabButtons = document.querySelectorAll('.tab-button');
        
        if (isDesktop) {
          // Desktop: Show all sections simultaneously
          tabContents.forEach(content => {
            content.style.display = 'block';
          });
          
          // Update active tab styling for desktop sidebar
          tabButtons.forEach(button => {
            button.addEventListener('click', (e) => {
              e.preventDefault();
              const targetId = button.dataset.tab + 'Tab';
              const targetSection = document.getElementById(targetId);
              if (targetSection) {
                targetSection.scrollIntoView({ 
                  behavior: 'smooth', 
                  block: 'start' 
                });
              }
            });
          });
        } else {
          // Mobile: Traditional tab switching
          const activeTab = document.querySelector('.tab-content.active');
          tabContents.forEach(content => {
            content.style.display = content === activeTab ? 'block' : 'none';
          });
        }
      },
      
      enableDesktopFeatures() {
        // Add keyboard navigation
        this.addKeyboardNavigation();
        
        // Enhanced hover states are handled by CSS
        console.log('NYLA GO PWA: Desktop features enabled');
      },
      
      enableMobileFeatures() {
        // Initialize mobile gestures only for mobile devices
        if (!this.isDesktop()) {
          initializeMobileGestures();
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
        currentTab: 0,
        tabs: ['receive', 'raid', 'app'],
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
        // Find currently active tab
        this.elements.tabButtons.forEach((button, index) => {
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
        const targetButton = this.elements.tabButtons[tabIndex];
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

  console.log('NYLA GO PWA: Application initialized successfully');
});