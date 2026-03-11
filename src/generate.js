require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { collect } = require('./collector');
const { generateSummary, generateAIReport } = require('./generator');
const config = require('../config');

async function main() {
  console.log('🚀 Daily AI Report 生成器启动\n');
  console.log('='.repeat(50));
  
  const startTime = Date.now();
  const dateStr = new Date().toISOString().split('T')[0];
  
  try {
    // 1. 收集资讯
    const { items, byCategory } = await collect();
    
    // 2. 生成摘要
    const itemsWithSummary = items.map(item => ({
      ...item,
      summary: generateSummary(item)
    }));
    
    // 3. AI 生成日报（可选）
    const { content: aiContent, date, hasAI } = await generateAIReport(items, byCategory);
    
    // 4. 生成 JSON 存档（结构化数据，方便以后做数据库）
    const archiveData = {
      date: dateStr,
      generatedAt: new Date().toISOString(),
      hasAI: hasAI,
      totalItems: items.length,
      categories: Object.keys(byCategory),
      items: itemsWithSummary,
      byCategory: Object.fromEntries(
        Object.entries(byCategory).map(([cat, news]) => [
          cat, 
          news.map(n => ({
            title: n.title,
            link: n.link,
            source: n.source,
            image: n.image,
            summary: generateSummary(n)
          }))
        ])
      )
    };
    
    // 5. 渲染新模板
    const template = fs.readFileSync(
      path.join(__dirname, 'template.html'),
      'utf8'
    );
    
    // 构建分类标签
    const categories = Object.keys(byCategory);
    const categoryTabs = categories.map((cat, i) => 
      `<button class="tab-btn ${i === 0 ? 'active' : ''}" data-category="${cat}">${cat} <span class="count">${byCategory[cat].length}</span></button>`
    ).join('\n');
    
    // 构建分类内容
    const categoryContents = categories.map((cat, i) => {
      const newsItems = byCategory[cat].map(item => `
        <article class="news-card">
          ${item.image ? `<div class="card-image" style="background-image: url('${item.image}')"></div>` : ''}
          <div class="card-content">
            <h3><a href="${item.link}" target="_blank">${item.title}</a></h3>
            <p class="summary">${item.summary}</p>
            <p class="meta">
              <span class="source">${item.source}</span>
              <span class="time">${new Date(item.pubDate).toLocaleDateString('zh-CN')}</span>
            </p>
          </div>
        </article>
      `).join('\n');
      
      return `<div class="tab-content ${i === 0 ? 'active' : ''}" data-category="${cat}">
        <div class="news-grid">${newsItems}</div>
      </div>`;
    }).join('\n');
    
    let html = template
      .replace('{{title}}', `AI 科技日报 - ${date}`)
      .replace('{{date}}', date)
      .replace('{{categoryTabs}}', categoryTabs)
      .replace('{{categoryContents}}', categoryContents)
      .replace('{{aiContent}}', aiContent || '')
      .replace('{{totalCount}}', items.length.toString());
    
    // 6. 保存文件
    const outputDir = path.join(__dirname, '..', config.outputDir);
    fs.mkdirSync(outputDir, { recursive: true });
    
    // HTML 文件
    const outputPath = path.join(outputDir, 'index.html');
    fs.writeFileSync(outputPath, html);
    
    // 带日期的存档 HTML
    const archiveHtmlPath = path.join(outputDir, `${dateStr}.html`);
    fs.writeFileSync(archiveHtmlPath, html);
    
    // JSON 存档（结构化数据）
    const archiveJsonPath = path.join(outputDir, `${dateStr}.json`);
    fs.writeFileSync(archiveJsonPath, JSON.stringify(archiveData, null, 2));
    
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log('='.repeat(50));
    console.log(`✅ 完成！耗时 ${elapsed}s`);
    console.log(`📁 今日日报: ${outputPath}`);
    console.log(`📁 HTML存档: ${archiveHtmlPath}`);
    console.log(`📁 JSON存档: ${archiveJsonPath} (结构化数据)`);
    console.log(`📊 共 ${items.length} 条资讯，${categories.length} 个分类`);
    
  } catch (error) {
    console.error('\n❌ 生成失败:', error);
    process.exit(1);
  }
}

main();
