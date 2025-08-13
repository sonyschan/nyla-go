# 🌐 NYLA Ecosystem Knowledge Base

## Overview

The `/ecosystem/` directory contains **partnership, integration, and collaboration content** that is **technical and verifiable** in nature. This is distinct from marketing content which focuses on brand voice and narrative.

## Directory Structure

```
/ecosystem/
├── /integrations/     ← ✅ Technical, verifiable integrations
│   ├── /solana/
│   │   ├── jupiter-routing.json    → Jupiter DEX routing
│   │   ├── phantom-wallet.json     → Phantom wallet integration
│   │   └── orca-dex.json          → Orca DEX integration
│   ├── /ethereum/
│   │   ├── uniswap-v3.json        → Uniswap V3 protocol
│   │   ├── metamask-wallet.json   → MetaMask integration
│   │   └── 1inch-aggregator.json  → 1inch DEX aggregator
│   └── /algorand/
│       ├── pera-wallet.json       → Pera wallet integration
│       └── tinyman-dex.json       → Tinyman DEX integration
├── /partners/         ← 🤝 Organization profiles and relationships  
│   ├── /solana/
│   │   ├── solana-foundation.json → Solana Foundation partnership
│   │   └── phantom-labs.json      → Phantom Labs partnership
│   ├── /ethereum/
│   │   ├── ethereum-foundation.json → Ethereum Foundation
│   │   └── uniswap-labs.json       → Uniswap Labs partnership
│   └── /algorand/
│       └── algorand-foundation.json → Algorand Foundation
└── /campaigns/        ← 📢 Co-marketing and collaborative initiatives
    ├── 2025-07-nyla-x-algorand-launch.json → Algorand Q3 launch
    ├── 2025-02-nyla-x-ethereum-ethdenver.json → ETHDenver 2025
    └── 2024-11-nyla-x-solana-breakpoint.json → Breakpoint 2024
```

## Content Categories

### 🔧 **Integrations** (Technical Focus)
- **Purpose**: Document technical integrations and their capabilities
- **Content**: API integrations, SDK implementations, protocol connections
- **Verification**: Include `verification` metadata with test status
- **Examples**: 
  - Wallet connectivity (MetaMask, Phantom, Backpack)
  - Blockchain protocol integrations (Solana, Ethereum, Polygon)
  - DEX integrations (Uniswap, Jupiter, 1inch)

### 🤝 **Partners** (Relationship Focus) 
- **Purpose**: Document organizational partnerships and relationships
- **Content**: Partner profiles, collaboration details, contact information
- **Verification**: Include `partnership` metadata with status and terms
- **Examples**:
  - Solana Foundation grants and ecosystem support
  - Phantom wallet strategic partnership
  - Uniswap Labs protocol collaboration

### 📢 **Campaigns** (Initiative Focus)
- **Purpose**: Document co-marketing and collaborative initiatives
- **Content**: Campaign details, reach metrics, partnership outcomes
- **Verification**: Include `campaign` metadata with performance data
- **Examples**:
  - ETHDenver hackathon collaboration
  - Solana Breakpoint conference presence
  - Community contests and giveaways

## vs. Marketing Directory

| **Ecosystem** | **Marketing** |
|---------------|---------------|
| ✅ Technical integrations | ❌ Brand voice guidelines |
| ✅ Partnership profiles | ❌ Blog content |
| ✅ Verifiable relationships | ❌ Press releases |
| ✅ Co-marketing campaigns | ❌ Internal announcements |
| ✅ Collaboration outcomes | ❌ Thought leadership |

## Metadata Fields

### Integration Chunks
```json
{
  "verification": {
    "status": "verified|beta|deprecated",
    "last_tested": "2025-01-15",
    "supported_networks": ["solana", "ethereum"],
    "test_endpoints": ["https://api.mainnet..."]
  }
}
```

### Partnership Chunks
```json
{
  "partnership": {
    "type": "technical_integration|ecosystem_foundation|marketing",
    "status": "active|pending|ended", 
    "established": "2024-06-01",
    "contact": "partnerships@example.com"
  }
}
```

### Campaign Chunks
```json
{
  "campaign": {
    "type": "conference_presence|hackathon|contest",
    "status": "completed|ongoing|planned",
    "reach": "50000+",
    "budget": "confidential",
    "partners": ["Solana Foundation"]
  }
}
```

## Content Creation Guidelines

### For Integration Content:
- Focus on **technical capabilities**
- Include **verification status**
- Specify **supported features**
- Document **API/SDK details**

### For Partnership Content:
- Describe **relationship nature**
- Include **partnership terms** (if public)
- Specify **collaboration areas**
- Provide **contact information**

### For Campaign Content:
- Document **campaign objectives**
- Include **performance metrics**
- List **key partners**
- Specify **target outcomes**

## Auto-Categorization Rules

When creating ecosystem content, the system uses network detection + specific naming:

```javascript
// Network Detection (from tags)
"solana" → /solana/
"ethereum" → /ethereum/  
"algorand" → /algorand/

// Integration routing with specific filenames
tags: ["jupiter", "solana"] → /integrations/solana/jupiter-routing.json
tags: ["uniswap", "ethereum", "v3"] → /integrations/ethereum/uniswap-v3.json
tags: ["pera", "algorand"] → /integrations/algorand/pera-wallet.json

// Partnership routing with network specificity
tags: ["foundation", "solana"] → /partners/solana/solana-foundation.json
tags: ["foundation", "algorand"] → /partners/algorand/algorand-foundation.json

// Campaign routing with date + network
title: "NYLA x Algorand Launch" + as_of: "2025-07-15"
→ /campaigns/2025-07-nyla-x-algorand-launch.json
```

This structure ensures clear separation between **verifiable ecosystem relationships** and **narrative marketing content** while maintaining automatic organization based on content type and tags.