const config = require('../config');

// 生成中文摘要
function generateSummary(item) {
  // 如果有标题翻译，用翻译后的标题
  if (item.titleCn) {
    return item.titleCn;
  }
  
  // 如果没有，提取内容前100个字符
  let summary = item.content?.replace(/<[^>]+>/g, '').trim() || '';
  if (summary.length > 100) {
    summary = summary.substring(0, 100) + '...';
  }
  return summary || '暂无摘要';
}

// AI 生成日报内容（需要 API Key）
async function generateAIReport(items, byCategory) {
  const API_URL = 'https://api.minimax.chat/v1/text/chatcompletion_pro';
  const API_KEY = process.env.MINIMAX_API_KEY;
  
  const today = new Date().toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'long'
  });
  
  if (!API_KEY) {
    console.warn('⚠️ 未设置 MINIMAX_API_KEY');
    return { content: '', date: today, hasAI: false };
  }
  
  // 构建分类资讯（用中文标题）
  const categoryNews = Object.entries(byCategory).map(([cat, news]) => {
    const list = news.slice(0, 5).map((n, i) => `${i + 1}. ${n.titleCn || n.title}`).join('\n');
    return `【${cat}】\n${list}`;
  }).join('\n\n');
  
  const prompt = `你是一个科技日报编辑。请根据以下今日资讯，生成一份优雅的中文日报。

## 要求：
1. 开头用一句精炼的导语概括今日焦点
2. 按分类描述（AI大模型、机器视觉、科技前沿、商业动态等）
3. 每条资讯用一句话简介
4. 结尾可以加一句简短的行业观察
5. 保持阅读体验流畅

## 今日资讯：
${categoryNews}

请生成日报正文，直接输出中文，不要额外说明。`;

  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_KEY}`
      },
      body: JSON.stringify({
        model: 'abab6.5s-chat',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.7
      })
    });
    
    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    
    if (content) {
      console.log('✅ AI 摘要生成成功');
      return { content, date: today, hasAI: true };
    }
    return { content: '', date: today, hasAI: false };
  } catch (error) {
    console.error('❌ AI 调用失败:', error.message);
    return { content: '', date: today, hasAI: false };
  }
}

module.exports = { generateSummary, generateAIReport };
