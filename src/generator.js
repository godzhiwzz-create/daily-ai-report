const config = require('../config');

// AI 生成日报内容
async function generateReport(items) {
  const API_URL = 'https://api.minimax.chat/v1/text/chatcompletion_pro';
  const API_KEY = process.env.MINIMAX_API_KEY;
  
  if (!API_KEY) {
    console.warn('⚠️ 未设置 MINIMAX_API_KEY，使用默认模板');
    return generateDefaultTemplate(items);
  }
  
  const today = new Date().toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'long'
  });
  
  const newsList = items.map((item, i) => {
    return `${i + 1}. **${item.title}**\n   - 来源: ${item.source}\n   - 链接: ${item.link}`;
  }).join('\n\n');
  
  const prompt = `你是一个科技日报编辑。请根据以下今日 AI 科技资讯，生成一份优雅的中文日报。

## 要求：
1. 开头用一句精炼的导语概括今日焦点
2. 将资讯分类整理（每个类别 2-4 条）
3. 每条资讯用一句话简介
4. 结尾可以加一句简短的行业观察
5. 保持阅读体验流畅，不要列表堆砌

## 今日资讯：
${newsList}

请生成日报正文，直接输出，不要额外说明。`;

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
      return { content, date: today };
    } else {
      console.error('❌ AI 返回为空');
      return generateDefaultTemplate(items);
    }
  } catch (error) {
    console.error('❌ AI 调用失败:', error.message);
    return generateDefaultTemplate(items);
  }
}

// 默认模板（无 API 时使用）
function generateDefaultTemplate(items) {
  const today = new Date().toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'long'
  });
  
  const newsList = items.map(item => {
    return `<article class="news-item">
      <h3><a href="${item.link}" target="_blank">${item.title}</a></h3>
      <p class="meta">${item.source}</p>
    </article>`;
  }).join('\n');
  
  return {
    content: newsList,
    date: today,
    isDefault: true
  };
}

module.exports = { generateReport };
