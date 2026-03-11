# Daily AI Report

每天自动收集 AI、科技、机器视觉领域的最新资讯，生成优雅的日报网站。

## 快速开始

```bash
# 安装依赖
npm install

# 本地测试生成
npm run generate

# 本地预览
npm run preview
```

## 配置

编辑 `config.json` 修改关注领域和数据源。

## 自动部署

项目已配置 GitHub Actions，每天 UTC 0:00 (北京时间 8:00) 自动运行。

## 技术栈

- 数据采集：RSS Parser + API
- AI 生成：MiniMax API
- 网站生成：Astro
- 托管：GitHub Pages
