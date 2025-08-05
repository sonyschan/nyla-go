#!/usr/bin/env node

/**
 * Performance Comparison: Playwright vs Puppeteer
 * Measures execution time, resource usage, and test reliability
 */

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const { performance } = require('perf_hooks');

class PerformanceComparison {
  constructor() {
    this.results = {
      playwright: null,
      puppeteer: null,
      comparison: null
    };
    this.iterations = 3; // Number of test runs for averaging
  }

  async measureCommand(command, args, options = {}) {
    return new Promise((resolve, reject) => {
      const startTime = performance.now();
      const startMemory = process.memoryUsage();
      
      console.log(`📊 Running: ${command} ${args.join(' ')}`);
      
      const childProcess = spawn(command, args, {
        stdio: 'pipe',
        ...options
      });

      let stdout = '';
      let stderr = '';
      
      childProcess.stdout.on('data', (data) => {
        stdout += data.toString();
      });
      
      childProcess.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      childProcess.on('close', (code) => {
        const endTime = performance.now();
        const endMemory = process.memoryUsage();
        const duration = endTime - startTime;
        
        const memoryDiff = {
          rss: endMemory.rss - startMemory.rss,
          heapUsed: endMemory.heapUsed - startMemory.heapUsed,
          heapTotal: endMemory.heapTotal - startMemory.heapTotal,
          external: endMemory.external - startMemory.external
        };

        resolve({
          exitCode: code,
          duration,
          memoryDiff,
          stdout,
          stderr
        });
      });

      childProcess.on('error', (error) => {
        reject(error);
      });
    });
  }

  async runPlaywrightTests() {
    console.log('\n🎭 Running Playwright Tests...');
    console.log('================================');
    
    const runs = [];
    
    for (let i = 0; i < this.iterations; i++) {
      console.log(`\n📊 Playwright Run ${i + 1}/${this.iterations}`);
      
      try {
        const result = await this.measureCommand('npx', ['playwright', 'test', 'tests/pwa/', '--reporter=json'], {
          timeout: 300000 // 5 minutes
        });
        
        // Parse test results from JSON output
        let testResults = null;
        try {
          const jsonMatch = result.stdout.match(/\{.*\}/s);
          if (jsonMatch) {
            testResults = JSON.parse(jsonMatch[0]);
          }
        } catch (parseError) {
          console.warn('Could not parse Playwright JSON output');
        }

        runs.push({
          duration: result.duration,
          exitCode: result.exitCode,
          memoryDiff: result.memoryDiff,
          testResults,
          success: result.exitCode === 0
        });
        
        console.log(`   ✅ Duration: ${Math.round(result.duration)}ms, Exit: ${result.exitCode}`);
        
      } catch (error) {
        console.error(`   ❌ Run ${i + 1} failed:`, error.message);
        runs.push({
          duration: 0,
          exitCode: 1,
          memoryDiff: { rss: 0, heapUsed: 0, heapTotal: 0, external: 0 },
          testResults: null,
          success: false,
          error: error.message
        });
      }
    }
    
    return this.calculateAverages(runs, 'Playwright');
  }

  async runPuppeteerTests() {
    console.log('\n🐕 Running Puppeteer Tests...');
    console.log('==============================');
    
    const runs = [];
    
    for (let i = 0; i < this.iterations; i++) {
      console.log(`\n📊 Puppeteer Run ${i + 1}/${this.iterations}`);
      
      try {
        const result = await this.measureCommand('node', ['tests/puppeteer/run-puppeteer-tests.js'], {
          timeout: 300000 // 5 minutes
        });
        
        runs.push({
          duration: result.duration,
          exitCode: result.exitCode,
          memoryDiff: result.memoryDiff,
          success: result.exitCode === 0
        });
        
        console.log(`   ✅ Duration: ${Math.round(result.duration)}ms, Exit: ${result.exitCode}`);
        
      } catch (error) {
        console.error(`   ❌ Run ${i + 1} failed:`, error.message);
        runs.push({
          duration: 0,
          exitCode: 1,
          memoryDiff: { rss: 0, heapUsed: 0, heapTotal: 0, external: 0 },
          success: false,
          error: error.message
        });
      }
    }
    
    return this.calculateAverages(runs, 'Puppeteer');
  }

  calculateAverages(runs, framework) {
    const successfulRuns = runs.filter(run => run.success);
    const failedRuns = runs.filter(run => !run.success);
    
    if (successfulRuns.length === 0) {
      return {
        framework,
        totalRuns: runs.length,
        successfulRuns: 0,
        failedRuns: failedRuns.length,
        reliability: 0,
        averageDuration: 0,
        minDuration: 0,
        maxDuration: 0,
        averageMemory: { rss: 0, heapUsed: 0, heapTotal: 0, external: 0 }
      };
    }

    const durations = successfulRuns.map(run => run.duration);
    const avgDuration = durations.reduce((sum, d) => sum + d, 0) / durations.length;
    const minDuration = Math.min(...durations);
    const maxDuration = Math.max(...durations);
    
    const avgMemory = {
      rss: successfulRuns.reduce((sum, run) => sum + run.memoryDiff.rss, 0) / successfulRuns.length,
      heapUsed: successfulRuns.reduce((sum, run) => sum + run.memoryDiff.heapUsed, 0) / successfulRuns.length,
      heapTotal: successfulRuns.reduce((sum, run) => sum + run.memoryDiff.heapTotal, 0) / successfulRuns.length,
      external: successfulRuns.reduce((sum, run) => sum + run.memoryDiff.external, 0) / successfulRuns.length
    };

    return {
      framework,
      totalRuns: runs.length,
      successfulRuns: successfulRuns.length,
      failedRuns: failedRuns.length,
      reliability: (successfulRuns.length / runs.length) * 100,
      averageDuration: avgDuration,
      minDuration,
      maxDuration,
      averageMemory: avgMemory,
      runs: runs
    };
  }

  generateComparison() {
    if (!this.results.playwright || !this.results.puppeteer) {
      throw new Error('Both framework results are required for comparison');
    }

    const pw = this.results.playwright;
    const pp = this.results.puppeteer;

    // Calculate performance differences
    const speedDifference = pw.averageDuration > 0 ? 
      ((pw.averageDuration - pp.averageDuration) / pw.averageDuration) * 100 : 0;
    
    const memoryDifference = {
      rss: pw.averageMemory.rss > 0 ? 
        ((pw.averageMemory.rss - pp.averageMemory.rss) / pw.averageMemory.rss) * 100 : 0,
      heapUsed: pw.averageMemory.heapUsed > 0 ? 
        ((pw.averageMemory.heapUsed - pp.averageMemory.heapUsed) / pw.averageMemory.heapUsed) * 100 : 0
    };

    return {
      winner: {
        speed: speedDifference > 0 ? 'Puppeteer' : 'Playwright',
        speedImprovement: Math.abs(speedDifference),
        memory: memoryDifference.rss > 0 ? 'Puppeteer' : 'Playwright',
        memoryImprovement: Math.abs(memoryDifference.rss),
        reliability: pw.reliability > pp.reliability ? 'Playwright' : 'Puppeteer'
      },
      metrics: {
        speedDifference,
        memoryDifference,
        reliabilityDifference: pw.reliability - pp.reliability
      }
    };
  }

  formatBytes(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(Math.abs(bytes)) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  formatDuration(ms) {
    if (ms < 1000) return `${Math.round(ms)}ms`;
    return `${(ms / 1000).toFixed(2)}s`;
  }

  printResults() {
    console.log('\n🏆 Performance Comparison Results');
    console.log('==================================\n');

    // Playwright Results
    if (this.results.playwright) {
      const pw = this.results.playwright;
      console.log('🎭 Playwright Results:');
      console.log(`   Runs: ${pw.successfulRuns}/${pw.totalRuns} successful (${pw.reliability.toFixed(1)}% reliability)`);
      console.log(`   Duration: ${this.formatDuration(pw.averageDuration)} avg (${this.formatDuration(pw.minDuration)}-${this.formatDuration(pw.maxDuration)} range)`);
      console.log(`   Memory: RSS ${this.formatBytes(pw.averageMemory.rss)}, Heap ${this.formatBytes(pw.averageMemory.heapUsed)}`);
    }

    // Puppeteer Results
    if (this.results.puppeteer) {
      const pp = this.results.puppeteer;
      console.log('\n🐕 Puppeteer Results:');
      console.log(`   Runs: ${pp.successfulRuns}/${pp.totalRuns} successful (${pp.reliability.toFixed(1)}% reliability)`);
      console.log(`   Duration: ${this.formatDuration(pp.averageDuration)} avg (${this.formatDuration(pp.minDuration)}-${this.formatDuration(pp.maxDuration)} range)`);
      console.log(`   Memory: RSS ${this.formatBytes(pp.averageMemory.rss)}, Heap ${this.formatBytes(pp.averageMemory.heapUsed)}`);
    }

    // Comparison
    if (this.results.comparison) {
      const comp = this.results.comparison;
      console.log('\n📊 Head-to-Head Comparison:');
      console.log(`   🏃 Speed Winner: ${comp.winner.speed} (${comp.winner.speedImprovement.toFixed(1)}% faster)`);
      console.log(`   🧠 Memory Winner: ${comp.winner.memory} (${comp.winner.memoryImprovement.toFixed(1)}% less usage)`);
      console.log(`   🎯 Reliability Winner: ${comp.winner.reliability}`);
      
      console.log('\n🔍 Detailed Metrics:');
      console.log(`   Speed Difference: ${comp.metrics.speedDifference.toFixed(1)}% (+ means Puppeteer faster)`);
      console.log(`   Memory Difference: ${comp.metrics.memoryDifference.rss.toFixed(1)}% (+ means Puppeteer uses less)`);
      console.log(`   Reliability Difference: ${comp.metrics.reliabilityDifference.toFixed(1)}% (+ means Playwright more reliable)`);
    }
  }

  async saveReport() {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const reportPath = path.join('test-results', 'reports', `performance-comparison-${timestamp}.json`);

    // Ensure directory exists
    const reportsDir = path.dirname(reportPath);
    if (!fs.existsSync(reportsDir)) {
      fs.mkdirSync(reportsDir, { recursive: true });
    }

    const report = {
      timestamp: new Date().toISOString(),
      iterations: this.iterations,
      results: this.results,
      environment: {
        node: process.version,
        platform: process.platform,
        arch: process.arch,
        memory: process.memoryUsage()
      }
    };

    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    console.log(`\n📄 Performance report saved: ${reportPath}`);
    return reportPath;
  }

  async run() {
    console.log('🚀 NYLA Go Performance Comparison');
    console.log('==================================');
    console.log(`Running ${this.iterations} iterations of each framework\n`);

    try {
      // Run Playwright tests
      this.results.playwright = await this.runPlaywrightTests();
      
      // Run Puppeteer tests
      this.results.puppeteer = await this.runPuppeteerTests();
      
      // Generate comparison
      this.results.comparison = this.generateComparison();
      
      // Print results
      this.printResults();
      
      // Save report
      await this.saveReport();
      
      console.log('\n🎉 Performance comparison completed successfully!');
      
    } catch (error) {
      console.error('💥 Performance comparison failed:', error.message);
      process.exit(1);
    }
  }
}

// Run if called directly
if (require.main === module) {
  const comparison = new PerformanceComparison();
  comparison.run().catch(error => {
    console.error('💥 Unhandled error:', error);
    process.exit(1);
  });
}

module.exports = { PerformanceComparison };