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
  const refreshQrButton = document.getElementById('refreshQrButton');
  const shareButton = document.getElementById('shareButton');
  const statusDiv = document.getElementById('status');
  const receiveBlockchainRadios = document.querySelectorAll('input[name="receiveBlockchain"]');

  // Initialize app
  console.log('NYLA GO PWA: Starting application');
  
  // Initialize splash screen
  initializeSplashScreen();
  
  // Generate initial QR code with default values (after splash)
  function initializeApp() {
    setTimeout(() => {
      generateReceiveQRCode();
    }, 200);
  }

  // Generate X.com mobile URL for QR codes
  function generateXMobileURL(command) {
    const encodedCommand = encodeURIComponent(command);
    return `https://x.com/compose/post?text=${encodedCommand}`;
  }

  // Generate QR Code for payment requests
  function generateReceiveQRCode() {
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

  // Event Listeners
  receiveUsernameInput.addEventListener('input', generateReceiveQRCode);
  receiveAmountInput.addEventListener('input', generateReceiveQRCode);
  receiveTokenSelect.addEventListener('change', generateReceiveQRCode);
  
  receiveBlockchainRadios.forEach(radio => {
    radio.addEventListener('change', generateReceiveQRCode);
  });

  // Refresh QR button
  refreshQrButton.addEventListener('click', function() {
    this.classList.add('loading');
    generateReceiveQRCode();
    showStatus('QR Code refreshed!', 'success');
    
    setTimeout(() => {
      this.classList.remove('loading');
      hideStatus();
    }, 2000);
  });

  // Share functionality
  shareButton.addEventListener('click', async function() {
    const username = receiveUsernameInput.value.trim().replace('@', '') || 'h2crypto_eth';
    const amount = receiveAmountInput.value || '1';
    const token = receiveTokenSelect.value || 'NYLA';
    
    let blockchain = 'Solana';
    receiveBlockchainRadios.forEach(radio => {
      if (radio.checked) blockchain = radio.value;
    });
    
    const shareText = `💰 Send me ${amount} $${token} on ${blockchain}!\n\nScan my NYLA GO payment request: ${window.location.href}`;
    
    if (navigator.share) {
      // Native sharing (mobile)
      try {
        await navigator.share({
          title: 'NYLA Payment Request',
          text: shareText,
          url: window.location.href
        });
        showStatus('Shared successfully!', 'success');
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
    let minDisplayTime = 4000; // Minimum 4 seconds display
    let startTime = Date.now();
    
    // Check if user prefers reduced motion
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    
    if (prefersReducedMotion) {
      // Skip video, show fallback immediately
      showSplashFallback();
      setTimeout(completeSplash, 2000); // Shorter duration for accessibility
      return;
    }
    
    // Try to play video
    splashVideo.addEventListener('canplay', function() {
      console.log('NYLA GO PWA: Splash video ready to play');
      
      // Hide fallback and show video smoothly
      splashFallback.classList.add('hide');
      
      setTimeout(function() {
        splashVideo.classList.add('loaded');
        splashVideo.play().catch(function(error) {
          console.log('NYLA GO PWA: Video autoplay failed, showing fallback');
          showSplashFallback();
        });
      }, 300);
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
    
    // Fallback timer (if video doesn't load within 2 seconds)
    setTimeout(function() {
      if (!splashCompleted && splashVideo.paused) {
        console.log('NYLA GO PWA: Video loading timeout, showing fallback');
        showSplashFallback();
      }
    }, 2000);
    
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