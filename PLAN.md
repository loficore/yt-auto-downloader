# 定时同步计划

## 背景

当前系统已实现播放列表同步功能，但存在以下问题：
1. 没有定时同步功能
2. 启动时立即同步，不符合用户预期
3. 前端过于简单，需要参考 yubal 风格重构

## 目标

实现基于 Cron 表达式的定时同步功能，主要面向长期同步歌单到本地的用户。

## 核心改动

### 1. 定时调度器

- 使用 Cron 表达式配置同步时间（如 `0 6 * * *` 每天6点）
- 启动时不立即同步，而是计算下次运行时间，等待下一个周期再执行
- 支持启用/禁用调度器

### 2. 订阅功能

添加 `subscriptions` 表存储播放列表订阅：
- 订阅 URL
- 订阅名称
- 是否启用
- 最大下载数量
- 上次同步时间

### 3. 前端重构（参考 yubal）

使用 HeroUI 组件库重构前端：
- 两页结构：Downloads / Playlists
- 卡片式布局
- 倒计时显示

## 环境变量

```env
# 调度器配置
SCHEDULER_ENABLED=true
SCHEDULER_CRON=0 6 * * *
TIMEZONE=UTC

# 日志配置
LOG_DIR=./logs
LOG_FILENAME=yt-downloader
LOG_LEVEL=INFO
```

## 实施计划

### 阶段 1：后端改动

1. 添加 subscriptions 表
2. 实现 Scheduler 服务（Cron 定时器）
3. 实现 SubscriptionService（订阅 CRUD）
4. 添加订阅相关 API
5. 修改启动逻辑（不立即同步）

### 阶段 2：前端改动

1. 添加 HeroUI 等依赖
2. 重构目录结构（pages/features/hooks）
3. 实现 Playlists 页面（订阅管理）
4. 实现 Downloads 页面（任务管理）

## 文件修改清单

| 文件 | 修改内容 |
|------|----------|
| `apps/backend/src/config.ts` | 添加 SCHEDULER_CRON, SCHEDULER_ENABLED, TIMEZONE |
| `apps/backend/src/services/Database.ts` | 添加 subscriptions 表 |
| `apps/backend/src/services/Scheduler.ts` | 新建：Cron 定时调度器 |
| `apps/backend/src/services/SubscriptionService.ts` | 新建：订阅管理服务 |
| `apps/backend/src/api/subscriptions.ts` | 新建：订阅 API 路由 |
| `apps/backend/src/api/scheduler.ts` | 新建：调度器状态 API |
| `apps/backend/src/server.ts` | 集成调度器，启动时计算下次运行时间 |
| `apps/frontend/package.json` | 添加 HeroUI, @tanstack/react-router, lucide-react, cron-parser |
| `apps/frontend/src/router.tsx` | 新建：路由配置 |
| `apps/frontend/src/App.tsx` | 重构：集成路由和 HeroUIProvider |
| `apps/frontend/src/pages/Playlists.tsx` | 新建：订阅管理页面 |
| `apps/frontend/src/pages/Downloads.tsx` | 新建：下载任务页面 |
| `apps/frontend/src/features/subscriptions/*` | 新建：订阅相关组件 |
| `apps/frontend/src/features/jobs/*` | 新建：任务相关组件 |
