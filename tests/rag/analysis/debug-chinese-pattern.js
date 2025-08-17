// Debug the Chinese pattern matching issue

const query = "請給我旺柴的社運連結";
const pattern = /(social|links|follow|contact|community|channels|where.*find|join.*community|official.*links|twitter|telegram|x\.com|linktree|x.*account|twitter.*account|社交|社区|联系|关注|加入|联系方式|官方.*账户|官方.*渠道|如何.*联系|在哪.*找到|怎么.*联系)/i;

console.log('Query:', query);
console.log('Pattern test result:', pattern.test(query));

// Test individual parts
const parts = ['社交', '社区', '联系', '关注', '加入', '联系方式', '官方', '账户', '官方渠道', '如何联系', '在哪找到', '怎么联系'];
parts.forEach(part => {
  console.log(`"${part}" in query:`, query.includes(part));
});

// The issue might be Traditional vs Simplified Chinese
console.log('\nTraditional vs Simplified:');
console.log('社運 (traditional) vs 社区 (simplified)');
console.log('連結 (traditional) vs 链接/联系 (simplified)');

// Test if we need traditional Chinese patterns
const traditionalPatterns = ['社運', '連結', '聯絡', '官方', '帳戶', '渠道'];
traditionalPatterns.forEach(pattern => {
  console.log(`"${pattern}" in query:`, query.includes(pattern));
});