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

// AI 生成日报内容
async function generateAIReport(items, byCategory) {
  const today = new Date().toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'long'
  });
  
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

  // 尝试多个 API
  const apis = [
    // MiniMax (首选)
    {
      name: 'MiniMax',
      url: 'https://api.minimax.chat/v1/text/chatcompletion_pro',
      key: process.env.MINIMAX_API_KEY,
      model: 'abab6.5s-chat',
      body: { model: 'abab6.5s-chat', messages: [{ role: 'user', content: prompt }], temperature: 0.7 }
    },
    // 硅基流动 (备用) - 需要用户配置
    {
      name: 'SiliconFlow',
      url: 'https://api.siliconflow.cn/v1/chat/completions',
      key: process.env.SILICONFLOW_API_KEY,
      model: 'Qwen/Qwen2.5-7B-Instruct',
      body: { model: 'Qwen/Qwen2.5-7B-Instruct', messages: [{ role: 'user', content: prompt }], temperature: 0.7 }
    }
  ];
  
  for (const api of apis) {
    if (!api.key) continue;
    
    try {
      console.log(`🔄 尝试 ${api.name} API...`);
      
      const response = await fetch(api.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${api.key}`
        },
        body: JSON.stringify(api.body)
      });
      
      const data = await response.json();
      
      // 检查是否有内容
      const content = data.choices?.[0]?.message?.content || data.reply;
      
      if (content) {
        console.log(`✅ ${api.name} AI 摘要生成成功`);
        return { content, date: today, hasAI: true };
      }
      
      // 检查错误信息
      const errorMsg = data.base_resp?.status_msg || data.error?.message || '未知错误';
      console.log(`⚠️ ${api.name} 返回异常: ${errorMsg}`);
      
      // 余额不足时继续尝试下一个 API
      if (errorMsg.includes('balance') || errorMsg.includes('insufficient')) {
        continue;
      }
      
    } catch (error) {
      console.error(`❌ ${api.name} 调用失败:`, error.message);
    }
  }
  
  console.warn('⚠️ 所有 AI API 均不可用，跳过 AI 摘要生成');
  return { content: '', date: today, hasAI: false };
}

module.exports = { generateSummary, generateAIReport };
