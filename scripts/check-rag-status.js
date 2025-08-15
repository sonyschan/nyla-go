#!/usr/bin/env node

/**
 * NYLA Go RAG Status Checker
 * Checks the current status of the RAG system and embeddings
 */

const fs = require('fs');
const path = require('path');

// Colors for console output
const colors = {
    reset: '\x1b[0m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
    console.log(colors[color] + message + colors.reset);
}

function checkFileExists(filePath) {
    return fs.existsSync(filePath);
}

function getFileStats(filePath) {
    if (!fs.existsSync(filePath)) return null;
    const stats = fs.statSync(filePath);
    return {
        size: stats.size,
        modified: stats.mtime,
        sizeFormatted: formatBytes(stats.size)
    };
}

function formatBytes(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

function checkRAGSystem() {
    log('🤖 NYLA Go RAG System Status Check', 'blue');
    log('====================================', 'blue');
    
    const ragFiles = [
        'pwa/js/rag/nyla-embedding-service.js',
        'pwa/js/rag/nyla-vector-db.js', 
        'pwa/js/rag/nyla-retriever.js',
        'pwa/js/rag/nyla-context-builder.js',
        'pwa/js/rag/nyla-kb-version-manager.js',
        'pwa/js/rag/nyla-deduplication-service.js',
        'pwa/js/rag/nyla-mmr-reranker.js',
        'pwa/js/rag/nyla-clustering-service.js',
        'pwa/js/rag/nyla-compression-service.js',
        'pwa/js/rag/nyla-content-filter.js'
    ];
    
    let allPresent = true;
    log('\n📁 RAG System Files:');
    
    for (const file of ragFiles) {
        if (checkFileExists(file)) {
            log(`  ✅ ${file}`, 'green');
        } else {
            log(`  ❌ ${file}`, 'red');
            allPresent = false;
        }
    }
    
    // Check knowledge base files
    log('\n📚 Knowledge Base Files:');
    const kbFiles = [
        'nylago-ui-data.js',
        'pwa/js/nyla-knowledge-base.js'
    ];
    
    for (const file of kbFiles) {
        const stats = getFileStats(file);
        if (stats) {
            log(`  ✅ ${file} (${stats.sizeFormatted}, modified: ${stats.modified.toISOString().split('T')[0]})`, 'green');
        } else {
            log(`  ❌ ${file}`, 'red');
        }
    }
    
    // Check vector database
    log('\n🗄️ Vector Database:');
    const vectorDB = 'pwa/data/nyla-vector-db.json';
    const vectorStats = getFileStats(vectorDB);
    
    if (vectorStats) {
        log(`  ✅ ${vectorDB}`, 'green');
        log(`  📊 Size: ${vectorStats.sizeFormatted}`, 'cyan');
        log(`  📅 Modified: ${vectorStats.modified.toISOString()}`, 'cyan');
        
        // Try to read and analyze the vector DB
        try {
            const vectorData = JSON.parse(fs.readFileSync(vectorDB, 'utf8'));
            log(`  🧩 Chunks: ${vectorData.chunks ? vectorData.chunks.length : 'unknown'}`, 'cyan');
            log(`  🏷️ Version: ${vectorData.version || 'unknown'}`, 'cyan');
            
            if (vectorData.metadata) {
                log(`  🔧 Embedding Model: ${vectorData.metadata.embedding_model || 'unknown'}`, 'cyan');
                log(`  📏 Dimensions: ${vectorData.metadata.embedding_dimension || 'unknown'}`, 'cyan');
            }
        } catch (error) {
            log(`  ⚠️ Error reading vector DB: ${error.message}`, 'yellow');
        }
    } else {
        log(`  ❌ ${vectorDB} not found`, 'red');
        log('  🔧 Run: npm run build:embeddings', 'yellow');
    }
    
    // Check for rebuild reminder
    log('\n🔔 Rebuild Status:');
    if (checkFileExists('.kb-rebuild-needed')) {
        log('  🚨 RAG REBUILD REQUIRED', 'red');
        try {
            const reminderContent = fs.readFileSync('.kb-rebuild-needed', 'utf8');
            const lines = reminderContent.split('\n');
            for (const line of lines) {
                if (line.includes('CHANGED_FILES')) {
                    const files = line.split("'")[1];
                    log(`  📝 Changed files: ${files}`, 'yellow');
                } else if (line.includes('TIMESTAMP')) {
                    const timestamp = line.split("'")[1];
                    log(`  ⏰ Detected: ${timestamp}`, 'yellow');
                }
            }
        } catch (error) {
            log(`  ⚠️ Error reading rebuild reminder: ${error.message}`, 'yellow');
        }
        
        log('\n  🔧 ACTION REQUIRED:', 'red');
        log('    npm run build:embeddings', 'green');
        log('    git add pwa/data/nyla-vector-db.json', 'green');
        log('    git commit -m "Update RAG embeddings for KB changes"', 'green');
        log('    rm .kb-rebuild-needed', 'green');
    } else {
        log('  ✅ No rebuild required', 'green');
    }
    
    // Overall status
    log('\n🎯 Overall RAG Status:', 'blue');
    if (allPresent && vectorStats && !checkFileExists('.kb-rebuild-needed')) {
        log('  🟢 HEALTHY - RAG system ready', 'green');
    } else if (allPresent && vectorStats) {
        log('  🟡 NEEDS ATTENTION - Rebuild required', 'yellow');
    } else {
        log('  🔴 CRITICAL - Missing components', 'red');
    }
    
    // Performance guidelines
    log('\n📊 Performance Guidelines:', 'cyan');
    log('  • Vector DB size: 5-15MB optimal', 'cyan');
    log('  • Chunk count: 50-200 optimal range', 'cyan');
    log('  • Rebuild after: Any KB file changes', 'cyan');
    log('  • Query response: Target < 2 seconds', 'cyan');
}

// Run the check
checkRAGSystem();