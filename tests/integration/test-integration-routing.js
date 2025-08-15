#!/usr/bin/env node

/**
 * Test integration type routing (facts-grade canonical records)
 */

function detectNetwork(tags) {
  const networkMap = {
    'solana': 'solana',
    'ethereum': 'ethereum', 
    'algorand': 'algorand',
    'polygon': 'polygon'
  };
  
  for (const tag of tags) {
    if (networkMap[tag.toLowerCase()]) {
      return networkMap[tag.toLowerCase()];
    }
  }
  return null;
}

function extractChainFromEntity(chunk) {
  if (chunk.chain) {
    return chunk.chain.toLowerCase();
  }
  
  if (chunk.entity) {
    const entityLower = chunk.entity.toLowerCase();
    if (entityLower.includes('solana') || entityLower.includes('phantom')) return 'solana';
    if (entityLower.includes('ethereum') || entityLower.includes('metamask')) return 'ethereum';
    if (entityLower.includes('algorand') || entityLower.includes('pera')) return 'algorand';
  }
  
  if (chunk.title) {
    const titleLower = chunk.title.toLowerCase();
    if (titleLower.includes('solana')) return 'solana';
    if (titleLower.includes('ethereum')) return 'ethereum';
    if (titleLower.includes('algorand')) return 'algorand';
  }
  
  return null;
}

function generateIntegrationFilename(chunk) {
  const { title, tags, entity } = chunk;
  
  // Use entity name if available (new format)
  if (entity) {
    const entitySlug = entity.toLowerCase()
      .replace(/[^\w\s-]/g, '')
      .replace(/[\s_-]+/g, '-')
      .replace(/^-+|-+$/g, '');
    
    if (entity.toLowerCase().includes('uniswap')) {
      return title.toLowerCase().includes('v3') ? 'uniswap-v3' : 'uniswap-v2';
    }
    
    return entitySlug;
  }
  
  // Fallback to old logic
  if (tags.includes('jupiter') || title.toLowerCase().includes('jupiter')) {
    return 'jupiter-routing';
  }
  if (tags.includes('uniswap') || title.toLowerCase().includes('uniswap')) {
    return title.toLowerCase().includes('v3') ? 'uniswap-v3' : 'uniswap-v2';
  }
  if (tags.includes('pera') || title.toLowerCase().includes('pera')) {
    return 'pera-wallet';
  }
  if (tags.includes('phantom') || title.toLowerCase().includes('phantom')) {
    return 'phantom-wallet';
  }
  if (tags.includes('metamask') || title.toLowerCase().includes('metamask')) {
    return 'metamask-wallet';
  }
  
  return 'unknown-integration';
}

function getTargetFile(chunk) {
  const { type } = chunk;
  const kbBasePath = '/pwa/kb';
  
  if (type !== 'integration') {
    return 'Not integration type';
  }
  
  const network = detectNetwork(chunk.tags) || extractChainFromEntity(chunk);
  let dir, filename;
  
  if (network) {
    dir = `ecosystem/integrations/${network}`;
    filename = generateIntegrationFilename(chunk);
  } else {
    dir = 'ecosystem/integrations';
    filename = generateIntegrationFilename(chunk);
  }
  
  return `${kbBasePath}/${dir}/${filename}.json`;
}

// Test cases for integration type
const testCases = [
  {
    description: "New Format: Pera Wallet with entity field",
    chunk: {
      type: "integration",
      entity: "Pera Wallet",
      chain: "Algorand",
      title: "Pera Wallet Integration",
      tags: ["facts", "support", "algorand", "wallet"]
    },
    expected: "/pwa/kb/ecosystem/integrations/algorand/pera-wallet.json"
  },
  {
    description: "New Format: Jupiter with entity field", 
    chunk: {
      type: "integration",
      entity: "Jupiter",
      chain: "Solana", 
      title: "Jupiter DEX Aggregator",
      tags: ["facts", "support", "solana", "dex"]
    },
    expected: "/pwa/kb/ecosystem/integrations/solana/jupiter.json"
  },
  {
    description: "New Format: Uniswap V3 with entity field",
    chunk: {
      type: "integration", 
      entity: "Uniswap V3",
      chain: "Ethereum",
      title: "Uniswap V3 Protocol Integration",
      tags: ["facts", "support", "ethereum", "dex"]
    },
    expected: "/pwa/kb/ecosystem/integrations/ethereum/uniswap-v3.json"
  },
  {
    description: "Legacy Format: MetaMask from tags",
    chunk: {
      type: "integration",
      title: "MetaMask Wallet Integration", 
      tags: ["facts", "support", "metamask", "ethereum", "wallet"]
    },
    expected: "/pwa/kb/ecosystem/integrations/ethereum/metamask-wallet.json"
  },
  {
    description: "Network from title only",
    chunk: {
      type: "integration",
      title: "Algorand DEX Integration",
      tags: ["facts", "support", "dex"]
    },
    expected: "/pwa/kb/ecosystem/integrations/algorand/unknown-integration.json"
  },
  {
    description: "No network detected",
    chunk: {
      type: "integration", 
      title: "Generic Protocol Integration",
      tags: ["facts", "support"]
    },
    expected: "/pwa/kb/ecosystem/integrations/unknown-integration.json"
  }
];

console.log('🧪 Testing Integration Type Routing (Facts-Grade)\n');

let passed = 0;
let failed = 0;

testCases.forEach((test, index) => {
  const result = getTargetFile(test.chunk);
  const success = result === test.expected;
  
  console.log(`${index + 1}. ${test.description}`);
  if (test.chunk.entity) {
    console.log(`   Entity: ${test.chunk.entity} (${test.chunk.chain})`);
  } else {
    console.log(`   Title: ${test.chunk.title}`);
  }
  console.log(`   Tags: [${test.chunk.tags.join(', ')}]`);
  console.log(`   Expected: ${test.expected}`);
  console.log(`   Actual:   ${result}`);
  console.log(`   Status:   ${success ? '✅ PASS' : '❌ FAIL'}`);
  console.log('');
  
  if (success) {
    passed++;
  } else {
    failed++;
  }
});

console.log(`📊 Test Results: ${passed} passed, ${failed} failed`);

if (failed === 0) {
  console.log('🎉 All integration routing tests passed!');
  console.log('✅ Facts-grade canonical format is working correctly');
} else {
  console.log('⚠️ Some tests failed - check integration routing logic');
}