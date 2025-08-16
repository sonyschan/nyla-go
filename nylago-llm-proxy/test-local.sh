#!/bin/bash

# Test script for local development with new schema

echo "🧪 Testing NYLA LLM Proxy locally..."
echo ""

# Health check
echo "1️⃣ Health Check:"
curl -s http://localhost:8080/v1/health | jq '.'
echo ""

# Basic inference test (new schema)
echo "2️⃣ Basic Inference Test:"
curl -s -X POST http://localhost:8080/v1/infer \
  -H "Content-Type: application/json" \
  -d '{
    "user_query": "What is NYLA?",
    "context": [],
    "ab": "cloud"
  }' | jq '.'
echo ""

# Chinese query test
echo "3️⃣ Chinese Query Test:"
curl -s -X POST http://localhost:8080/v1/infer \
  -H "Content-Type: application/json" \
  -d '{
    "user_query": "什么是旺柴项目？",
    "context": [],
    "ab": "cloud"
  }' | jq '.'
echo ""

# Context-aware test
echo "4️⃣ Context-Aware Test:"
curl -s -X POST http://localhost:8080/v1/infer \
  -H "Content-Type: application/json" \
  -d '{
    "user_query": "Tell me more about WangChai",
    "context": [
      "WangChai (旺柴) is a community-driven blockchain project focused on building strong community engagement.",
      "The project has over 7,800 community members across Twitter and Telegram.",
      "WangChai maintains a deep cooperative relationship with NYLA through joint AMAs and community events."
    ],
    "ab": "cloud"
  }' | jq '.'
echo ""

# Custom parameters test
echo "5️⃣ Custom Parameters Test:"
curl -s -X POST http://localhost:8080/v1/infer \
  -H "Content-Type: application/json" \
  -d '{
    "user_query": "How do I transfer tokens?",
    "context": [],
    "params": {
      "max_tokens": 100,
      "temperature": 0.1,
      "top_p": 0.9
    },
    "ab": "cloud"
  }' | jq '.'
echo ""

# Streaming test
echo "6️⃣ Streaming Test (first 5 events):"
curl -s -X POST http://localhost:8080/v1/infer/stream \
  -H "Content-Type: application/json" \
  -d '{
    "user_query": "Explain blockchain technology",
    "context": [],
    "ab": "cloud"
  }' | head -20
echo ""

echo "✅ Tests complete!"