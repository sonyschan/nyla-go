/**
 * KB Version Management Demo
 * Demonstrates the version tracking and regeneration system
 */

async function runVersionDemo() {
  console.log('🔄 KB Version Management Demo');
  console.log('================================');
  
  try {
    // Initialize version manager
    console.log('1. Initializing version manager...');
    const versionManager = new NYLAKBVersionManager();
    await versionManager.initialize();
    console.log('✅ Version manager initialized');
    
    // Create a mock knowledge base
    console.log('\n2. Creating mock knowledge base...');
    const mockKB = {
      features: {
        title: "NYLA Features",
        content: "Send and receive tokens via social media"
      },
      blockchain: {
        title: "Supported Blockchains", 
        content: "Solana, Ethereum, and Algorand networks"
      },
      timestamp: Date.now() // This will make each run different
    };
    
    // Generate hash for current KB
    const currentHash = await versionManager.generateKBHash(mockKB);
    console.log(`✅ Generated KB hash: ${currentHash.substring(0, 16)}...`);
    
    // Check stored version
    console.log('\n3. Checking stored version...');
    const stored = await versionManager.getStoredVersion();
    if (stored) {
      console.log(`📋 Stored version found:`);
      console.log(`   Hash: ${stored.hash.substring(0, 16)}...`);
      console.log(`   Generated: ${stored.generatedAt}`);
      console.log(`   Chunks: ${stored.chunkCount}`);
    } else {
      console.log('📋 No stored version found (first time)');
    }
    
    // Mock vector DB stats
    const mockVectorStats = {
      version: '1.0.0',
      chunkCount: stored ? stored.chunkCount : 0
    };
    
    // Check if rebuild needed
    console.log('\n4. Checking if rebuild needed...');
    const rebuildCheck = await versionManager.needsRebuild(mockKB, mockVectorStats);
    
    console.log(`🔍 Rebuild needed: ${rebuildCheck.needsRebuild}`);
    if (rebuildCheck.needsRebuild) {
      console.log(`📋 Reasons: ${rebuildCheck.reasons.join(', ')}`);
    }
    
    // Simulate marking as up-to-date
    console.log('\n5. Simulating successful build...');
    const newStats = {
      version: '1.0.0',
      chunkCount: Math.floor(Math.random() * 100) + 50 // Random chunk count
    };
    
    await versionManager.markAsUpToDate(mockKB, newStats, {
      buildTime: Date.now(),
      demo: true
    });
    console.log('✅ Version marked as up-to-date');
    
    // Verify the update
    console.log('\n6. Verifying update...');
    const updatedStored = await versionManager.getStoredVersion();
    console.log(`📋 Updated version:`);
    console.log(`   Hash: ${updatedStored.hash.substring(0, 16)}...`);
    console.log(`   Chunks: ${updatedStored.chunkCount}`);
    console.log(`   Updated: ${updatedStored.updatedAt}`);
    
    // Test rebuild check again
    console.log('\n7. Checking rebuild status again...');
    const secondCheck = await versionManager.needsRebuild(mockKB, newStats);
    console.log(`🔍 Rebuild needed: ${secondCheck.needsRebuild}`);
    if (!secondCheck.needsRebuild) {
      console.log('✅ Version tracking working correctly!');
    }
    
    // Show version info
    console.log('\n8. Complete version information...');
    const versionInfo = await versionManager.getVersionInfo();
    console.log('📊 Version Info:');
    console.log(`   Has stored version: ${versionInfo.hasStoredVersion}`);
    console.log(`   Manager initialized: ${versionInfo.manager.initialized}`);
    console.log(`   Tracked files: ${versionInfo.manager.trackedFiles.length}`);
    
    console.log('\n🎉 Version management demo completed successfully!');
    
    return {
      success: true,
      versionInfo,
      currentHash,
      rebuildCheck
    };
    
  } catch (error) {
    console.error('\n❌ Demo failed:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

// Export for testing
if (typeof window !== 'undefined') {
  window.runVersionDemo = runVersionDemo;
}

// Auto-run demo in debug mode
if (typeof window !== 'undefined' && window.NYLAKBVersionManager) {
  // Wait for other components to load
  setTimeout(() => {
    if (localStorage.getItem('nyla-rag-debug') === 'true') {
      runVersionDemo().catch(console.error);
    }
  }, 3000);
}

// Provide easy access to version manager utilities
if (typeof window !== 'undefined') {
  window.versionUtils = {
    // Quick version check
    async checkVersion() {
      const vm = new NYLAKBVersionManager();
      await vm.initialize();
      return await vm.getVersionInfo();
    },
    
    // Clear version tracking
    async clearVersion() {
      const vm = new NYLAKBVersionManager();
      await vm.initialize();
      await vm.clearVersion();
      console.log('🧹 Version tracking cleared');
    },
    
    // Force rebuild check
    async forceRebuildCheck(knowledgeBase) {
      const vm = new NYLAKBVersionManager();
      await vm.initialize();
      return await vm.needsRebuild(knowledgeBase, { chunkCount: 0 });
    }
  };
}