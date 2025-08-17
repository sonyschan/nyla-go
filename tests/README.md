# NYLA Go Test Suite

This directory contains all test files for the NYLA Go project, organized by category.

## Directory Structure

### `/extension`
Chrome extension-specific tests including UI and functionality tests.

### `/i18n`
Internationalization and language-related tests.

### `/integration`
Integration tests for ecosystem routing, granular routing, and overall integration.

### `/llm`
Large Language Model tests including:
- Hosted LLM functionality
- Provider detection
- Repetition fixes
- Language-specific queries

### `/manual`
Manual test pages for:
- FAB (Floating Action Button) extension
- Gesture controls

### `/performance`
Performance benchmarks and comparison tests.

### `/puppeteer`
Automated browser tests using Puppeteer for PWA functionality.

### `/pwa`
Progressive Web App specific tests.

### `/rag`
Retrieval-Augmented Generation tests including:
- Core RAG functionality
- Semantic similarity
- Proper noun handling
- Pipeline integration

#### `/rag/analysis`
Debug and analysis scripts for:
- Chinese language processing
- Founder query analysis
- Team member detection
- Query pattern debugging

### `/ui`
User interface tests including URL button functionality.

## Running Tests

### JavaScript Tests
```bash
npm test
```

### Individual Test Files
```bash
node tests/rag/test-semantic-similarity.js
```

### HTML Test Pages
Open HTML files directly in browser or use a local server:
```bash
python -m http.server 8080
# Then navigate to http://localhost:8080/tests/[test-file].html
```

## Adding New Tests

When adding new test files:
1. Place them in the appropriate subdirectory
2. Use descriptive names with `test-` prefix
3. Include comments explaining the test purpose
4. Update this README if adding new categories

## Test Naming Convention

- `test-*.js` - Regular test files
- `debug-*.js` - Debugging scripts for specific issues  
- `find-*.js` - Scripts to find/analyze specific patterns
- `*.test.js` - Unit test files (Jest/Mocha compatible)
- `*.test.html` - Browser-based test pages