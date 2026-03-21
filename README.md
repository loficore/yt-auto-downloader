# 🎵 YouTube Auto Downloader

一个高效的 YouTube 视频音频下载服务，支持订阅管理和定时自动同步。

## ✨ 特性

- 🎵 **音频提取** - 自动从 YouTube 视频提取最高质量的 MP3 音频
- 🚀 **高效处理** - 基于 Elysia + Bun 的高性能后端
- 📊 **实时控制** - 通过 WebSocket 实时显示下载进度
- 🎨 **现代 UI** - React + Mantine 构建的美观 Web 界面
- 📦 **队列管理** - 支持批量导入和智能队列处理
- 🔄 **增量更新** - 自动记录下载历史，避免重复下载
- 🌐 **代理支持** - 内置代理支持
- ⏰ **定时同步** - 支持订阅播放列表并定时自动下载
- 🌑 **暗黑模式** - 支持明暗主题切换

## 🛠️ 技术栈

- **运行时**: [Bun](https://bun.sh/)
- **后端**: [Elysia](https://elysiajs.com/) + WebSocket
- **前端**: React 18 + Vite + Mantine
- **下载工具**: [yt-dlp](https://github.com/yt-dlp/yt-dlp)
- **数据库**: SQLite (bun:sqlite)
- **类型系统**: TypeScript

## 📋 前置要求

- [Bun](https://bun.sh/) >= 1.0
- [yt-dlp](https://github.com/yt-dlp/yt-dlp) - 用于视频下载

## 🚀 快速开始

### 1. 安装依赖

```bash
bun install
```

### 2. 配置

复制 `.env.example` 为 `.env` 并根据需要修改：

```env
# 服务器配置
PORT=3000
DOWNLOAD_DIR=./data/Downloads/
DB_PATH=./data/downloads.db

# 调度器配置
SCHEDULER_ENABLED=true
SCHEDULER_CRON=0 6 * * *
TIMEZONE=UTC

# 代理配置（可选）
PROXY=
YTDLP_PROXY=

# Cookie 配置（二选一）
# YTDLP_COOKIES_FROM_BROWSER=chromium
YTDLP_COOKIES_FILE=./config/cookies.txt
```

### 3. 开发环境运行

```bash
# 启动后端服务
bun run dev

# 启动前端开发服务器
bun run dev:frontend
```

访问 http://localhost:5173

### 4. 生产构建

```bash
# 构建前端
bun run build:frontend

# 启动服务
bun run start
```

访问 http://localhost:3000

## 📁 项目结构

```
yt-auto-downloader/
├── apps/
│   ├── backend/                 # 后端服务
│   │   ├── src/
│   │   │   ├── api/            # API 路由
│   │   │   │   ├── download.ts
│   │   │   │   ├── subscriptions.ts
│   │   │   │   └── scheduler.ts
│   │   │   ├── services/       # 业务逻辑
│   │   │   │   ├── Database.ts
│   │   │   │   ├── DownloadQueue.ts
│   │   │   │   ├── Scheduler.ts
│   │   │   │   └── YoutubeManager.ts
│   │   │   └── server.ts       # 服务入口
│   │   └── package.json
│   └── frontend/                # 前端应用
│       ├── src/
│       │   ├── components/     # 组件
│       │   ├── pages/          # 页面
│       │   ├── hooks/          # React hooks
│       │   ├── layout/         # 布局
│       │   ├── router.tsx      # 路由配置
│       │   └── App.tsx
│       └── package.json
├── packages/
│   └── shared/                 # 共享类型
├── data/                       # 下载文件 & 数据库
├── public/                     # 静态资源
└── package.json                # Workspace 配置
```

## 📡 API 端点

### 下载管理

| 方法 | 路径 | 描述 |
|------|------|------|
| POST | /api/download/add | 添加下载任务 |
| POST | /api/download/bulk | 批量添加任务 |
| GET | /api/download/queue | 获取队列列表 |
| GET | /api/download/queue-info | 获取队列统计 |
| DELETE | /api/download/task/:id | 删除任务 |
| POST | /api/download/task/:id/pause | 暂停任务 |
| POST | /api/download/task/:id/resume | 继续任务 |
| POST | /api/download/clear-completed | 清理已完成 |

### 订阅管理

| 方法 | 路径 | 描述 |
|------|------|------|
| GET | /api/subscriptions | 获取订阅列表 |
| POST | /api/subscriptions | 添加订阅 |
| PUT | /api/subscriptions/:id | 更新订阅 |
| DELETE | /api/subscriptions/:id | 删除订阅 |
| POST | /api/subscriptions/:id/sync | 手动同步单个订阅 |
| POST | /api/subscriptions/sync-all | 同步所有启用的订阅 |

### 调度器

| 方法 | 路径 | 描述 |
|------|------|------|
| GET | /api/scheduler/status | 获取调度器状态 |
| POST | /api/scheduler/sync-now | 立即触发同步 |

### WebSocket

- `WS /ws` - 实时事件推送

消息类型：
- `task-added` - 新任务添加
- `task-progress` - 进度更新
- `task-completed` - 任务完成
- `task-failed` - 任务失败
- `queue-info` - 队列信息更新

## 🧪 测试

```bash
# 运行所有测试
bun test

# 运行单个测试文件
bun test test/downloadAPI.test.ts
```

## 📝 使用示例

### 添加订阅

```bash
curl -X POST http://localhost:3000/api/subscriptions \
  -H "Content-Type: application/json" \
  -d '{"url": "https://www.youtube.com/playlist?list=xxx", "name": "My Playlist", "maxItems": 10}'
```

### 获取订阅列表

```bash
curl http://localhost:3000/api/subscriptions
```

### 手动触发同步

```bash
curl -X POST http://localhost:3000/api/subscriptions/sync-all
```

## 🔐 安全考虑

- 所有用户输入在后端进行验证
- 使用 `execa` 执行外部命令，避免 shell 注入
- 不记录敏感信息（cookies、tokens）

## 🐛 故障排除

### 下载失败

1. 检查 yt-dlp 版本：
   ```bash
   yt-dlp --version
   ```

2. 测试网络连接：
   ```bash
   yt-dlp "https://www.youtube.com/watch?v=dQw4w9WgXcQ" --dump-json
   ```

3. Cookie 问题：使用 `YTDLP_COOKIES_FILE` 指定 cookie 文件更稳定

### 查看日志

```bash
# 后端日志在控制台输出
bun run dev
```

## 📄 许可证

MIT

## 🙏 致谢

- [yt-dlp](https://github.com/yt-dlp/yt-dlp) - 强大的视频下载工具
- [Elysia](https://elysiajs.com/) - 快速的 Bun Web 框架
- [Mantine](https://mantine.dev/) - 优秀的 React 组件库
- [Bun](https://bun.sh/) - 高性能 JavaScript 运行时
