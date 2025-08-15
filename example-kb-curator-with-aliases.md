# Example: kb-curator with Proper Noun & Aliases Handling

This example demonstrates how the updated kb-curator subagent should handle new knowledge that contains proper nouns requiring cross-lingual alias handling.

## Example Input (User Request)

```
User: "Please add information about the new partnership between ChaiSwap and NYLA. 
ChaiSwap is a new DEX project by the team behind 旺柴 (WangChai). 
They launched on Solana with the ticker $CHAI. 
Their official handle is @ChaiSwap_Official and they support both English and Chinese communities.
The partnership includes joint AMAs and cross-promotion on social media."
```

## kb-curator Processing with Alias Handling

### Step 1: Identify Proper Nouns
✅ **Projects**: ChaiSwap, NYLA, WangChai, 旺柴
✅ **Networks**: Solana  
✅ **Token Symbols**: $CHAI
✅ **Social Handles**: @ChaiSwap_Official
✅ **Technical Terms**: DEX, AMA
✅ **Existing Entities**: WangChai (already in glossary)

### Step 2: Check Existing Glossary System
```javascript
// kb-curator checks: /pwa/js/rag/nyla-proper-noun-glossary.js
// Found: WangChai (旺柴) already exists with aliases
// New entities: ChaiSwap, $CHAI, @ChaiSwap_Official need alias consideration
```

### Step 3: Determine Alias Patterns

**ChaiSwap (NEW project):**
```json
{
  "zh": ["柴交换"], // Potential Chinese name if used
  "en": ["ChaiSwap", "Chai Swap", "Chai-Swap"],
  "social": ["@ChaiSwap_Official"],
  "variants": ["$CHAI", "CHAISWAP"]
}
```

**$CHAI Token:**
```json
{
  "en": ["CHAI", "ChaiSwap Token"],
  "variants": ["$CHAI", "CHAI", "chai"]
}
```

### Step 4: Create Knowledge Chunk with Aliases

```json
{
  "chunks": [
    {
      "id": "partnership_nyla_chaiswap",
      "source_id": "nyla_partnerships",
      "type": "ecosystem",
      "lang": "bilingual",
      "title": "NYLA x ChaiSwap Partnership & Collaboration",
      "section": "partnerships",
      "tags": [
        // Core entities with aliases
        "chaiswap", "chai-swap", "chai swap", "@ChaiSwap_Official",
        "nyla", "NYLA", "Agent NYLA",
        "wangchai", "旺柴", "旺柴项目",
        "solana", "索拉纳", "SOL",
        "$CHAI", "CHAI", "chai token",
        
        // Technical terms with aliases  
        "dex", "DEX", "decentralized exchange", "去中心化交易所",
        "ama", "AMA", "ask me anything", "问答",
        "partnership", "合作", "collaboration", "协作",
        "cross-promotion", "social media", "社交媒体"
      ],
      "as_of": "2025-08-15T15:30:00Z",
      "stability": "stable",
      "source_url": "internal://partnerships/chaiswap",
      "hash": "abc123def456",
      "body": "ChaiSwap Partnership Details: ChaiSwap is a new decentralized exchange (DEX) project launched by the team behind 旺柴 (WangChai). The project launched on Solana with the ticker symbol $CHAI. ChaiSwap maintains official presence through @ChaiSwap_Official and serves both English and Chinese speaking communities. NYLA has entered into a strategic partnership with ChaiSwap including joint AMA (Ask Me Anything) sessions and cross-promotion activities on social media platforms. This partnership strengthens NYLA's ecosystem connections and provides enhanced services to the community.",
      "summary_en": "NYLA partners with ChaiSwap, a new Solana DEX by the WangChai team, featuring joint AMAs and cross-promotion.",
      "summary_zh": "NYLA与ChaiSwap合作，这是旺柴团队在Solana上推出的新DEX，包括联合AMA和交叉推广。",
      "priority": 8,
      "related_chunks": ["wangchai_project_overview", "nyla_partnerships"],
      "glossary_terms": [
        // CRITICAL: All identified proper nouns and their aliases
        "ChaiSwap", "Chai-Swap", "Chai Swap", "@ChaiSwap_Official",
        "NYLA", "Agent NYLA", "奈拉",
        "WangChai", "旺柴", "旺柴项目",  
        "Solana", "索拉纳", "SOL",
        "$CHAI", "CHAI", "chai token",
        "DEX", "decentralized exchange", "去中心化交易所",
        "AMA", "Ask Me Anything", "问答", "问我任何事",
        "partnership", "合作", "collaboration"
      ]
    }
  ]
}
```

### Step 5: Cross-Lingual Query Testing

After adding this knowledge, test these queries:

**Chinese Queries Finding English Content:**
```
"柴交换项目" → Should find ChaiSwap content
"NYLA和旺柴团队的合作" → Should find ChaiSwap partnership 
"索拉纳上的DEX项目" → Should find ChaiSwap on Solana
```

**English Queries Finding Chinese Content:**
```  
"ChaiSwap partnership" → Should find content mentioning 旺柴 team
"WangChai DEX project" → Should find ChaiSwap information
"Solana CHAI token" → Should find both English and Chinese descriptions
```

**Social Handle Queries:**
```
"@ChaiSwap_Official" → Should find official channels
"ChaiSwap Official" → Should also find same content (without @)
```

### Step 6: Expected RAG Benefits

**Before Alias Handling:**
- Chinese user asking "柴交换合作" → No results (not in knowledge base)
- English user asking "ChaiSwap partnership" → Limited results
- Cross-reference between WangChai and ChaiSwap → Poor discovery

**After Alias Handling:**  
- Chinese user asking "柴交换合作" → Finds ChaiSwap partnership content
- English user asking "ChaiSwap partnership" → Finds content mentioning 旺柴 connection  
- Queries about NYLA, WangChai, ChaiSwap → All cross-reference correctly
- Social handle queries work both with and without @ prefix

## Key Success Metrics

✅ **Proper Noun Coverage**: All 6 identified entities have aliases  
✅ **Cross-lingual Discovery**: Chinese ↔ English queries find relevant content  
✅ **Social Handle Support**: @handle and handle variants both work  
✅ **Technical Term Aliases**: DEX, AMA expanded with translations  
✅ **Existing Entity Connection**: Links to existing WangChai knowledge  
✅ **No False Positives**: Chinese compound words kept intact  

## kb-curator Output

The updated kb-curator would output:

```json
{
  "classified": [{
    "id": "partnership_nyla_chaiswap", 
    "source_id": "nyla_partnerships", 
    "type": "ecosystem", 
    "path": "pwa/kb/ecosystem/partnerships/multi-chain/chaiswap.json"
  }],
  "created": ["pwa/kb/ecosystem/partnerships/multi-chain/chaiswap.json"],
  "updated": [],
  "chunks_added": ["partnership_nyla_chaiswap"],
  "embeddings_rebuilt": true,
  "vector_db_updated": true,
  "vector_db_path": "pwa/data/nyla-vector-db.json",
  "pwa_digest_check": "pass",
  "proper_noun_aliases_handled": {
    "identified_entities": ["ChaiSwap", "NYLA", "WangChai", "旺柴", "$CHAI", "@ChaiSwap_Official", "Solana", "DEX", "AMA"],
    "new_aliases_added": 15,
    "cross_lingual_pairs": 4,
    "social_handles": 1,
    "existing_entities_connected": ["WangChai"]
  },
  "cross_lingual_tests_passed": {
    "chinese_queries": ["柴交换合作", "旺柴团队DEX", "索拉纳CHAI代币"],
    "english_queries": ["ChaiSwap partnership", "WangChai DEX", "Solana CHAI token"],
    "all_successful": true
  },
  "notes": ["Cross-lingual alias handling enabled 25% more query matches"],
  "followups": ["Consider adding ChaiSwap to main proper noun glossary system"]
}
```

This example shows how the updated kb-curator systematically handles proper noun aliases for every new knowledge addition, ensuring cross-lingual discoverability and improved RAG performance.