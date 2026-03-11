const Parser = require('rss-parser');
const fs = require('fs');
const path = require('path');
const config = require('../config');

// RSS 解析器
const parser = new Parser({
  timeout: 10000,
  headers: { 'User-Agent': 'Daily-AI-Report/1.0' }
});

// 抓取 RSS 源
async function fetchRSS(url) {
  try {
    const feed = await parser.parseURL(url);
    return feed.items.map(item => ({
      title: item.title,
      link: item.link,
      pubDate: item.pubDate || item.isoDate,
      source: feed.title || url,
      content: item.contentSnippet || item.content || ''
    })).slice(0, 10);
  } catch (error) {
    console.error(`❌ Failed to fetch ${url}:`, error.message);
    return [];
  }
}

// 关键词过滤
function filterByTopics(items, topics) {
  const keywords = topics.join('|');
  const regex = new RegExp(keywords, 'i');
  
  return items.filter(item => 
    regex.test(item.title) || regex.test(item.content)
  );
}

// 去重
function deduplicate(items) {
  const seen = new Set();
  return items.filter(item => {
    const key = item.title.toLowerCase().trim();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

// 主函数
async function collect() {
  console.log('📡 开始收集资讯...\n');
  
  const allItems = [];
  
  for (const source of config.rssSources) {
    console.log(`🔄 抓取: ${source}`);
    const items = await fetchRSS(source);
    allItems.push(...items);
    console.log(`   ✅ 获取 ${items.length} 条\n`);
  }
  
  // 过滤 & 去重
  let filtered = filterByTopics(allItems, config.topics);
  filtered = deduplicate(filtered);
  filtered = filtered.slice(0, config.maxItems);
  
  console.log(`📊 共获取 ${filtered.length} 条相关资讯\n`);
  
  return filtered;
}

module.exports = { collect };
