# Knowledge Base Version Management System

A comprehensive system to keep vector embeddings in sync with knowledge base updates, ensuring RAG responses are always accurate and up-to-date.

## 🎯 Problem Solved

**Issue**: When the knowledge base is updated but embeddings aren't regenerated, the RAG system:
- Returns outdated information
- Misses new content entirely  
- Gives inconsistent search results
- Fails to reflect recent changes

**Solution**: Automatic detection of KB changes and intelligent embedding regeneration.

## 🏗️ System Architecture

```
Knowledge Base Changes → Version Detection → Regeneration Decision → Update Embeddings
                                ↓
                       Multiple Detection Points:
                       ├── Pre-commit Hook (Git)
                       ├── Runtime Version Check (Browser)  
                       ├── Build Process Integration
                       └── Manual Trigger
```

## 🔧 Components

### 1. NYLAKBVersionManager
**Location**: `pwa/js/rag/nyla-kb-version-manager.js`

Core version tracking component that:
- Generates SHA-256 hashes of KB content
- Stores version metadata in IndexedDB
- Compares current vs stored versions
- Determines when rebuilding is needed

```javascript
// Initialize version manager
const versionManager = new NYLAKBVersionManager();
await versionManager.initialize();

// Check if rebuild needed
const check = await versionManager.needsRebuild(knowledgeBase, vectorStats);
if (check.needsRebuild) {
  console.log('Rebuild reasons:', check.reasons);
  // Trigger rebuild...
}
```

### 2. Pre-commit Hook System
**Location**: `.githooks/pre-commit` + `scripts/check-kb-changes.js`

Git integration that:
- Detects KB file changes in staged commits
- Prompts developer for regeneration approval
- Runs embedding generation automatically
- Stages generated files for commit

**Tracked Files**:
- `pwa/js/nyla-knowledge-base.js`
- `nylago-data.js` (if contains KB data)

### 3. Runtime Integration
**Location**: `pwa/js/rag/nyla-rag-pipeline.js`

Automatic runtime checking that:
- Checks version on RAG pipeline initialization
- Rebuilds index if KB version doesn't match
- Marks embeddings as up-to-date after successful builds
- Provides fallback if pre-commit was skipped

### 4. Build Process Integration
**Location**: `pwa/js/rag/build-embeddings.js`

Offline embedding generation script with:
- Full KB chunking and embedding
- Compressed index generation
- Version metadata inclusion
- Build-time optimization

## 🚀 Setup & Installation

### 1. Install Git Hooks

```bash
# Run the setup script
./scripts/setup-git-hooks.sh

# Or manually
cp .githooks/pre-commit .git/hooks/pre-commit
chmod +x .git/hooks/pre-commit
```

### 2. Verify Installation

```bash
# Test pre-commit hook
.git/hooks/pre-commit

# Check Node.js availability
node --version
```

### 3. Configure Environment

```bash
# Optional: Auto-regenerate without prompts
export NYLA_AUTO_REGENERATE=true

# Optional: Skip embedding checks  
export NYLA_SKIP_EMBEDDINGS=true
```

## 📋 Workflow Examples

### Typical Development Workflow

1. **Edit Knowledge Base**
   ```javascript
   // Update pwa/js/nyla-knowledge-base.js
   this.knowledgeBase.newFeature = {
     title: "New Feature",
     content: "Description of new feature..."
   };
   ```

2. **Commit Changes**
   ```bash
   git add pwa/js/nyla-knowledge-base.js
   git commit -m "Add new feature documentation"
   
   # Pre-commit hook runs automatically:
   # 🔍 Checking for knowledge base changes...
   # 📝 KB files staged: pwa/js/nyla-knowledge-base.js
   # 📋 Knowledge Base content changes detected:
   #   • pwa/js/nyla-knowledge-base.js: 8f3a2b1c → 9e4d5f6a
   # ❓ Knowledge Base changed. Regenerate embeddings? (y/n) [y]:
   ```

3. **Automatic Regeneration**
   ```bash
   # If you select 'y':
   # 🚀 Regenerating embeddings...
   # 📦 Running embedding generation...
   # ✅ Staged generated file: pwa/nyla-knowledge-index.json
   # ✅ Knowledge Base embeddings regenerated successfully!
   ```

### Emergency Scenarios

**Skip Regeneration (Urgent Commit)**:
```bash
NYLA_SKIP_EMBEDDINGS=true git commit -m "Urgent fix"
```

**Manual Regeneration Later**:
```bash
node pwa/js/rag/build-embeddings.js
git add pwa/nyla-knowledge-index.json*
git commit -m "Update embeddings for recent KB changes"
```

**Force Rebuild (Runtime)**:
```javascript
// Clear version tracking to force rebuild
await ragPipeline.versionManager.clearVersion();
await ragPipeline.buildIndex(knowledgeBase);
```

## 🔍 Version Detection Logic

### Hash-Based Change Detection

```javascript
// Current KB hash
const currentHash = await versionManager.generateKBHash(knowledgeBase);

// Stored hash from previous build
const stored = await versionManager.getStoredVersion();

// Compare
if (stored.hash !== currentHash) {
  // KB content changed - rebuild needed
}
```

### Rebuild Trigger Conditions

The system triggers rebuilding when:

1. **No Previous Version**: First time setup
2. **Content Hash Mismatch**: KB content changed
3. **Empty Vector DB**: No embeddings stored
4. **Version Schema Changes**: Incompatible versions

```javascript
const reasons = [
  'no_previous_version',     // First time
  'kb_content_changed',      // Hash mismatch  
  'empty_vector_db',         // No embeddings
  'vector_db_version_mismatch' // Schema change
];
```

### Version Metadata Storage

```javascript
{
  "id": "kb-version",
  "hash": "9e4d5f6a8b2c1d3f...",
  "vectorDBVersion": "1.0.0",
  "chunkCount": 847,
  "embeddingModel": "all-MiniLM-L6-v2",
  "embeddingDimension": 384,
  "generatedAt": "2024-01-15T10:30:00.000Z",
  "updatedAt": "2024-01-15T10:30:00.000Z"
}
```

## ⚙️ Configuration Options

### Pre-commit Hook Configuration

```bash
# Environment variables for pre-commit
export NYLA_SKIP_EMBEDDINGS=true      # Skip all embedding checks
export NYLA_AUTO_REGENERATE=true      # Auto-regenerate without prompts
```

### Version Manager Options

```javascript
const versionManager = new NYLAKBVersionManager();

// Custom tracked files
versionManager.trackedFiles = [
  'pwa/js/nyla-knowledge-base.js',
  'custom-data.js',
  'docs/knowledge.json'
];
```

### Runtime Pipeline Options

```javascript
const ragPipeline = new NYLARAGPipeline({
  // Skip version checking (not recommended)
  skipVersionCheck: false,
  
  // Force rebuild regardless of version
  forceRebuild: false
});
```

## 🧪 Testing & Debugging

### Test Version Detection

```javascript
// Enable debug mode
localStorage.setItem('nyla-rag-debug', 'true');

// Check version status
const versionManager = new NYLAKBVersionManager();
await versionManager.initialize();

const info = await versionManager.getVersionInfo();
console.log('Version info:', info);

// Test rebuild check
const check = await versionManager.needsRebuild(knowledgeBase, vectorStats);
console.log('Rebuild check:', check);
```

### Test Pre-commit Hook

```bash
# Test hook directly
.git/hooks/pre-commit

# Test with sample changes
echo "// Test change" >> pwa/js/nyla-knowledge-base.js
git add pwa/js/nyla-knowledge-base.js
git commit -m "Test commit"

# Clean up
git reset HEAD~1
git checkout -- pwa/js/nyla-knowledge-base.js
```

### Debug Build Process

```bash
# Run embedding build manually
node pwa/js/rag/build-embeddings.js

# Check generated files
ls -la pwa/nyla-knowledge-index.json*

# Verify content
head pwa/nyla-knowledge-index.json
```

## 📊 Performance Considerations

### Hash Generation Performance

- **SHA-256 hashing**: ~5-10ms for typical KB size
- **Cached in memory**: Subsequent checks are instant
- **IndexedDB storage**: Persistent across sessions

### Pre-commit Hook Impact

- **File checking**: ~100-200ms
- **Embedding generation**: 30-60 seconds (depending on KB size)  
- **Only runs when KB files are staged**: No impact on non-KB commits

### Runtime Version Checking

- **Version check**: ~10-20ms
- **Rebuild trigger**: Only when actually needed
- **Background processing**: Non-blocking initialization

## 🔧 Troubleshooting

### Common Issues

**1. Pre-commit Hook Not Running**
```bash
# Check hook exists and is executable
ls -la .git/hooks/pre-commit

# Re-run setup
./scripts/setup-git-hooks.sh
```

**2. Node.js Not Found**
```bash
# Install Node.js
# macOS: brew install node
# Ubuntu: sudo apt install nodejs npm

# Verify installation
node --version
```

**3. Embedding Generation Fails**
```bash
# Check for errors manually
node pwa/js/rag/build-embeddings.js

# Clear corrupted data
localStorage.removeItem('nyla-vector-db')
```

**4. Version Manager Not Working**
```javascript
// Clear version tracking
const versionManager = new NYLAKBVersionManager();
await versionManager.initialize();
await versionManager.clearVersion();
```

### Debug Mode

```javascript
// Enable comprehensive logging
localStorage.setItem('nyla-rag-debug', 'true');

// Check all version-related info
const ragPipeline = new NYLARAGPipeline();
await ragPipeline.initialize(knowledgeBase, llmEngine);

// View version manager state
console.log(await ragPipeline.versionManager.getVersionInfo());
```

## 📈 Monitoring & Metrics

### Version Tracking Metrics

```javascript
// Get version information
const versionInfo = await versionManager.getVersionInfo();
console.log({
  hasStoredVersion: versionInfo.hasStoredVersion,
  lastGenerated: versionInfo.stored?.generatedAt,
  chunkCount: versionInfo.stored?.chunkCount,
  modelUsed: versionInfo.stored?.embeddingModel
});
```

### Build Success Tracking

```bash
# Monitor pre-commit hook success
git log --oneline | grep "Update embeddings"

# Check generated file sizes  
ls -lh pwa/nyla-knowledge-index.json*
```

## 🚀 Best Practices

### For Developers

1. **Always Run Setup**: New developers should run `./scripts/setup-git-hooks.sh`
2. **Test Changes**: Test KB changes in development before committing
3. **Monitor File Sizes**: Large KB changes may significantly increase embedding generation time
4. **Use Environment Variables**: Set `NYLA_AUTO_REGENERATE=true` for CI/CD

### for CI/CD Integration

```yaml
# GitHub Actions example
- name: Setup Node.js
  uses: actions/setup-node@v3
  with:
    node-version: '18'

- name: Generate Embeddings
  run: |
    export NYLA_AUTO_REGENERATE=true
    node pwa/js/rag/build-embeddings.js
  
- name: Commit Generated Files
  run: |
    git add pwa/nyla-knowledge-index.json*
    git commit -m "Auto-generated embeddings" || exit 0
```

### For Production Deployments

1. **Pre-build Embeddings**: Generate embeddings during build process
2. **Compress Index Files**: Use `.gz` versions for faster loading
3. **Version Validation**: Verify KB-embedding version match in production
4. **Monitoring**: Track rebuild frequency and performance

## 📝 File Structure

```
NYLAgo/
├── .githooks/
│   └── pre-commit                          # Git pre-commit hook
├── scripts/
│   ├── setup-git-hooks.sh                  # Setup script
│   └── check-kb-changes.js                 # Pre-commit change checker
├── pwa/
│   ├── js/
│   │   ├── nyla-knowledge-base.js          # Main KB (tracked)
│   │   └── rag/
│   │       ├── nyla-kb-version-manager.js  # Version management
│   │       ├── build-embeddings.js         # Offline build script
│   │       └── nyla-rag-pipeline.js        # Runtime integration
│   ├── nyla-knowledge-index.json           # Generated embeddings
│   └── nyla-knowledge-index.json.gz        # Compressed version
└── nylago-data.js                          # Additional KB data (tracked)
```

## 🔮 Future Enhancements

### Planned Features

1. **Incremental Updates**: Only regenerate changed chunks
2. **Multi-file Tracking**: Support for additional KB sources
3. **Remote Storage**: Option to store embeddings remotely
4. **Performance Metrics**: Track regeneration frequency and impact
5. **Web UI**: Visual interface for version management

### Integration Opportunities

1. **GitHub Actions**: Automatic embedding generation on PR merge
2. **Build Pipeline**: Integration with existing build systems
3. **CDN Integration**: Serve pre-built embeddings from CDN
4. **Monitoring**: Alerts for version mismatches in production

---

**🎯 Result**: The knowledge base and vector embeddings stay perfectly synchronized, ensuring users always get accurate, up-to-date responses from the RAG system.