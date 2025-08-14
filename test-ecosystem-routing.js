#!/usr/bin/env node

/**
 * Test script to verify ecosystem routing logic
 */

// Mock the content creator's getTargetFile method
function getTargetFile(chunk) {
  const { type, section } = chunk;
  const kbBasePath = '/pwa/kb';
  
  const typeMap = {
    'facts': 'facts',
    'howto': 'howto',
    'policy': 'policy',
    'faq': 'faq',
    'troubleshooting': 'troubleshooting',
    'about': 'about',
    'ecosystem': 'ecosystem',
    'marketing': 'marketing'
  };
  
  let dir = typeMap[type] || 'misc';
  let filename = section || type;
  
  // Handle ecosystem subcategories
  if (type === 'ecosystem') {
    if (chunk.tags.includes('integration') || chunk.tags.includes('protocol') || chunk.tags.includes('technical')) {
      dir = 'ecosystem/integrations';
      filename = chunk.tags.includes('wallet') ? 'wallets' : 
                chunk.tags.includes('dex') ? 'exchanges' : 
                chunk.tags.includes('protocol') ? 'protocols' : 'integrations';
    } else if (chunk.tags.includes('partner') || chunk.tags.includes('partnership') || chunk.tags.includes('organization')) {
      dir = 'ecosystem/partners';
      filename = chunk.tags.includes('wallet') ? 'wallets' : 
                chunk.tags.includes('foundation') ? 'foundations' : 
                chunk.tags.includes('exchange') || chunk.tags.includes('dex') ? 'exchanges' :
                'organizations';
    } else if (chunk.tags.includes('campaign') || chunk.tags.includes('marketing') || chunk.tags.includes('event')) {
      dir = 'ecosystem/campaigns';
      filename = chunk.tags.includes('event') ? 'events' : 
                chunk.tags.includes('contest') ? 'contests' :
                'initiatives';
    } else {
      dir = 'ecosystem/integrations';
      filename = 'general';
    }
  }
  
  // Handle marketing subcategories
  if (type === 'marketing') {
    filename = chunk.tags.includes('brand') ? 'brand' :
              chunk.tags.includes('blog') ? 'blogs' :
              chunk.tags.includes('announcement') ? 'announcements' :
              chunk.tags.includes('pr') ? 'pr' : 'brand';
  }
  
  return `${kbBasePath}/${dir}/${filename}.json`;
}

// Test cases
const testCases = [
  {
    description: "Wallet Integration",
    chunk: {
      type: "ecosystem",
      tags: ["metamask", "wallet", "integration", "ethereum"],
      title: "MetaMask Integration"
    },
    expected: "/pwa/kb/ecosystem/integrations/wallets.json"
  },
  {
    description: "DEX Partnership", 
    chunk: {
      type: "ecosystem",
      tags: ["uniswap", "partnership", "dex", "organization"],
      title: "Uniswap Partnership"
    },
    expected: "/pwa/kb/ecosystem/partners/exchanges.json"
  },
  {
    description: "Foundation Partnership",
    chunk: {
      type: "ecosystem", 
      tags: ["solana", "foundation", "partner", "grants"],
      title: "Solana Foundation Grant"
    },
    expected: "/pwa/kb/ecosystem/partners/foundations.json"
  },
  {
    description: "Event Campaign",
    chunk: {
      type: "ecosystem",
      tags: ["ethdenver", "campaign", "event", "hackathon"],
      title: "ETHDenver Campaign"
    },
    expected: "/pwa/kb/ecosystem/campaigns/events.json"
  },
  {
    description: "Marketing Contest",
    chunk: {
      type: "ecosystem",
      tags: ["contest", "campaign", "giveaway"],
      title: "Community Contest"
    },
    expected: "/pwa/kb/ecosystem/campaigns/contests.json"
  },
  {
    description: "Brand Guidelines",
    chunk: {
      type: "marketing",
      tags: ["brand", "voice", "guidelines"],
      title: "Brand Voice"
    },
    expected: "/pwa/kb/marketing/brand.json"
  },
  {
    description: "Protocol Integration",
    chunk: {
      type: "ecosystem",
      tags: ["solana", "protocol", "integration", "technical"],
      title: "Solana Protocol Support"
    },
    expected: "/pwa/kb/ecosystem/integrations/protocols.json"
  }
];

console.log('🧪 Testing Ecosystem Routing Logic\n');

let passed = 0;
let failed = 0;

testCases.forEach((test, index) => {
  const result = getTargetFile(test.chunk);
  const success = result === test.expected;
  
  console.log(`${index + 1}. ${test.description}`);
  console.log(`   Input: ${test.chunk.type} + [${test.chunk.tags.join(', ')}]`);
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
  console.log('🎉 All ecosystem routing tests passed!');
} else {
  console.log('⚠️ Some tests failed - check routing logic');
}