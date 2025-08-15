#!/usr/bin/env node

/**
 * Test granular ecosystem routing with network-specific directories
 */

// Import the updated content creator logic
function detectNetwork(tags) {
  const networkMap = {
    'solana': 'solana',
    'ethereum': 'ethereum', 
    'algorand': 'algorand',
    'polygon': 'polygon',
    'arbitrum': 'arbitrum',
    'optimism': 'optimism',
    'avalanche': 'avalanche'
  };
  
  for (const tag of tags) {
    if (networkMap[tag.toLowerCase()]) {
      return networkMap[tag.toLowerCase()];
    }
  }
  
  return null;
}

function slugify(text) {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function extractEntityName(title, tags) {
  const knownEntities = [
    'jupiter', 'uniswap', 'phantom', 'metamask', 'pera', 'backpack',
    'solana', 'ethereum', 'algorand', 'polygon', 'orca', 'raydium'
  ];
  
  for (const tag of tags) {
    if (knownEntities.includes(tag.toLowerCase())) {
      return tag.toLowerCase();
    }
  }
  
  const titleWords = title.toLowerCase().split(/\s+/);
  for (const word of titleWords) {
    const cleanWord = word.replace(/[^\w]/g, '');
    if (knownEntities.includes(cleanWord) || cleanWord.length > 3) {
      return cleanWord;
    }
  }
  
  return slugify(title).split('-')[0] || 'unknown';
}

function generateIntegrationFilename(chunk) {
  const { title, tags } = chunk;
  
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
  
  if (tags.includes('wallet')) {
    const walletName = extractEntityName(title, tags);
    return `${walletName}-wallet`;
  }
  if (tags.includes('dex') || tags.includes('exchange')) {
    const dexName = extractEntityName(title, tags);
    return `${dexName}-dex`;
  }
  if (tags.includes('protocol')) {
    const protocolName = extractEntityName(title, tags);
    return `${protocolName}-protocol`;
  }
  
  return slugify(title) || 'general-integration';
}

function generatePartnerFilename(chunk) {
  const { title, tags } = chunk;
  
  if (tags.includes('foundation') || title.toLowerCase().includes('foundation')) {
    if (tags.includes('solana') || title.toLowerCase().includes('solana')) {
      return 'solana-foundation';
    }
    if (tags.includes('algorand') || title.toLowerCase().includes('algorand')) {
      return 'algorand-foundation';
    }
    if (tags.includes('ethereum') || title.toLowerCase().includes('ethereum')) {
      return 'ethereum-foundation';
    }
    
    const foundationName = extractEntityName(title, tags);
    return `${foundationName}-foundation`;
  }
  
  const partnerName = extractEntityName(title, tags);
  return `${partnerName}-partnership`;
}

function generateCampaignFilename(chunk) {
  const { title, tags, as_of } = chunk;
  
  const date = new Date(as_of || Date.now());
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  
  let campaignName = '';
  
  // Priority order: specific events first, then generic patterns
  if (title.toLowerCase().includes('ethdenver')) {
    campaignName = 'ethdenver';
  } else if (title.toLowerCase().includes('breakpoint')) {
    campaignName = 'breakpoint';
  } else if (title.toLowerCase().includes('launch')) {
    campaignName = 'launch';
  } else if (title.toLowerCase().includes('hackathon')) {
    campaignName = 'hackathon';
  } else {
    campaignName = slugify(title).split('-')[0] || 'campaign';
  }
  
  const network = detectNetwork(tags);
  const networkPart = network ? `-${network}` : '';
  
  return `${year}-${month}-nyla-x${networkPart}-${campaignName}`;
}

function getTargetFile(chunk) {
  const { type } = chunk;
  const kbBasePath = '/pwa/kb';
  
  if (type !== 'ecosystem') {
    return 'Not ecosystem type';
  }
  
  const network = detectNetwork(chunk.tags);
  let dir, filename;
  
  if (chunk.tags.includes('integration') || chunk.tags.includes('protocol') || chunk.tags.includes('technical')) {
    dir = `ecosystem/integrations${network ? '/' + network : ''}`;
    filename = generateIntegrationFilename(chunk);
  } else if (chunk.tags.includes('partner') || chunk.tags.includes('partnership') || chunk.tags.includes('organization') || chunk.tags.includes('foundation')) {
    dir = `ecosystem/partners${network ? '/' + network : ''}`;
    filename = generatePartnerFilename(chunk);
  } else if (chunk.tags.includes('campaign') || chunk.tags.includes('marketing') || chunk.tags.includes('event')) {
    dir = 'ecosystem/campaigns';
    filename = generateCampaignFilename(chunk);
  } else {
    dir = `ecosystem/integrations${network ? '/' + network : ''}`;
    filename = 'general-integration';
  }
  
  return `${kbBasePath}/${dir}/${filename}.json`;
}

// Test cases matching your examples
const testCases = [
  {
    description: "Jupiter Routing Integration",
    chunk: {
      type: "ecosystem",
      title: "Jupiter DEX Routing Integration",
      tags: ["jupiter", "solana", "dex", "routing", "integration", "technical"],
      as_of: "2025-01-15"
    },
    expected: "/pwa/kb/ecosystem/integrations/solana/jupiter-routing.json"
  },
  {
    description: "Pera Wallet Integration",
    chunk: {
      type: "ecosystem",
      title: "Pera Wallet Integration for Algorand",
      tags: ["pera", "algorand", "wallet", "integration", "technical"],
      as_of: "2025-01-15"
    },
    expected: "/pwa/kb/ecosystem/integrations/algorand/pera-wallet.json"
  },
  {
    description: "Uniswap V3 Integration",
    chunk: {
      type: "ecosystem",
      title: "Uniswap V3 Protocol Integration",
      tags: ["uniswap", "ethereum", "dex", "v3", "integration", "technical"],
      as_of: "2025-01-15"
    },
    expected: "/pwa/kb/ecosystem/integrations/ethereum/uniswap-v3.json"
  },
  {
    description: "Solana Foundation Partnership",
    chunk: {
      type: "ecosystem",
      title: "Solana Foundation Strategic Partnership",
      tags: ["solana", "foundation", "partnership", "grants"],
      as_of: "2025-01-15"
    },
    expected: "/pwa/kb/ecosystem/partners/solana/solana-foundation.json"
  },
  {
    description: "Algorand Foundation Partnership",
    chunk: {
      type: "ecosystem",
      title: "Algorand Foundation Partnership",
      tags: ["algorand", "foundation", "partnership", "sustainability"],
      as_of: "2025-01-15"
    },
    expected: "/pwa/kb/ecosystem/partners/algorand/algorand-foundation.json"
  },
  {
    description: "Algorand Launch Campaign",
    chunk: {
      type: "ecosystem",
      title: "NYLA x Algorand Launch Campaign Q3 2025",
      tags: ["algorand", "launch", "campaign", "q3", "2025"],
      as_of: "2025-07-15"
    },
    expected: "/pwa/kb/ecosystem/campaigns/2025-07-nyla-x-algorand-launch.json"
  },
  {
    description: "ETHDenver Campaign",
    chunk: {
      type: "ecosystem",
      title: "ETHDenver 2025 Hackathon",
      tags: ["ethdenver", "campaign", "ethereum", "hackathon"],
      as_of: "2025-02-15"
    },
    expected: "/pwa/kb/ecosystem/campaigns/2025-02-nyla-x-ethereum-ethdenver.json"
  },
  {
    description: "MetaMask Wallet Integration",
    chunk: {
      type: "ecosystem",
      title: "MetaMask Wallet Integration",
      tags: ["metamask", "ethereum", "wallet", "integration", "technical"],
      as_of: "2025-01-15"
    },
    expected: "/pwa/kb/ecosystem/integrations/ethereum/metamask-wallet.json"
  }
];

console.log('🧪 Testing Granular Ecosystem Routing\n');

let passed = 0;
let failed = 0;

testCases.forEach((test, index) => {
  const result = getTargetFile(test.chunk);
  const success = result === test.expected;
  
  console.log(`${index + 1}. ${test.description}`);
  console.log(`   Input: ${test.chunk.title}`);
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
  console.log('🎉 All granular routing tests passed!');
  console.log('✅ Structure matches your preferred naming conventions');
} else {
  console.log('⚠️ Some tests failed - check routing logic');
}