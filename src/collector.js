const Parser = require('rss-parser');
const config = require('../config');

const parser = new Parser({
  timeout: 10000,
  headers: { 
    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
  }
});

// 抓取 RSS 源
async function fetchRSS(url) {
  try {
    const feed = await parser.parseURL(url);
    return feed.items.map(item => {
      // 提取图片
      let image = null;
      if (item.enclosure?.url) {
        image = item.enclosure.url;
      } else if (item.content) {
        const imgMatch = item.content.match(/<img[^>]+src=["']([^"']+)["']/i);
        if (imgMatch) image = imgMatch[1];
      }
      
      return {
        title: item.title?.trim(),
        link: item.link,
        pubDate: item.pubDate || item.isoDate,
        source: feed.title || url,
        content: item.contentSnippet || item.content || '',
        image: image
      };
    }).slice(0, 15);
  } catch (error) {
    console.error(`❌ Failed to fetch ${url}:`, error.message);
    return [];
  }
}

// 分类
function categorize(title, content) {
  const text = (title + ' ' + content).toLowerCase();
  
  const categories = {
    'AI大模型': ['gpt', 'claude', 'llm', '大模型', 'gemma', 'openai', 'anthropic', 'chatgpt', 'minimax', '通义', '文心', 'kimi', 'ai ', 'gemini'],
    '机器视觉': ['vision', 'computer vision', '图像识别', 'yolo', 'opencv', '视觉', '摄像头', '自动驾驶', '特斯拉', 'waymo', 'driving', 'robot'],
    '科技前沿': ['tech', 'apple', 'google', 'microsoft', 'meta', '三星', '华为', '新品', '发布', 'iphone', 'android', 'device'],
    '商业动态': ['funding', '融资', '收购', '上市', '估值', '亿美元', 'billion', 'startup', 'report', 'quarter', 'revenue']
  };
  
  for (const [cat, keywords] of Object.entries(categories)) {
    if (keywords.some(k => text.includes(k))) {
      return cat;
    }
  }
  return '其他资讯';
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
  
  // 分类
  filtered = filtered.map(item => ({
    ...item,
    category: categorize(item.title, item.content)
  }));
  
  // 按分类整理
  const byCategory = {};
  for (const item of filtered) {
    const cat = item.category;
    if (!byCategory[cat]) byCategory[cat] = [];
    byCategory[cat].push(item);
  }
  
  console.log(`📊 共获取 ${filtered.length} 条资讯\n`);
  console.log('📂 分类:', Object.keys(byCategory).map(c => `${c}(${byCategory[c].length})`).join(', '));
  
  return { items: filtered, byCategory };
}

module.exports = { collect };
