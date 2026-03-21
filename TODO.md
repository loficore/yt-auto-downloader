# TODO

## Phase 1: 后端改动

### 1.1 配置更新
- [x] 修改 config.ts - 添加 SCHEDULER_CRON, SCHEDULER_ENABLED, TIMEZONE 环境变量
- [x] 更新 .env.example - 添加调度器相关配置

### 1.2 数据库
- [x] 添加 subscriptions 表到 Database.ts
- [x] 添加 Subscription 相关的 CRUD 方法

### 1.3 调度器服务
- [x] 新建 Scheduler.ts - Cron 定时调度器
- [x] 实现 start/stop 方法
- [x] 实现 _run_loop 定时循环
- [x] 实现 sync_all_enabled 同步所有启用的订阅
- [x] 实现 get_next_run_time 计算下次运行时间

### 1.4 订阅服务
- [x] Subscription CRUD 方法（整合在 Database.ts 中）
- [x] 实现 sync() 同步单个订阅（API 层实现）

### 1.5 API 路由
- [x] 新建 subscriptions.ts - 订阅 CRUD API
  - [x] GET /api/subscriptions - 列出所有订阅
  - [x] POST /api/subscriptions - 添加订阅
  - [x] PUT /api/subscriptions/:id - 更新订阅
  - [x] DELETE /api/subscriptions/:id - 删除订阅
  - [x] POST /api/subscriptions/:id/sync - 手动同步单个订阅
  - [x] POST /api/subscriptions/sync-all - 同步所有启用的订阅
- [x] 新建 scheduler.ts - 调度器状态 API
  - [x] GET /api/scheduler/status - 获取调度器状态

### 1.6 Server 集成
- [x] 修改 server.ts - 初始化调度器
- [x] 修改启动逻辑 - 不立即同步，计算下次运行时间
- [x] 添加 SIGTERM 处理 - 停止调度器

## Phase 2: 前端改动

### 2.1 依赖添加
- [x] 修改 package.json - 添加 @mantine/*, @tanstack/react-router, lucide-react, cron-parser, @formkit/tempo
- [注] 使用 @mantine 替代 @heroui

### 2.2 目录重构
- [x] 创建 router.tsx - 路由配置
- [x] 创建 pages/ 目录
- [x] 创建 components/ 目录
- [x] 创建 layout/ 目录

### 2.3 页面实现
- [x] 新建 Playlists.tsx - 订阅管理页面（包含 URL 输入框、订阅按钮）
- [x] 新建 Downloads.tsx - 下载任务页面

### 2.4 功能组件
- [x] 新建 PlaylistSync.tsx - 订阅同步组件
- [x] 新建 QueueStats.tsx - 队列统计组件
- [x] 新建 DownloadList.tsx - 下载列表组件
- [x] 新建 TaskItem.tsx - 任务项组件
- [x] 新建 AppLayout.tsx - 应用布局组件

### 2.5 样式和主题
- [x] 使用 @mantine/theme 主题
- [x] 添加暗黑模式支持

## Phase 3: 测试和优化

### 3.1 测试框架搭建
- [x] 安装 vitest 依赖（根目录 + apps/backend + apps/frontend）
- [x] 创建 vitest 配置文件
- [x] 创建后端测试目录结构 (test/unit, test/integration, test/e2e)
- [x] 创建前端测试目录结构 (test/unit, test/integration, test/e2e)
- [x] 迁移现有测试到新结构 (downloadAPI.test.ts → integration/)

### 3.2 测试任务

#### 高优先级 (核心业务逻辑)
- [x] 编写 Subscriptions API 集成测试 (`apps/backend/test/integration/subscriptionsAPI.test.ts`)
- [x] 编写 Scheduler API 集成测试 (`apps/backend/test/integration/schedulerAPI.test.ts`)
- [x] 编写 Database 服务单元测试 (`apps/backend/test/unit/database.test.ts`)
- [x] 编写 EventEmitter 单元测试 (`apps/backend/test/unit/eventEmitter.test.ts`)
- [x] 编写 Scheduler 单元测试 (`apps/backend/test/unit/scheduler.test.ts`)
- [x] 编写 Config 单元测试 (`apps/backend/test/unit/config.test.ts`)
- [ ] 编写 DownloadQueue 单元测试 (`apps/backend/test/unit/downloadQueue.test.ts`) - 已跳过（依赖复杂）

#### 中优先级 (工具函数)
- [x] 编写 typeGuards 单元测试 (`apps/frontend/test/unit/typeGuards.test.ts`)
- [x] 编写 api.ts 单元测试 (`apps/frontend/test/unit/api.test.ts`)
- [x] 编写 Logger 单元测试 (`apps/frontend/test/unit/logger.test.ts`)

#### 低优先级 (UI 组件)
- [x] 编写 PlaylistSync 组件测试 (`apps/frontend/test/integration/PlaylistSync.test.tsx`)
- [x] 编写 QueueStats 组件测试 (`apps/frontend/test/integration/QueueStats.test.tsx`)
- [x] 编写 TaskItem 组件测试 (`apps/frontend/test/integration/TaskItem.test.tsx`)
- [x] 编写 DownloadList 组件测试 (`apps/frontend/test/integration/DownloadList.test.tsx`)

#### Hooks 测试
- [x] 编写 useDownloadTasks Hook 测试 (`apps/frontend/test/unit/useDownloadTasks.test.ts`)
- [x] 编写 useWebSocket Hook 测试 (`apps/frontend/test/unit/useWebSocket.test.ts`)

## 可测试模块清单

### 后端 API (集成测试)
| 模块 | 文件路径 | 状态 |
|------|---------|------|
| Server | `apps/backend/src/server.ts` | ✅ 已完成 |
| Download API | `apps/backend/src/api/download.ts` | ✅ 已完成 |
| Subscriptions API | `apps/backend/src/api/subscriptions.ts` | ✅ 已完成 |
| Scheduler API | `apps/backend/src/api/scheduler.ts` | ✅ 已完成 |

### 后端服务 (单元测试)
| 模块 | 文件路径 | 状态 |
|------|---------|------|
| Database | `apps/backend/src/services/Database.ts` | ✅ 已完成 |
| DownloadQueue | `apps/backend/src/services/DownloadQueue.ts` | ⏳ 已跳过 (依赖复杂) |
| Scheduler | `apps/backend/src/services/Scheduler.ts` | ✅ 已完成 |
| YoutubeManager | `apps/backend/src/services/YoutubeManager.ts` | ✅ 已完成 |
| PlaylistService | `apps/backend/src/services/PlaylistService.ts` | ✅ 已完成 |
| EventEmitter | `apps/backend/src/services/EventEmitter.ts` | ✅ 已完成 |
| Config | `apps/backend/src/config.ts` | ✅ 已完成 |

### 前端工具 (单元测试)
| 模块 | 文件路径 | 状态 |
|------|---------|------|
| Type Guards | `apps/frontend/src/utils/typeGuards.ts` | ✅ 已完成 |
| API 客户端 | `apps/frontend/src/utils/api.ts` | ✅ 已完成 |
| Logger | `apps/frontend/src/utils/logger.ts` | ✅ 已完成 |

### Packages/Shared (单元测试)
| 模块 | 文件路径 | 状态 |
|------|---------|------|
| Types | `packages/shared/types/index.ts` | ✅ 已完成 |

### 前端 Hooks (单元测试)
| 模块 | 文件路径 | 状态 |
|------|---------|------|
| useDownloadTasks | `apps/frontend/src/hooks/useDownloadTasks.ts` | ✅ 已完成 |
| useWebSocket | `apps/frontend/src/hooks/useWebSocket.ts` | ✅ 已完成 |

### 前端组件 (集成测试)
| 模块 | 文件路径 | 状态 |
|------|---------|------|
| QueueStats | `apps/frontend/src/components/QueueStats.tsx` | ✅ 已完成 |
| TaskItem | `apps/frontend/src/components/TaskItem.tsx` | ✅ 已完成 |
| DownloadList | `apps/frontend/src/components/DownloadList.tsx` | ✅ 已完成 |
| PlaylistSync | `apps/frontend/src/components/PlaylistSync.tsx` | ✅ 已完成 |
| AppLayout | `apps/frontend/src/layout/AppLayout.tsx` | ✅ 已完成 |
| App | `apps/frontend/src/App.tsx` | ✅ 已完成 |
| Playlists | `apps/frontend/src/pages/Playlists.tsx` | ✅ 已完成 |
| Downloads | `apps/frontend/src/pages/Downloads.tsx` | ✅ 已完成 |
| Router | `apps/frontend/src/router.tsx` | ✅ 已完成 |

## 已知问题（待修复）
- [x] Cookie 文件路径解析问题 - 已修复
- [x] 日志路径问题 - 已修复
- [x] 测试运行器问题 - 已修复 (bun test → bun run test:backend && bun run test:shared && bun run test:frontend)
- [x] PlaylistService Cookie 解析问题 - 已修复 (netscape 格式转换)
- [x] subscriptions 表缺少 limit_per_sync 列 - 已修复 (数据库迁移)

## 新功能开发

### Rate Limiter - RPM 限流器
- [x] 新建 RateLimiter.ts - RPM 滑动窗口限流器
  - [x] 实现滑动窗口算法 (1分钟窗口)
  - [x] 实现随机抖动 (minDelay/maxDelay)
  - [x] 实现 getNextDelay() 计算等待时间
  - [x] 实现 recordSuccess() 记录完成
  - [x] 实现 getCurrentCount() 获取当前窗口计数
- [x] 修改 config.ts - 添加限流配置
  - [x] maxDownloadsPerMinute (默认 5)
  - [x] downloadDelayMin (默认 1000ms)
  - [x] downloadDelayMax (默认 5000ms)
- [x] 修改 DownloadQueue.ts - 集成 RateLimiter
  - [x] 初始化 RateLimiter
  - [x] 在 processQueue() 中调用限流检查
  - [x] 下载完成后调用 recordSuccess()
- [x] 更新 .env.example - 添加限流相关配置
- [ ] 编写 RateLimiter 单元测试

### 下载验证系统 - 防损坏/完整性校验
- [x] 安装 music-metadata 包
- [x] 新建 DownloadVerifier.ts - 下载验证服务
  - [x] 实现 basicCheck() - 文件存在 + 大小 > 100KB
  - [x] 实现 ffprobeCheck() - ffprobe 深度验证
  - [x] 实现 metadataCheck() - music-metadata 验证（降级方案）
  - [x] 实现 verify() - 混合验证入口
- [x] 修改 YoutubeManager.ts - 集成验证
  - [x] 在 downloadAudio() 成功后调用验证
  - [x] 验证失败时抛出错误，不标记为成功
- [x] 损坏文件清理机制
  - [x] 添加 deleteCorruptedFile() 方法
  - [x] 在验证失败时自动删除损坏文件
  - [x] 记录清理日志
- [ ] 更新 Dockerfile - 添加 ffmpeg 支持
- [ ] 编写 DownloadVerifier 单元测试

## 测试统计 (2026-03-21)

| 模块 | 测试数 | 状态 |
|------|--------|------|
| Backend | 119 | ✅ |
| Shared | 18 | ✅ |
| Frontend | 101 | ✅ |
| **总计** | **238** | ✅ |

### 新增测试
- `apps/backend/test/integration/server.test.ts` - Server 集成测试 (17 tests)
- `packages/shared/test/types.test.ts` - 类型测试 (18 tests)
- `downloadAPI.test.ts` - 边界情况测试 (9 tests)
- `subscriptionsAPI.test.ts` - 边界情况测试 (6 tests)
- `schedulerAPI.test.ts` - 边界情况测试 (5 tests)

### 待补充
- DownloadQueue 单元测试 (依赖复杂，已跳过)
- E2E 测试 (需 Playwright 等工具)
- Server graceful shutdown 测试
