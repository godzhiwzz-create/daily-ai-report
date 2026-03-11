require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { collect } = require('./collector');
const { generateReport } = require('./generator');

const config = require('../config');

async function main() {
  console.log('🚀 Daily AI Report 生成器启动\n');
  console.log('='.repeat(50));
  
  const startTime = Date.now();
  
  try {
    // 1. 收集资讯
    const items = await collect();
    
    // 2. AI 生成日报
    console.log('🤖 正在生成日报...\n');
    const report = await generateReport(items);
    
    // 3. 渲染模板
    const template = fs.readFileSync(
      path.join(__dirname, 'template.html'),
      'utf8'
    );
    
    let html = template
      .replace('{{title}}', `AI 科技日报 - ${report.date}`)
      .replace('{{date}}', report.date)
      .replace('{{content}}', report.content);
    
    // 如果是默认模板，添加资讯列表
    if (report.isDefault) {
      const newsList = items.map(item => `
        <article class="news-item">
          <h3><a href="${item.link}" target="_blank">${item.title}</a></h3>
          <p class="meta">${item.source}</p>
        </article>
      `).join('\n');
      
      html = html.replace('{{content}}', `
        <h2>今日资讯</h2>
        <div class="news-list">${newsList}</div>
      `);
    }
    
    // 4. 保存文件
    const outputDir = path.join(__dirname, '..', config.outputDir);
    fs.mkdirSync(outputDir, { recursive: true });
    
    const outputPath = path.join(outputDir, 'index.html');
    fs.writeFileSync(outputPath, html);
    
    // 同时保存一份带日期的存档
    const dateStr = new Date().toISOString().split('T')[0];
    const archivePath = path.join(outputDir, `${dateStr}.html`);
    fs.writeFileSync(archivePath, html);
    
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log('='.repeat(50));
    console.log(`✅ 完成！耗时 ${elapsed}s`);
    console.log(`📁 输出: ${outputPath}`);
    console.log(`📁 存档: ${archivePath}`);
    
  } catch (error) {
    console.error('\n❌ 生成失败:', error);
    process.exit(1);
  }
}

main();
