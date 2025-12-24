# EveryNoteAI

一款基于 AI 的跨平台智能笔记应用，支持 GitHub 云同步。

## 功能特性

- **智能笔记管理** - 支持笔记本、文件夹、标签的多层级组织
- **Markdown 编辑** - 支持 Markdown 语法，实时预览
- **AI 助手** - 集成 OpenAI，支持内容总结、标签生成、润色、扩写、翻译
- **GitHub 同步** - 通过 GitHub 实现笔记云端同步
- **跨平台** - 支持 Windows、macOS、Linux

## 技术栈

| 层级 | 技术 |
|------|------|
| 桌面框架 | Electron |
| 前端框架 | Vue 3 + TypeScript |
| 状态管理 | Pinia |
| 路由 | Vue Router |
| 样式 | SCSS |
| 构建工具 | Vite |
| 数据库 | SQLite (sql.js) |
| Markdown | marked + highlight.js |
| AI | OpenAI API |
| 云同步 | GitHub API (Octokit) |

## 快速开始

### 环境要求

- Node.js >= 18
- npm >= 9

### 安装依赖

```bash
npm install
```

### 开发模式

```bash
npm run dev
```

### 构建应用

```bash
npm run electron:build
```

## 项目结构

```
├── electron/                # Electron 主进程
│   ├── main.ts             # 主进程入口
│   ├── preload.ts          # 预加载脚本
│   ├── database.ts         # SQLite 数据库
│   ├── ai-service.ts       # AI 服务
│   ├── github-sync.ts      # GitHub 同步
│   └── simple-store.ts     # 设置存储
│
├── src/                     # Vue 渲染进程
│   ├── components/         # 组件
│   ├── views/              # 页面
│   ├── stores/             # Pinia 状态
│   ├── router/             # 路由
│   └── styles/             # 样式
│
├── public/                  # 静态资源
└── package.json
```

## 许可证

MIT
