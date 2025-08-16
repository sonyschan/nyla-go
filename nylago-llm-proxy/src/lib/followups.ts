/**
 * Follow-up question generation for NYLA responses
 * Generates contextual suggestions based on user query and response
 */

import { detectLanguage } from './prompt.js';

/**
 * Generate follow-up suggestions based on user query and response
 * Returns array of strings as per schema
 */
export function generateFollowUps(
  userQuery: string,
  response: string,
  context: string[] = []
): string[] {
  const language = detectLanguage(userQuery);
  const followUps: string[] = [];

  // Analyze query intent and generate appropriate follow-ups
  const queryLower = userQuery.toLowerCase();
  
  // Project/token information queries
  if (isProjectQuery(queryLower)) {
    followUps.push(...getProjectFollowUps(queryLower, language));
  }
  
  // Transfer/transaction queries
  if (isTransferQuery(queryLower)) {
    followUps.push(...getTransferFollowUps(queryLower, language));
  }
  
  // Technical/troubleshooting queries
  if (isTechnicalQuery(queryLower)) {
    followUps.push(...getTechnicalFollowUps(queryLower, language));
  }
  
  // Community/social queries
  if (isCommunityQuery(queryLower)) {
    followUps.push(...getCommunityFollowUps(queryLower, language));
  }

  // Generic follow-ups if no specific category matches
  if (followUps.length === 0) {
    followUps.push(...getGenericFollowUps(language));
  }

  // Limit to 3 follow-ups and ensure uniqueness
  return deduplicateFollowUps(followUps).slice(0, 3);
}

/**
 * Check if query is about project/token information
 */
function isProjectQuery(query: string): boolean {
  const projectKeywords = [
    'project', '项目', 'token', '代币', 'wangchai', '旺柴', 'nyla', 
    'information', '信息', 'about', '关于', 'what is', '什么是'
  ];
  return projectKeywords.some(keyword => query.includes(keyword));
}

/**
 * Check if query is about transfers/transactions
 */
function isTransferQuery(query: string): boolean {
  const transferKeywords = [
    'transfer', '转账', 'send', '发送', 'transaction', '交易',
    'wallet', '钱包', 'address', '地址', 'fees', '手续费'
  ];
  return transferKeywords.some(keyword => query.includes(keyword));
}

/**
 * Check if query is technical/troubleshooting
 */
function isTechnicalQuery(query: string): boolean {
  const techKeywords = [
    'error', '错误', 'problem', '问题', 'how to', '如何', 'setup', '设置',
    'install', '安装', 'troubleshoot', '故障排除', 'fix', '修复'
  ];
  return techKeywords.some(keyword => query.includes(keyword));
}

/**
 * Check if query is about community/social
 */
function isCommunityQuery(query: string): boolean {
  const communityKeywords = [
    'community', '社区', 'social', '社交', 'discord', 'telegram',
    'twitter', 'links', '链接', 'contact', '联系'
  ];
  return communityKeywords.some(keyword => query.includes(keyword));
}

/**
 * Generate project-related follow-ups
 */
function getProjectFollowUps(query: string, language: 'en' | 'zh' | 'mixed'): string[] {
  const isZh = language === 'zh' || language === 'mixed';
  
  return [
    isZh ? "这个项目的社区链接在哪里？" : "Where can I find the community links?",
    isZh ? "如何参与这个项目？" : "How can I participate in this project?",
    isZh ? "项目的最新更新是什么？" : "What are the latest project updates?"
  ];
}

/**
 * Generate transfer-related follow-ups
 */
function getTransferFollowUps(query: string, language: 'en' | 'zh' | 'mixed'): string[] {
  const isZh = language === 'zh' || language === 'mixed';
  
  return [
    isZh ? "转账费用是多少？" : "What are the transfer fees?",
    isZh ? "如何设置接收地址？" : "How do I set up a receiving address?",
    isZh ? "支持哪些区块链网络？" : "Which blockchain networks are supported?"
  ];
}

/**
 * Generate technical follow-ups
 */
function getTechnicalFollowUps(query: string, language: 'en' | 'zh' | 'mixed'): string[] {
  const isZh = language === 'zh' || language === 'mixed';
  
  return [
    isZh ? "还有其他解决方案吗？" : "Are there alternative solutions?",
    isZh ? "我需要什么工具？" : "What tools do I need?",
    isZh ? "如何联系技术支持？" : "How can I contact technical support?"
  ];
}

/**
 * Generate community-related follow-ups
 */
function getCommunityFollowUps(query: string, language: 'en' | 'zh' | 'mixed'): string[] {
  const isZh = language === 'zh' || language === 'mixed';
  
  return [
    isZh ? "如何加入官方群组？" : "How can I join the official groups?",
    isZh ? "社区活动有哪些？" : "What community events are available?",
    isZh ? "如何获取最新消息？" : "How can I get the latest news?"
  ];
}

/**
 * Generate generic follow-ups
 */
function getGenericFollowUps(language: 'en' | 'zh' | 'mixed'): string[] {
  const isZh = language === 'zh' || language === 'mixed';
  
  return [
    isZh ? "我可以问其他问题吗？" : "Can I ask other questions?",
    isZh ? "有更多相关信息吗？" : "Is there more related information?",
    isZh ? "如何开始使用？" : "How do I get started?"
  ];
}

/**
 * Remove duplicate follow-ups based on text similarity
 */
function deduplicateFollowUps(followUps: string[]): string[] {
  const seen = new Set<string>();
  return followUps.filter(followUp => {
    const normalized = followUp.toLowerCase().replace(/[^\w\s]/g, '');
    if (seen.has(normalized)) {
      return false;
    }
    seen.add(normalized);
    return true;
  });
}