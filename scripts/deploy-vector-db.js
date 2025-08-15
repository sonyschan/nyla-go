#!/usr/bin/env node
/**
 * Deploy Vector DB Script
 * Builds embeddings and creates production distribution files
 */

const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');
const zlib = require('zlib');

class VectorDBDeployer {
  constructor() {
    this.projectRoot = path.resolve(__dirname, '..');
    this.outputDir = path.join(this.projectRoot, 'pwa');
    this.buildScript = path.join(this.projectRoot, 'pwa/js/rag/build-embeddings.js');
  }

  /**
   * Main deployment process
   */
  async deploy() {
    console.log('🚀 NYLA Vector DB Deployment');
    console.log('=============================');
    
    try {
      // Step 1: Generate embeddings
      console.log('\n1. Generating embeddings...');
      await this.generateEmbeddings();
      
      // Step 2: Create version metadata
      console.log('\n2. Creating version metadata...');
      const versionInfo = await this.createVersionMetadata();
      
      // Step 3: Create distribution files
      console.log('\n3. Creating distribution files...');
      await this.createDistributionFiles(versionInfo);
      
      // Step 4: Generate deployment manifest
      console.log('\n4. Generating deployment manifest...');
      const manifest = await this.generateDeploymentManifest(versionInfo);
      
      console.log('\n✅ Vector DB deployment completed successfully!');
      console.log('\n📊 Deployment Summary:');
      console.log(`   Version: ${versionInfo.version}`);
      console.log(`   Hash: ${versionInfo.hash.substring(0, 16)}...`);
      console.log(`   Chunks: ${versionInfo.chunkCount}`);
      console.log(`   Files created: ${manifest.files.length}`);
      
      return manifest;
      
    } catch (error) {
      console.error('\n❌ Deployment failed:', error);
      throw error;
    }
  }

  /**
   * Generate embeddings using build script
   */
  async generateEmbeddings() {
    const { execSync } = require('child_process');
    
    try {
      // Change to project root for proper imports
      process.chdir(this.projectRoot);
      
      // Run embedding generation
      console.log('📦 Running embedding generation...');
      const output = execSync(`node "${this.buildScript}"`, {
        encoding: 'utf-8',
        stdio: 'pipe'
      });
      
      console.log('✅ Embedding generation completed');
      
      // Check if files were created
      const indexFile = path.join(this.outputDir, 'nyla-knowledge-index.json');
      const compressedFile = path.join(this.outputDir, 'nyla-knowledge-index.json.gz');
      
      const indexExists = await this.fileExists(indexFile);
      const compressedExists = await this.fileExists(compressedFile);
      
      if (!indexExists || !compressedExists) {
        throw new Error('Embedding files were not generated properly');
      }
      
      return { indexFile, compressedFile };
      
    } catch (error) {
      throw new Error(`Embedding generation failed: ${error.message}`);
    }
  }

  /**
   * Create version metadata file
   */
  async createVersionMetadata() {
    try {
      const indexFile = path.join(this.outputDir, 'nyla-knowledge-index.json');
      const indexContent = await fs.readFile(indexFile, 'utf-8');
      const indexData = JSON.parse(indexContent);
      
      // Generate content hash
      const hash = crypto.createHash('sha256').update(indexContent).digest('hex');
      
      // Get file sizes
      const indexStats = await fs.stat(indexFile);
      const compressedFile = path.join(this.outputDir, 'nyla-knowledge-index.json.gz');
      const compressedStats = await fs.stat(compressedFile);
      
      const versionInfo = {
        version: indexData.version || '1.0.0',
        hash,
        buildTime: new Date().toISOString(),
        chunkCount: indexData.chunks?.length || 0,
        embeddingModel: indexData.model?.name || 'multilingual-e5-base',
        embeddingDimension: indexData.model?.dimension || 768,
        files: {
          index: {
            path: 'nyla-knowledge-index.json',
            size: indexStats.size,
            sizeFormatted: this.formatBytes(indexStats.size)
          },
          compressed: {
            path: 'nyla-knowledge-index.json.gz', 
            size: compressedStats.size,
            sizeFormatted: this.formatBytes(compressedStats.size),
            compressionRatio: Math.round((1 - compressedStats.size / indexStats.size) * 100)
          }
        },
        deployment: {
          timestamp: new Date().toISOString(),
          environment: process.env.NODE_ENV || 'production',
          deployer: process.env.USER || 'unknown'
        }
      };
      
      // Write version file
      const versionFile = path.join(this.outputDir, 'nyla-knowledge-version.json');
      await fs.writeFile(versionFile, JSON.stringify(versionInfo, null, 2));
      
      console.log(`✅ Version metadata created: ${versionFile}`);
      return versionInfo;
      
    } catch (error) {
      throw new Error(`Version metadata creation failed: ${error.message}`);
    }
  }

  /**
   * Create distribution files with integrity checks
   */
  async createDistributionFiles(versionInfo) {
    try {
      const files = [];
      
      // Copy main files to distribution directory if needed
      const sourceFiles = [
        'nyla-knowledge-index.json',
        'nyla-knowledge-index.json.gz',
        'nyla-knowledge-version.json'
      ];
      
      for (const fileName of sourceFiles) {
        const sourceFile = path.join(this.outputDir, fileName);
        const exists = await this.fileExists(sourceFile);
        
        if (exists) {
          // Generate integrity hash
          const content = await fs.readFile(sourceFile);
          const hash = crypto.createHash('sha256').update(content).digest('hex');
          const stats = await fs.stat(sourceFile);
          
          files.push({
            name: fileName,
            path: sourceFile,
            size: stats.size,
            hash,
            lastModified: stats.mtime.toISOString()
          });
          
          console.log(`📋 ${fileName}: ${this.formatBytes(stats.size)} (${hash.substring(0, 16)}...)`);
        }
      }
      
      return files;
      
    } catch (error) {
      throw new Error(`Distribution file creation failed: ${error.message}`);
    }
  }

  /**
   * Generate deployment manifest
   */
  async generateDeploymentManifest(versionInfo) {
    try {
      const manifest = {
        name: 'NYLA Knowledge Base Vector DB',
        version: versionInfo.version,
        deployedAt: new Date().toISOString(),
        content: {
          hash: versionInfo.hash,
          chunkCount: versionInfo.chunkCount,
          embeddingModel: versionInfo.embeddingModel
        },
        distribution: {
          baseUrl: 'https://sonyschan.github.io/NYLAgo/pwa/',
          files: [
            {
              name: 'version',
              url: 'nyla-knowledge-version.json',
              description: 'Version metadata and update information'
            },
            {
              name: 'index',
              url: 'nyla-knowledge-index.json',
              description: 'Full vector database index (uncompressed)'
            },
            {
              name: 'compressed',
              url: 'nyla-knowledge-index.json.gz',
              description: 'Compressed vector database index (recommended)'
            }
          ]
        },
        updateInstructions: {
          automatic: 'Users with auto-update enabled will receive this update automatically',
          manual: 'Users can manually trigger update via: await nylaProductionSync.forceUpdate()',
          fallback: 'If update fails, users can clear local DB to force full rebuild'
        },
        compatibility: {
          minClientVersion: '2.1.10',
          embeddingModel: 'multilingual-e5-base',
          vectorDimension: 768
        }
      };
      
      // Write manifest
      const manifestFile = path.join(this.outputDir, 'nyla-vector-deployment.json');
      await fs.writeFile(manifestFile, JSON.stringify(manifest, null, 2));
      
      console.log(`✅ Deployment manifest created: ${manifestFile}`);
      return manifest;
      
    } catch (error) {
      throw new Error(`Manifest generation failed: ${error.message}`);
    }
  }

  /**
   * Utility: Check if file exists
   */
  async fileExists(filePath) {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Utility: Format bytes as human readable
   */
  formatBytes(bytes, decimals = 2) {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  }
}

// Run deployment if called directly
if (require.main === module) {
  const deployer = new VectorDBDeployer();
  deployer.deploy().then(() => {
    console.log('\n🎉 Deployment completed successfully!');
    process.exit(0);
  }).catch(error => {
    console.error('\n💥 Deployment failed:', error);
    process.exit(1);
  });
}

module.exports = VectorDBDeployer;