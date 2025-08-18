# CLAUDE.md - Memory for Claude Code Assistant

## 🎯 NYLAGo Core Capabilities (Critical Reference)
**What it DOES**
1. Generates transfer/swap commands to post on X.com  
2. Executes via X.com posts (not direct blockchain)  
3. Supports Solana / Ethereum / Algorand  
4. Transfers by username, QR code for receiving  
5. Community features (non-blockchain)  

**What it DOESN’T**
- ❌ Cross-chain swaps  
- ❌ Direct DEX integration  
- ❌ On-chain actions (all via X.com posts)  
- ❌ Blockchain-based community  

**Correct Description**  
“NYLAGo generates commands for crypto transfers/swaps within Solana, Ethereum, or Algorand. Users post these commands on X.com to execute. It also supports QR payment and community engagement features.”

---

## 🚀 Release Workflow (Essentials)

**Pre-release checks**
- Features complete & tested  
- Version display matches release (Extension & PWA)  
- Assets committed to git (icons, pwa, design, app)  

**Versioning**
- Major (X.y.z): Breaking changes  
- Minor (x.Y.z): New features (backward compatible)  
- Patch (x.y.Z): Bug fixes / small improvements  

**Update ALL version refs**
- manifest.json, package.json, pwa/js/app.js, pwa/sw.js, popup.js, README.md, CLAUDE.md

**GitHub Release**
```bash
git tag v[X.X.X]
git push origin v[X.X.X]
gh release create v[X.X.X] --title "NYLA Go v[X.X.X]" --notes "..."
```

---

## 🏪 Chrome Store Packaging (Separate)
- Only package extension files (exclude pwa/)  
- Do NOT commit .zip packages  
- Remove "scripting" permission  

Contents: manifest.json, popup.html/js, content.js, qr-simple.js, icons/, images  

---

## 📚 RAG System (Key Points)
- Embedding model: Xenova/multilingual-e5-base (768-dim)  
- Query/Passage prefixes: query: / passage:  
- Deduplication + MMR reranking + clustering  
- Rebuild embeddings when KB changes:  
```bash
npm run build:embeddings
```

---

## 🧠 LLM Architecture (Simplified)
- Flow: User Query → RAG → Context Builder → LLM Engine → Response  
- Context capped, deduplicated, clustered  
- Always JSON responses, concise  

---

## 🌐 Deployment (Cloud Run)
- Project: lparmy, Region: asia-southeast1 (Singapore - GPU enabled)  
- Deploy with:
```bash
gcloud run deploy nylago --source . --region asia-southeast1 --allow-unauthenticated
```
- Health check: /v1/health  
- Endpoint: https://nylago-594680195221.asia-southeast1.run.app  

---

## 📌 Current Version
- **Latest Release**: v2.7.0  
- **Features**: Fixed cross-encoder transformers.js compatibility, hosted LLM error fixes, async/await improvements, JSON format enforcement  
