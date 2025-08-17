/**
 * Debug Founder Query Retrieval
 * Test why Chinese founder queries return partnership instead of team content
 */

const fs = require('fs');

// Load the vector database
const vectorDB = JSON.parse(fs.readFileSync('/Users/sonyschan/NYLAgo/pwa/data/nyla-vector-db.json', 'utf8'));

console.log('🔍 Debugging Founder Query Retrieval Issues\n');

// Find all team-related chunks
const teamChunks = vectorDB.chunks.filter(chunk => 
  chunk.metadata.category === 'team_nyla' || 
  chunk.metadata.section.includes('team') ||
  chunk.text.includes('founder') ||
  chunk.text.includes('創辦人') ||
  chunk.text.includes('shax_btc') ||
  chunk.text.includes('btcberries')
);

console.log(`📊 Found ${teamChunks.length} team-related chunks:`);
teamChunks.forEach(chunk => {
  console.log(`- Chunk ${chunk.id}: ${chunk.metadata.section} (${chunk.tokens} tokens)`);
  console.log(`  Text: ${chunk.text.substring(0, 100)}...`);
  console.log(`  Category: ${chunk.metadata.category}`);
  console.log('');
});

// Find partnership chunks that might interfere
const partnershipChunks = vectorDB.chunks.filter(chunk => 
  chunk.metadata.category === 'community_partnerships' ||
  chunk.text.includes('WangChai') ||
  chunk.text.includes('旺柴')
);

console.log(`🤝 Found ${partnershipChunks.length} partnership chunks:`);
partnershipChunks.forEach(chunk => {
  console.log(`- Chunk ${chunk.id}: ${chunk.metadata.section} (${chunk.tokens} tokens)`);
  console.log(`  Text: ${chunk.text.substring(0, 100)}...`);
  console.log(`  Category: ${chunk.metadata.category}`);
  console.log('');
});

// Test Chinese founder query terms
const chineseFounderTerms = ['創辦人', '创始人', '创办人', '团队', '團隊', 'NYLA创始人', 'NYLA創辦人'];

console.log('🇨🇳 Testing Chinese founder terms in chunk content:');
chineseFounderTerms.forEach(term => {
  const matchingChunks = vectorDB.chunks.filter(chunk => 
    chunk.text.includes(term)
  );
  console.log(`"${term}": ${matchingChunks.length} matches`);
  if (matchingChunks.length > 0) {
    matchingChunks.forEach(chunk => {
      console.log(`  - Chunk ${chunk.id}: ${chunk.metadata.section}`);
    });
  }
});

// Check if team chunks have proper Chinese content
console.log('\n📝 Analyzing team chunk content for Chinese terms:');
const founderChunk = teamChunks.find(chunk => chunk.metadata.section === 'about_team_nyla_founder');
if (founderChunk) {
  console.log('Found founder chunk:', founderChunk.id);
  console.log('Text content:', founderChunk.text);
  console.log('Contains 創辦人:', founderChunk.text.includes('創辦人'));
  console.log('Contains 创始人:', founderChunk.text.includes('创始人'));
  console.log('Contains founder:', founderChunk.text.includes('founder'));
} else {
  console.log('❌ No founder chunk found!');
}

// Test specific problematic chunk
const chunk120 = vectorDB.chunks.find(chunk => chunk.id === 'chunk_120');
if (chunk120) {
  console.log('\n🎯 Analyzing problematic chunk 120 (WangChai):');
  console.log('Category:', chunk120.metadata.category);
  console.log('Section:', chunk120.metadata.section);
  console.log('Text preview:', chunk120.text.substring(0, 200));
  console.log('Contains founder terms:', ['founder', '創辦人', '创始人'].some(term => chunk120.text.includes(term)));
}

console.log('\n🔍 Analysis complete. Check results above for the root cause.');