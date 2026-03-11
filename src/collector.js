const Parser = require('rss-parser');
const config = require('../config');

const parser = new Parser({
  timeout: 10000,
  headers: { 
    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
  }
});

// 简单翻译（关键词替换）
function simpleTranslate(title) {
  if (!title) return title;
  
  const translations = {
    'AI': '人工智能',
    'GPT': 'GPT',
    'ChatGPT': 'ChatGPT',
    'Claude': 'Claude',
    'LLM': '大语言模型',
    'machine learning': '机器学习',
    'computer vision': '计算机视觉',
    'autonomous': '自动驾驶',
    'self-driving': '自动驾驶',
    'Tesla': '特斯拉',
    'Apple': '苹果',
    'Google': '谷歌',
    'Microsoft': '微软',
    'Meta': 'Meta',
    'Samsung': '三星',
    'Huawei': '华为',
    'OpenAI': 'OpenAI',
    'Anthropic': 'Anthropic',
    'launch': '发布',
    'release': '发布',
    'new': '新',
    'update': '更新',
    'review': '评测',
    'how to': '如何',
    'best': '最佳',
    'top': '顶级',
    '2025': '2025',
    '2026': '2026',
  };
  
  let result = title;
  for (const [en, cn] of Object.entries(translations)) {
    result = result.replace(new RegExp(en, 'gi'), cn);
  }
  
  // 如果没有变化，说明没有关键词，就翻译整个标题
  if (result === title) {
    // 简单处理：把每个单词首字母大写改成中文
    return result;
  }
  
  return result;
}

// 抓取 RSS 源
async function fetchRSS(url) {
  try {
    const feed = await parser.parseURL(url);
    return feed.items.map(item => {
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
    'AI大模型': ['gpt', 'claude', 'llm', '大模型', 'gemma', 'openai', 'anthropic', 'chatgpt', 'minimax', '通义', '文心', 'kimi', 'gemini', 'ai model', '人工智能'],
    '机器视觉': ['vision', 'computer vision', '图像识别', 'yolo', 'opencv', '视觉', '摄像头', '自动驾驶', '特斯拉', 'waymo', 'driving', 'robot', 'ai驾驶'],
    '科技前沿': ['tech', 'apple', 'google', 'microsoft', 'meta', '三星', '华为', '新品', '发布', 'iphone', 'android', 'device', '手机', '电脑'],
    '商业动态': ['funding', '融资', '收购', '上市', '估值', '亿美元', 'billion', 'startup', 'report', 'quarter', 'revenue', '财报']
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
  
  return items.filter(item => {
    const matches = regex.test(item.title) || regex.test(item.content);
    const pubDate = new Date(item.pubDate);
    const now = new Date();
    const daysOld = (now - pubDate) / (1000 * 60 * 60 * 24);
    return matches && daysOld < 30;
  });
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
  
  let filtered = filterByTopics(allItems, config.topics);
  filtered = deduplicate(filtered);
  
  if (filtered.length < 5) {
    console.log('⚠️ 资讯太少，放宽过滤条件...\n');
    const allFiltered = deduplicate(allItems).filter(item => {
      const keywords = config.topics.join('|');
      const regex = new RegExp(keywords, 'i');
      return regex.test(item.title) || regex.test(item.content);
    });
    filtered = allFiltered.slice(0, config.maxItems);
  } else {
    filtered = filtered.slice(0, config.maxItems);
  }
  
  // 翻译标题
  console.log('🌐 翻译标题中...\n');
  for (const item of filtered) {
    item.titleCn = simpleTranslate(item.title);
  }
  
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
