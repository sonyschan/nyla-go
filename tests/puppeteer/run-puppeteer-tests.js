#!/usr/bin/env node

/**
 * Puppeteer Test Runner for NYLA Go PWA
 * Fast headless browser testing with performance benchmarks
 */

const { PuppeteerPWATests } = require('./pwa-functional.puppeteer');
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

class PuppeteerTestRunner {
  constructor() {
    this.serverProcess = null;
    this.testResults = null;
  }

  async startPWAServer() {
    return new Promise((resolve, reject) => {
      console.log('🌐 Starting PWA server on port 3000...');
      
      // Check if server is already running
      const checkServer = spawn('curl', ['-s', 'http://localhost:3000'], { 
        stdio: 'pipe' 
      });
      
      checkServer.on('close', (code) => {
        if (code === 0) {
          console.log('✅ PWA server already running');
          resolve();
        } else {
          // Start new server
          this.serverProcess = spawn('python3', ['-m', 'http.server', '3000'], {
            cwd: path.join(process.cwd(), 'pwa'),
            stdio: 'pipe'
          });

          // Wait for server to start
          setTimeout(() => {
            console.log('✅ PWA server started');
            resolve();
          }, 2000);

          this.serverProcess.on('error', (error) => {
            console.error('❌ Failed to start PWA server:', error.message);
            reject(error);
          });
        }
      });
    });
  }

  async stopPWAServer() {
    if (this.serverProcess) {
      console.log('🛑 Stopping PWA server...');
      this.serverProcess.kill();
      this.serverProcess = null;
    }
  }

  async ensureDirectories() {
    const dirs = [
      'test-results',
      'test-results/screenshots',
      'test-results/reports'
    ];

    for (const dir of dirs) {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    }
  }

  async saveReport(results) {
    const reportPath = path.join('test-results', 'reports', `puppeteer-report-${Date.now()}.json`);
    
    const report = {
      timestamp: new Date().toISOString(),
      framework: 'Puppeteer',
      browser: 'Chromium Headless',
      summary: {
        total: results.total,
        passed: results.passed,
        failed: results.failed,
        duration: results.duration,
        averageTestDuration: Math.round(results.duration / results.total)
      },
      tests: results.results.map(test => ({
        name: test.name,
        status: test.status,
        duration: test.duration,
        error: test.error || null
      }))
    };

    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    console.log(`📄 Report saved: ${reportPath}`);
    return reportPath;
  }

  async run() {
    console.log('🚀 NYLA Go Puppeteer Test Runner');
    console.log('=================================\n');

    try {
      // Setup
      await this.ensureDirectories();
      await this.startPWAServer();

      // Run tests
      const testSuite = new PuppeteerPWATests();
      this.testResults = await testSuite.runAllTests();

      // Save report
      await this.saveReport(this.testResults);

      // Cleanup
      await this.stopPWAServer();

      // Exit with appropriate code
      const exitCode = this.testResults.failed > 0 ? 1 : 0;
      console.log(`\n🏁 Test run completed with exit code: ${exitCode}`);
      process.exit(exitCode);

    } catch (error) {
      console.error('💥 Test runner failed:', error.message);
      await this.stopPWAServer();
      process.exit(1);
    }
  }
}

// Handle graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n⏹️ Shutting down test runner...');
  const runner = new PuppeteerTestRunner();
  await runner.stopPWAServer();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\n⏹️ Shutting down test runner...');
  const runner = new PuppeteerTestRunner();
  await runner.stopPWAServer();
  process.exit(0);
});

// Run if called directly
if (require.main === module) {
  const runner = new PuppeteerTestRunner();
  runner.run().catch(error => {
    console.error('💥 Unhandled error:', error);
    process.exit(1);
  });
}

module.exports = { PuppeteerTestRunner };