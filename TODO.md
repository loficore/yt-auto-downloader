# TODO

## Phase 1: 后端改动

### 1.1 配置更新
- [ ] 修改 config.ts - 添加 SCHEDULER_CRON, SCHEDULER_ENABLED, TIMEZONE 环境变量
- [ ] 更新 .env.example - 添加调度器相关配置

### 1.2 数据库
- [ ] 添加 subscriptions 表到 Database.ts
- [ ] 添加 Subscription 相关的 CRUD 方法

### 1.3 调度器服务
- [ ] 新建 Scheduler.ts - Cron 定时调度器
- [ ] 实现 start/stop 方法
- [ ] 实现 _run_loop 定时循环
- [ ] 实现 sync_all_enabled 同步所有启用的订阅
- [ ] 实现 get_next_run_time 计算下次运行时间

### 1.4 订阅服务
- [ ] 新建 SubscriptionService.ts - 订阅管理服务
- [ ] 实现 list() 获取订阅列表
- [ ] 实现 add() 添加订阅
- [ ] 实现 update() 更新订阅
- [ ] 实现 delete() 删除订阅
- [ ] 实现 sync() 同步单个订阅

### 1.5 API 路由
- [ ] 新建 subscriptions.ts - 订阅 CRUD API
  - GET /api/subscriptions - 列出所有订阅
  - POST /api/subscriptions - 添加订阅
  - PUT /api/subscriptions/:id - 更新订阅
  - DELETE /api/subscriptions/:id - 删除订阅
  - POST /api/subscriptions/:id/sync - 手动同步单个订阅
  - POST /api/subscriptions/sync-all - 同步所有启用的订阅
- [ ] 新建 scheduler.ts - 调度器状态 API
  - GET /api/scheduler/status - 获取调度器状态

### 1.6 Server 集成
- [ ] 修改 server.ts - 初始化调度器
- [ ] 修改启动逻辑 - 不立即同步，计算下次运行时间
- [ ] 添加 SIGTERM 处理 - 停止调度器

## Phase 2: 前端改动

### 2.1 依赖添加
- [ ] 修改 package.json - 添加 @heroui/react, @tanstack/react-router, lucide-react, cron-parser, @formkit/tempo

### 2.2 目录重构
- [ ] 创建 router.tsx - 路由配置
- [ ] 创建 pages/ 目录
- [ ] 创建 features/subscriptions/ 目录
- [ ] 创建 features/jobs/ 目录
- [ ] 创建 features/logs/ 目录
- [ ] 创建 components/layout/ 目录
- [ ] 创建 components/common/ 目录
- [ ] 创建 hooks/ 目录

### 2.3 公共组件
- [ ] 新建 Header.tsx - 顶部导航
- [ ] 新建 Footer.tsx - 底部
- [ ] 新建 UrlInput.tsx - URL 输入框组件

### 2.4 页面实现
- [ ] 新建 PlaylistsPage.tsx - 订阅管理页面
  - URL 输入框
  - 订阅按钮
  - 统计卡片（Active, Next sync, Sync all）
  - 订阅表格
- [ ] 新建 DownloadsPage.tsx - 下载任务页面
  - 下载表单（可选）
  - 任务面板
  - 日志面板

### 2.5 功能组件
- [ ] 新建 useSubscriptions hook - 订阅数据管理
- [ ] 新建 SubscriptionsTable.tsx - 订阅表格组件
- [ ] 新建 SubscriptionCard.tsx - 订阅卡片组件
- [ ] 新建 useJobs hook - 任务数据管理
- [ ] 新建 JobsPanel.tsx - 任务面板组件
- [ ] 新建 LogsPanel.tsx - 日志面板组件
- [ ] 新建 useScheduleCountdown hook - 倒计时

### 2.6 样式和主题
- [ ] 更新 style.css - 添加 HeroUI 主题
- [ ] 添加暗黑模式支持

## Phase 3: 测试和优化

- [ ] 测试定时同步功能
- [ ] 测试订阅 CRUD 功能
- [ ] 测试前端页面交互
- [ ] 修复发现的问题

## 已知问题（待修复）
- [x] Cookie 文件路径解析问题 - 已修复
- [x] 日志路径问题 - 已修复
