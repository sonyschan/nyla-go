#!/usr/bin/env node
/**
 * Pre-commit Hook: Check KB Changes
 * Detects knowledge base changes and regenerates embeddings if needed
 */

const fs = require('fs').promises;
const path = require('path');
const { execSync } = require('child_process');
const crypto = require('crypto');

class KBChangeChecker {
  constructor() {
    this.projectRoot = path.resolve(__dirname, '..');
    this.trackedFiles = [
      'pwa/kb/'
      // Note: nylago-ui-data.js removed - UI files don't affect knowledge base  
    ];
    this.hashFile = path.join(this.projectRoot, '.kb-hashes.json');
    this.embeddingScript = path.join(this.projectRoot, 'pwa/js/rag/build-embeddings.js');
  }

  /**
   * Generate file hash
   */
  async generateFileHash(filePath) {
    try {
      const fullPath = path.join(this.projectRoot, filePath);
      const content = await fs.readFile(fullPath, 'utf-8');
      return crypto.createHash('sha256').update(content).digest('hex');
    } catch (error) {
      console.warn(`⚠️  Could not hash ${filePath}: ${error.message}`);
      return null;
    }
  }

  /**
   * Load stored hashes
   */
  async loadStoredHashes() {
    try {
      const content = await fs.readFile(this.hashFile, 'utf-8');
      return JSON.parse(content);
    } catch (error) {
      // No stored hashes yet
      return {};
    }
  }

  /**
   * Save hashes
   */
  async saveHashes(hashes) {
    await fs.writeFile(this.hashFile, JSON.stringify({
      ...hashes,
      updatedAt: new Date().toISOString()
    }, null, 2));
  }

  /**
   * Check if any tracked files changed
   */
  async checkForChanges() {
    console.log('🔍 Checking for knowledge base changes...');
    
    const stored = await this.loadStoredHashes();
    const current = {};
    const changes = [];
    
    for (const file of this.trackedFiles) {
      const currentHash = await this.generateFileHash(file);
      current[file] = currentHash;
      
      if (currentHash && stored[file] !== currentHash) {
        changes.push({
          file,
          oldHash: stored[file]?.substring(0, 8) || 'new',
          newHash: currentHash.substring(0, 8)
        });
      }
    }
    
    return { hasChanges: changes.length > 0, changes, current };
  }

  /**
   * Check if staged files include KB files
   */
  async checkStagedFiles() {
    try {
      const output = execSync('git diff --cached --name-only', { encoding: 'utf-8' });
      const stagedFiles = output.split('\n').filter(f => f.trim());
      
      const kbFilesStaged = this.trackedFiles.filter(file =>
        stagedFiles.includes(file)
      );
      
      return {
        hasKBFiles: kbFilesStaged.length > 0,
        stagedKBFiles: kbFilesStaged,
        allStagedFiles: stagedFiles
      };
    } catch (error) {
      console.warn(`⚠️  Could not check staged files: ${error.message}`);
      return { hasKBFiles: false, stagedKBFiles: [], allStagedFiles: [] };
    }
  }

  /**
   * Regenerate embeddings
   */
  async regenerateEmbeddings() {
    console.log('🚀 Regenerating embeddings...');
    
    try {
      // Change to project root for proper imports
      process.chdir(this.projectRoot);
      
      // Run embedding generation script
      console.log('📦 Running embedding generation...');
      const output = execSync(`node "${this.embeddingScript}"`, {
        encoding: 'utf-8',
        stdio: 'pipe'
      });
      
      console.log('📄 Embedding generation output:');
      console.log(output);
      
      // Stage generated files if they exist
      const generatedFiles = [
        'pwa/nyla-knowledge-index.json',
        'pwa/nyla-knowledge-index.json.gz'
      ];
      
      for (const file of generatedFiles) {
        const fullPath = path.join(this.projectRoot, file);
        try {
          await fs.access(fullPath);
          execSync(`git add "${file}"`);
          console.log(`✅ Staged generated file: ${file}`);
        } catch (error) {
          console.log(`ℹ️  Generated file not found (skipping): ${file}`);
        }
      }
      
      return true;
      
    } catch (error) {
      console.error('❌ Embedding generation failed:', error.message);
      if (error.stdout) console.log('STDOUT:', error.stdout);
      if (error.stderr) console.log('STDERR:', error.stderr);
      return false;
    }
  }

  /**
   * Main pre-commit check
   */
  async run() {
    console.log('🔧 NYLA Pre-commit: Checking Knowledge Base changes...');
    
    try {
      // Check what's staged
      const staged = await this.checkStagedFiles();
      
      if (!staged.hasKBFiles) {
        console.log('✅ No KB files changed - skipping embedding regeneration');
        return 0;
      }
      
      console.log(`📝 KB files staged: ${staged.stagedKBFiles.join(', ')}`);
      
      // Check for actual content changes
      const changeCheck = await this.checkForChanges();
      
      if (!changeCheck.hasChanges) {
        console.log('✅ KB files staged but content unchanged - skipping regeneration');
        await this.saveHashes(changeCheck.current);
        return 0;
      }
      
      console.log('📋 Knowledge Base content changes detected:');
      for (const change of changeCheck.changes) {
        console.log(`  • ${change.file}: ${change.oldHash} → ${change.newHash}`);
      }
      
      // Ask user if they want to regenerate (in interactive mode)
      if (process.env.NYLA_AUTO_REGENERATE !== 'true') {
        const readline = require('readline');
        const rl = readline.createInterface({
          input: process.stdin,
          output: process.stdout
        });
        
        const answer = await new Promise(resolve => {
          rl.question('\n❓ Knowledge Base changed. Regenerate embeddings? (y/n) [y]: ', resolve);
        });
        rl.close();
        
        if (answer.toLowerCase().trim() === 'n') {
          console.log('⏭️  Skipping embedding regeneration (manual regeneration required)');
          await this.saveHashes(changeCheck.current);
          return 0;
        }
      }
      
      // Regenerate embeddings
      const success = await this.regenerateEmbeddings();
      
      if (!success) {
        console.error('\n❌ Embedding regeneration failed!');
        console.error('💡 Options:');
        console.error('   1. Fix the error and try again');
        console.error('   2. Skip with: NYLA_SKIP_EMBEDDINGS=true git commit');
        console.error('   3. Run manually later: npm run build:embeddings');
        return 1;
      }
      
      // Update stored hashes
      await this.saveHashes(changeCheck.current);
      
      console.log('\n✅ Knowledge Base embeddings regenerated successfully!');
      console.log('📦 Generated files have been staged for commit');
      
      return 0;
      
    } catch (error) {
      console.error('\n❌ Pre-commit check failed:', error);
      return 1;
    }
  }
}

// Skip if environment variable is set
if (process.env.NYLA_SKIP_EMBEDDINGS === 'true') {
  console.log('⏭️  Skipping embedding check (NYLA_SKIP_EMBEDDINGS=true)');
  process.exit(0);
}

// Run the checker
const checker = new KBChangeChecker();
checker.run().then(exitCode => {
  process.exit(exitCode);
}).catch(error => {
  console.error('💥 Unexpected error:', error);
  process.exit(1);
});