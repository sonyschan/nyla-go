/**
 * Production Sync Demo
 * Demonstrates the production vector database sync system
 */

async function runProductionSyncDemo() {
  console.log('🌐 Production Sync Demo');
  console.log('========================');
  
  try {
    // Initialize production sync manager
    console.log('1. Initializing production sync manager...');
    const productionSync = new NYLAProductionSync({
      // Use default URLs (will be relative when local)
      checkIntervalMs: 1000 * 60 * 5, // 5 minutes for demo
      forceCheckOnStartup: false // Don't auto-check in demo
    });
    
    await productionSync.initialize();
    console.log('✅ Production sync initialized');
    
    // Check current status
    console.log('\n2. Checking current status...');
    const status = productionSync.getStatus();
    console.log('📊 Status:', {
      initialized: status.initialized,
      updateInProgress: status.updateInProgress,
      currentVersion: status.currentVersion?.version || 'none',
      lastCheckTime: status.lastCheckTime ? new Date(status.lastCheckTime).toLocaleString() : 'never'
    });
    
    // Get local version info
    const localVersion = await productionSync.getLocalVersion();
    console.log('\n3. Local version information:');
    if (localVersion) {
      console.log('📋 Local version:', {
        version: localVersion.version || 'unknown',
        hash: localVersion.hash?.substring(0, 16) + '...' || 'none',
        chunkCount: localVersion.chunkCount || 0,
        updatedAt: localVersion.updatedAt || 'unknown',
        source: localVersion.source || 'unknown'
      });
    } else {
      console.log('📋 No local version found (first time)');
    }
    
    // Check for production updates
    console.log('\n4. Checking for production updates...');
    const updateCheck = await productionSync.checkForUpdates();
    console.log('🔍 Update check result:', {
      updateAvailable: updateCheck.updateAvailable,
      reason: updateCheck.reason
    });
    
    if (updateCheck.updateAvailable) {
      console.log('🆕 Production update details:');
      console.log('   Current:', updateCheck.currentVersion?.hash?.substring(0, 8) || 'none');
      console.log('   Production:', updateCheck.productionVersion?.hash?.substring(0, 8));
      console.log('   Reason:', updateCheck.reason);
    }
    
    // Simulate event handling
    console.log('\n5. Setting up event handlers...');
    productionSync.on('updateAvailable', (data) => {
      console.log('📢 Event: Update available -', data.reason);
    });
    
    productionSync.on('updateProgress', (progress) => {
      console.log(`🔄 Event: ${progress.stage} - ${progress.percentage}%`);
    });
    
    productionSync.on('updateCompleted', (data) => {
      console.log('✅ Event: Update completed -', data.chunkCount, 'chunks');
    });
    
    productionSync.on('updateFailed', (error) => {
      console.log('❌ Event: Update failed -', error.error);
    });
    
    // Demo user preferences
    console.log('\n6. User preferences demo...');
    const currentAutoUpdate = localStorage.getItem('nyla-auto-update') === 'true';
    console.log('⚙️ Auto-update currently:', currentAutoUpdate ? 'enabled' : 'disabled');
    
    console.log('💡 To enable auto-update: localStorage.setItem("nyla-auto-update", "true")');
    console.log('💡 To disable auto-update: localStorage.setItem("nyla-auto-update", "false")');
    
    // Demo manual operations
    console.log('\n7. Available manual operations:');
    console.log('🔧 Force update check: await productionSync.checkForUpdates()');
    console.log('🔄 Force download & install: await productionSync.forceUpdate()');
    console.log('🧹 Clear version tracking: await productionSync.clearVersion()');
    
    // Provide demo utilities
    window.productionSyncDemo = {
      sync: productionSync,
      
      async checkForUpdates() {
        return await productionSync.checkForUpdates();
      },
      
      async simulateUpdate() {
        console.log('🎭 Simulating production update...');
        if (updateCheck.updateAvailable) {
          try {
            await productionSync.downloadAndInstall();
            console.log('✅ Simulated update completed');
          } catch (error) {
            console.log('❌ Simulated update failed:', error.message);
          }
        } else {
          console.log('ℹ️ No update available to simulate');
        }
      },
      
      async enableAutoUpdate() {
        localStorage.setItem('nyla-auto-update', 'true');
        console.log('✅ Auto-update enabled');
      },
      
      async disableAutoUpdate() {
        localStorage.setItem('nyla-auto-update', 'false');
        console.log('⏹️ Auto-update disabled');
      },
      
      async clearVersion() {
        await productionSync.clearVersion();
        console.log('🧹 Version tracking cleared');
      },
      
      getStatus() {
        return productionSync.getStatus();
      }
    };
    
    console.log('\n🎉 Production sync demo completed!');
    console.log('\n💡 Demo utilities available:');
    console.log('   productionSyncDemo.checkForUpdates()');
    console.log('   productionSyncDemo.simulateUpdate()');
    console.log('   productionSyncDemo.enableAutoUpdate()');
    console.log('   productionSyncDemo.disableAutoUpdate()');
    console.log('   productionSyncDemo.clearVersion()');
    console.log('   productionSyncDemo.getStatus()');
    
    return {
      success: true,
      productionSync,
      updateCheck,
      localVersion,
      status
    };
    
  } catch (error) {
    console.error('\n❌ Production sync demo failed:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

// Simulate production version endpoint (for testing)
function createMockProductionVersion() {
  return {
    version: '1.2.3',
    hash: 'abc123def456' + Math.random().toString(36).substring(7),
    buildTime: new Date().toISOString(),
    chunkCount: Math.floor(Math.random() * 500) + 300,
    embeddingModel: 'multilingual-e5-base',
    embeddingDimension: 768,
    files: {
      compressed: {
        path: 'nyla-knowledge-index.json.gz',
        size: 2500000,
        compressionRatio: 73
      }
    }
  };
}

// Simulate update scenarios
window.simulateProductionScenarios = {
  
  async newVersionAvailable() {
    console.log('🎭 Scenario: New version available');
    const mockVersion = createMockProductionVersion();
    console.log('📦 Mock production version:', mockVersion.version);
    
    // This would normally trigger an update notification
    if (window.productionSyncDemo) {
      const updateCheck = await window.productionSyncDemo.checkForUpdates();
      console.log('Update check result:', updateCheck);
    }
  },
  
  async downloadProgress() {
    console.log('🎭 Scenario: Simulating download progress');
    
    const stages = ['download', 'processing', 'installing'];
    for (const stage of stages) {
      for (let percentage = 0; percentage <= 100; percentage += 25) {
        console.log(`🔄 ${stage}: ${percentage}%`);
        await new Promise(resolve => setTimeout(resolve, 200));
      }
    }
    console.log('✅ Simulated download completed');
  },
  
  async updateFailure() {
    console.log('🎭 Scenario: Update failure');
    console.log('❌ Simulated network error during download');
    console.log('🔄 Falling back to local vector DB');
    console.log('💡 User can retry later or continue with local version');
  },
  
  async autoUpdateFlow() {
    console.log('🎭 Scenario: Auto-update flow');
    console.log('1. 🔍 Background check finds new version');
    console.log('2. 🤖 Auto-update enabled, starting download');
    console.log('3. 📥 Downloading in background...');
    await this.downloadProgress();
    console.log('4. ✅ Update completed silently');
    console.log('5. 📢 User sees: "Knowledge base updated!"');
  },
  
  async manualUpdateFlow() {
    console.log('🎭 Scenario: Manual update flow');
    console.log('1. 🔍 Background check finds new version');
    console.log('2. 📢 Show notification: "New update available"');
    console.log('3. 👤 User clicks notification');
    console.log('4. ❓ Confirm dialog: "Download and install update?"');
    console.log('5. 👤 User approves');
    console.log('6. 📥 Download with progress...');
    await this.downloadProgress();
    console.log('7. ✅ User sees: "Update completed successfully!"');
  }
};

// Export for testing
if (typeof window !== 'undefined') {
  window.runProductionSyncDemo = runProductionSyncDemo;
}

// Auto-run demo in debug mode
if (typeof window !== 'undefined' && window.NYLAProductionSync) {
  setTimeout(() => {
    if (localStorage.getItem('nyla-rag-debug') === 'true') {
      runProductionSyncDemo().catch(console.error);
    }
  }, 4000);
}