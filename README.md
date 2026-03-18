# 🎵 YouTube Auto Downloader

一个高效的 YouTube 视频音频下载服务，类似于 Yubal，具有 Web UI 和实时进度显示。

## ✨ 特性

- 🎵 **音频提取** - 自动从 YouTube 视频提取最高质量的 MP3 音频
- 🚀 **高效处理** - 基于 Elysia + Bun 的高性能后端
- 📊 **实时控制** - 通过 WebSocket 实时显示下载进度
- 🎨 **现代 UI** - React 构建的美观且响应式的 Web 界面
- 📦 **队列管理** - 支持批量导入和智能队列处理
- 🔄 **增量更新** - 自动记录下载历史，避免重复下载
- 🌐 **代理支持** - 内置 SOCKS5 代理支持

## 🛠️ 技术栈

- **运行时**: [Bun](https://bun.sh/)
- **后端**: [Elysia](https://elysiajs.com/) + WebSocket
- **前端**: React 18 + Vite
- **下载工具**: [yt-dlp](https://github.com/yt-dlp/yt-dlp)
- **类型系统**: TypeScript

## 📋 前置要求

- [Bun](https://bun.sh/) >= 1.0
- [yt-dlp](https://github.com/yt-dlp/yt-dlp) - 用于视频下载
- Node.js 18+ (可选，用于某些工具)

## 🚀 快速开始

### 1. 安装依赖

```bash
cd yt-auto-downloader
bun install
```

### 2. 开发环境运行

启动后端服务（自动监听文件变化）：
```bash
bun run dev
```

在另一个终端启动前端开发服务器：
```bash
bun run dev:frontend
```

然后访问 http://localhost:5173

### 3. 生产构建

构建前端：
```bash
bun run build:frontend
```

启动服务器：
```bash
bun run start
```

访问 http://localhost:3000

## 📁 项目结构

```
src/
├── backend/
│   ├── api/
│   │   └── download.ts         # 下载相关 API
│   ├── services/
│   │   ├── YoutubeManager.ts   # YouTube 下载器
│   │   ├── DownloadQueue.ts    # 队列管理器
│   │   └── EventEmitter.ts     # WebSocket 事件广播
│   └── server.ts               # Elysia 服务器主文件
├── frontend/
│   ├── components/
│   │   ├── DownloadList.tsx    # 下载列表
│   │   ├── BatchImport.tsx     # 批量导入
│   │   └── QueueStats.tsx      # 队列统计
│   ├── App.tsx                 # 主应用组件
│   ├── main.tsx                # 前端入口
│   └── style.css               # 样式表
├── types/
│   └── shared.ts               # 前后端共享类型
└── .env                        # 环境配置（复制 .env.example）

public/
├── index.html                  # HTML 模板
└── build/                      # 构建输出（Vite）
```

## 🔌 API 端点

### 下载管理

- `POST /api/download/add` - 添加单个下载任务
- `POST /api/download/bulk` - 批量添加任务
- `GET /api/download/queue` - 获取队列列表
- `GET /api/download/queue-info` - 获取队列统计信息
- `DELETE /api/download/task/:id` - 删除任务
- `POST /api/download/task/:id/pause` - 暂停任务
- `POST /api/download/task/:id/resume` - 继续任务
- `POST /api/download/clear-completed` - 清理已完成任务

### WebSocket

- `WS /ws` - 实时事件推送

消息类型：
- `task-added` - 新任务添加
- `task-progress` - 进度更新
- `task-completed` - 任务完成
- `task-failed` - 任务失败
- `queue-info` - 队列信息更新

## ⚙️ 配置

创建 `.env` 文件：

```env
# 后端
PORT=3000
DOWNLOAD_DIR=./data
MAX_CONCURRENT=1

# YouTube 下载
PROXY=socks5://127.0.0.1:7890
# 可选：手动指定 cookies 浏览器（如 chromium、chrome、firefox）
YTDLP_COOKIES_FROM_BROWSER=chromium
AUDIO_FORMAT=mp3
AUDIO_QUALITY=0
```

## 🎯 核心功能

### 1. 下载队列管理
- 自动创建队列，按顺序下载
- 支持暂停/恢复
- 增量式处理，避免重复

### 2. 实时进度显示
- WebSocket 实时推送进度
- 错误消息及时反馈
- 连接断开自动重连

### 3. Web 界面
- 响应式设计，支持移动设备
- 深色主题，护眼设计
- 批量 URL 导入
- 队列统计信息

## 🔐 安全考虑

- 使用 Chrome 浏览器 Cookie 绕过某些限制
- 支持 SOCKS5 代理
- 自动清理下载历史

## 📝 使用示例

### Python 脚本导入

```python
import requests
import json

BASE_URL = "http://localhost:3000/api/download"

# 添加单个任务
data = {
    "url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    "artist": "Artist Name"
}
response = requests.post(f"{BASE_URL}/add", json=data)
print(response.json())

# 批量导入
urls = [
    "https://www.youtube.com/...",
    "https://www.youtube.com/...",
]
response = requests.post(f"{BASE_URL}/bulk", json={"urls": urls})
print(response.json())
```

## 🐛 故障排除

### 下载失败

1. 检查 yt-dlp 是否正确安装：
   ```bash
   yt-dlp --version
   ```

2. 测试网络连接：
   ```bash
   yt-dlp "https://www.youtube.com/watch?v=dQw4w9WgXcQ" --dump-json
   ```

3. 检查代理设置

4. 如果报错 `could not find ... cookies database`：
    - 项目会自动探测 `chrome/chromium/brave/edge/firefox` 并自动回退到无 cookie 模式重试
    - 也可以手动设置环境变量 `YTDLP_COOKIES_FROM_BROWSER=chromium`（按你的浏览器修改）

### WebSocket 连接异常

- 确保防火墙允许 WebSocket 连接
- 检查浏览器控制台的错误信息
- 尝试刷新页面

## 📦 依赖版本

详见 `package.json` 中的 `dependencies` 和 `devDependencies`

## 📄 许可证

MIT

## 🙏 致谢

- [yt-dlp](https://github.com/yt-dlp/yt-dlp) - 强大的视频下载工具
- [Elysia](https://elysiajs.com/) - 快速的 Bun Web 框架
- [Bun](https://bun.sh/) - 高性能 JavaScript 运行时

## 📧 联系方式

有问题或建议？欢迎提交 Issue 或 Pull Request！


To install dependencies:

```bash
bun install
```

To run:

```bash
bun run index.ts
```

This project was created using `bun init` in bun v1.3.9. [Bun](https://bun.com) is a fast all-in-one JavaScript runtime.
