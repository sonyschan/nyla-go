#!/usr/bin/env node

/**
 * NYLA KB Summary Validator & Auto-fixer
 * Ensures all chunks have summary_en and summary_zh fields
 * Can generate missing summaries using template-based approach
 */

const fs = require('fs').promises;
const path = require('path');

class SummaryValidator {
  constructor(options = {}) {
    this.options = {
      autoFix: options.autoFix || false,
      dryRun: options.dryRun || false,
      useTranslation: options.useTranslation || true,
      maxSummaryLength: {
        en: 100, // words
        zh: 100  // characters
      },
      ...options
    };
    
    this.stats = {
      totalChunks: 0,
      missingEnglish: 0,
      missingChinese: 0,
      fixed: 0,
      errors: []
    };
  }

  /**
   * Scan all KB files for missing summaries
   */
  async validateKnowledgeBase() {
    console.log('🔍 Scanning KB files for missing summaries...\n');
    
    const kbPath = path.join(process.cwd(), 'pwa/kb');
    await this.scanDirectory(kbPath);
    
    this.printReport();
    
    if (this.stats.missingEnglish > 0 || this.stats.missingChinese > 0) {
      if (this.options.autoFix) {
        console.log('\n🔧 Auto-fixing missing summaries...');
        await this.fixMissingSummaries();
      } else {
        console.log('\n💡 Run with --fix to automatically generate missing summaries');
        return false;
      }
    }
    
    return true;
  }

  /**
   * Recursively scan directory for JSON files
   */
  async scanDirectory(dirPath) {
    try {
      const entries = await fs.readdir(dirPath, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(dirPath, entry.name);
        
        if (entry.isDirectory()) {
          await this.scanDirectory(fullPath);
        } else if (entry.name.endsWith('.json') && entry.name !== 'schema.json') {
          await this.validateFile(fullPath);
        }
      }
    } catch (error) {
      console.error(`❌ Error scanning directory ${dirPath}:`, error.message);
    }
  }

  /**
   * Validate a single JSON file
   */
  async validateFile(filePath) {
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      const data = JSON.parse(content);
      
      if (data.chunks && Array.isArray(data.chunks)) {
        for (let i = 0; i < data.chunks.length; i++) {
          const chunk = data.chunks[i];
          this.stats.totalChunks++;
          
          const issues = this.validateChunk(chunk, filePath, i);
          if (issues.length > 0) {
            this.stats.errors.push({
              file: filePath,
              chunkIndex: i,
              chunkId: chunk.id,
              issues: issues,
              chunk: chunk
            });
          }
        }
      }
    } catch (error) {
      console.error(`❌ Error validating ${filePath}:`, error.message);
    }
  }

  /**
   * Validate individual chunk
   */
  validateChunk(chunk, filePath, index) {
    const issues = [];
    
    if (!chunk.summary_en) {
      issues.push('missing_summary_en');
      this.stats.missingEnglish++;
    } else {
      // Validate English summary length
      const wordCount = chunk.summary_en.split(/\s+/).length;
      if (wordCount > this.options.maxSummaryLength.en) {
        issues.push(`summary_en_too_long:${wordCount}words`);
      }
    }
    
    if (!chunk.summary_zh) {
      issues.push('missing_summary_zh');
      this.stats.missingChinese++;
    } else {
      // Validate Chinese summary length
      const charCount = [...chunk.summary_zh].length;
      if (charCount > this.options.maxSummaryLength.zh) {
        issues.push(`summary_zh_too_long:${charCount}chars`);
      }
    }
    
    return issues;
  }

  /**
   * Generate missing summaries
   */
  async fixMissingSummaries() {
    const filesToFix = new Map();
    
    // Group fixes by file
    for (const error of this.stats.errors) {
      if (!filesToFix.has(error.file)) {
        filesToFix.set(error.file, []);
      }
      filesToFix.get(error.file).push(error);
    }
    
    // Process each file
    for (const [filePath, errors] of filesToFix.entries()) {
      await this.fixFile(filePath, errors);
    }
  }

  /**
   * Fix summaries in a single file
   */
  async fixFile(filePath, errors) {
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      const data = JSON.parse(content);
      
      let modified = false;
      
      for (const error of errors) {
        const chunk = data.chunks[error.chunkIndex];
        
        for (const issue of error.issues) {
          if (issue === 'missing_summary_en') {
            chunk.summary_en = this.generateEnglishSummary(chunk);
            modified = true;
            this.stats.fixed++;
            console.log(`  ✅ Generated summary_en for ${chunk.id}`);
          } else if (issue === 'missing_summary_zh') {
            chunk.summary_zh = this.generateChineseSummary(chunk);
            modified = true;
            this.stats.fixed++;
            console.log(`  ✅ Generated summary_zh for ${chunk.id}`);
          }
        }
      }
      
      if (modified && !this.options.dryRun) {
        // Write back to file with proper formatting
        const updatedContent = JSON.stringify(data, null, 2);
        await fs.writeFile(filePath, updatedContent, 'utf-8');
        console.log(`📝 Updated ${path.relative(process.cwd(), filePath)}`);
      }
      
    } catch (error) {
      console.error(`❌ Error fixing ${filePath}:`, error.message);
    }
  }

  /**
   * Generate English summary from chunk content
   */
  generateEnglishSummary(chunk) {
    const { title, body, type, tags = [], entity, capabilities = [] } = chunk;
    
    // Different strategies based on chunk type
    switch (type) {
      case 'integration':
        if (entity && capabilities.length > 0) {
          return `${entity} integration supporting ${capabilities.slice(0, 3).join(', ')} with verified functionality.`;
        }
        return `Integration supporting ${tags.filter(t => !['facts', 'support', 'verified'].includes(t)).slice(0, 3).join(', ')} capabilities.`;
        
      case 'facts':
        const firstSentence = this.extractFirstSentence(body);
        return this.truncateToWords(firstSentence, 20) + (firstSentence.length > 100 ? '...' : '');
        
      case 'howto':
        if (chunk.steps && chunk.steps.length > 0) {
          return `Step-by-step guide: ${title} (${chunk.steps.length} steps)` + (chunk.estimated_time ? ` - ${chunk.estimated_time}` : '');
        }
        return `Step-by-step guide: ${title}` + (body ? ` - ${this.truncateToWords(body, 15)}` : '');
        
      case 'policy':
        return `Policy guideline: ${title}` + (body ? ` - ${this.truncateToWords(body, 15)}` : '');
        
      case 'ecosystem':
        if (tags.includes('campaign')) {
          return `Campaign: ${title} featuring collaborative initiatives and partnerships.`;
        } else if (tags.includes('partner')) {
          return `Partnership profile: ${title} with collaboration details and relationship information.`;
        }
        return `Ecosystem information: ${title}`;
        
      case 'marketing':
        return `Marketing content: ${title}` + (chunk.verified ? ' (verified information)' : ' (unverified claims)');
        
      default:
        const fallbackSummary = title || this.extractFirstSentence(body);
        return this.truncateToWords(fallbackSummary, 20);
    }
  }

  /**
   * Generate Chinese summary from chunk content
   */
  generateChineseSummary(chunk) {
    const { title, type, tags = [], entity, capabilities = [] } = chunk;
    
    // Basic translation patterns
    const translations = {
      'integration': '整合',
      'wallet': '錢包',
      'dex': '去中心化交易所',
      'blockchain': '區塊鏈',
      'transfer': '轉帳',
      'support': '支援',
      'live': '已上線',
      'verified': '已驗證',
      'campaign': '活動',
      'partnership': '合作夥伴關係',
      'facts': '事實信息',
      'howto': '操作指南',
      'policy': '政策指南',
      'troubleshooting': '故障排除',
      'about': '關於信息'
    };
    
    switch (type) {
      case 'integration':
        if (entity) {
          const translatedCapabilities = capabilities.slice(0, 2).map(cap => 
            translations[cap] || cap
          ).join('、');
          return `${entity}整合，支援${translatedCapabilities}功能。`;
        }
        return `整合服務，支援多項區塊鏈功能。`;
        
      case 'facts':
        return `事實信息：${title || '重要區塊鏈資料'}。`;
        
      case 'howto':
        if (chunk.steps && chunk.steps.length > 0) {
          return `操作指南：${title || '詳細步驟說明'}（${chunk.steps.length}個步驟）。`;
        }
        return `操作指南：${title || '詳細步驟說明'}。`;
        
      case 'policy':
        return `政策指南：${title || '重要規定說明'}。`;
        
      case 'ecosystem':
        if (tags.includes('campaign')) {
          return `生態系統活動：${title || '合作推廣計劃'}。`;
        } else if (tags.includes('partner')) {
          return `合作夥伴：${title || '戰略夥伴關係'}。`;
        }
        return `生態系統信息：${title || '相關內容'}。`;
        
      case 'marketing':
        return `營銷內容：${title || '品牌相關信息'}。`;
        
      default:
        return `相關信息：${title || '詳細內容說明'}。`;
    }
  }

  /**
   * Extract first sentence from text
   */
  extractFirstSentence(text) {
    if (!text) return '';
    const sentences = text.match(/[^.!?]+[.!?]+/g);
    return sentences ? sentences[0].trim() : text.substring(0, 100);
  }

  /**
   * Truncate text to word count
   */
  truncateToWords(text, maxWords) {
    if (!text) return '';
    const words = text.split(/\s+/);
    return words.length > maxWords ? words.slice(0, maxWords).join(' ') : text;
  }

  /**
   * Print validation report
   */
  printReport() {
    console.log('📊 Summary Validation Report');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`Total chunks: ${this.stats.totalChunks}`);
    console.log(`Missing summary_en: ${this.stats.missingEnglish}`);
    console.log(`Missing summary_zh: ${this.stats.missingChinese}`);
    
    if (this.stats.errors.length > 0) {
      console.log(`\n❌ Issues found in ${this.stats.errors.length} chunks:`);
      
      const fileGroups = new Map();
      for (const error of this.stats.errors) {
        const relativePath = path.relative(process.cwd(), error.file);
        if (!fileGroups.has(relativePath)) {
          fileGroups.set(relativePath, []);
        }
        fileGroups.get(relativePath).push(error);
      }
      
      for (const [file, errors] of fileGroups.entries()) {
        console.log(`\n📄 ${file}:`);
        for (const error of errors) {
          console.log(`  → ${error.chunkId}: ${error.issues.join(', ')}`);
        }
      }
    } else {
      console.log('\n✅ All chunks have required summaries!');
    }
  }
}

// CLI usage
async function main() {
  const args = process.argv.slice(2);
  
  const options = {
    autoFix: args.includes('--fix'),
    dryRun: args.includes('--dry-run'),
    useTranslation: !args.includes('--no-translation')
  };
  
  if (args.includes('--help') || args.includes('-h')) {
    console.log(`
📚 NYLA KB Summary Validator

Usage:
  node scripts/validate-and-fix-summaries.js [options]

Options:
  --fix           Automatically generate missing summaries
  --dry-run       Show what would be changed without modifying files
  --no-translation Disable translation features
  --help, -h      Show this help message

Examples:
  node scripts/validate-and-fix-summaries.js              # Check only
  node scripts/validate-and-fix-summaries.js --fix        # Fix missing summaries
  node scripts/validate-and-fix-summaries.js --dry-run    # Preview changes
`);
    return;
  }
  
  const validator = new SummaryValidator(options);
  
  try {
    const success = await validator.validateKnowledgeBase();
    
    if (options.autoFix && validator.stats.fixed > 0) {
      console.log(`\n🎉 Fixed ${validator.stats.fixed} missing summaries!`);
      console.log('💡 Run the validation again to confirm all issues are resolved.');
    }
    
    process.exit(success ? 0 : 1);
    
  } catch (error) {
    console.error('❌ Validation failed:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = SummaryValidator;