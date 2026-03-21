# 开发计划 (Development Plan)

## Rate Limiter - RPM 限流器

### 背景
当前下载队列在任务完成后立即开始下一个任务，没有间隔。这容易被 YouTube 风控系统检测到机器人行为。

### 设计目标
- 实现每分钟请求数 (RPM) 限制
- 添加随机延迟模拟人类行为
- 防止被风控

### 实现方案

#### 1. RateLimiter 类
- **文件**: `apps/backend/src/services/RateLimiter.ts`
- **算法**: 滑动窗口 (Sliding Window)
- **配置**:
  - `rpm`: 每分钟最大下载数 (默认 5)
  - `minDelay`: 最小随机延迟 (默认 1000ms)
  - `maxDelay`: 最大随机延迟 (默认 5000ms)

#### 2. 核心逻辑
```
时间轴示例 (RPM=5):
0s    → 下载 #1 (窗口内: 1)
1.2s  → 下载 #2 (窗口内: 2)  
2.5s  → 下载 #3 (窗口内: 3)
4.1s  → 下载 #4 (窗口内: 4)
5.8s  → 下载 #5 (窗口内: 5)
...
55s   → 窗口内最老的 #1 过期 → 继续下载

如果 50s 内完成 5 个，则自动等待到 60s 窗口过期
```

#### 3. 新增配置项
```bash
MAX_DOWNLOADS_PER_MINUTE=5    # RPM 限制
DOWNLOAD_DELAY_MIN=1000       # 最小延迟 (ms)
DOWNLOAD_DELAY_MAX=5000       # 最大延迟 (ms)
MAX_CONCURRENT=1              # 并发数 (通常保持 1)
```

#### 4. 修改文件
- `apps/backend/src/config.ts` - 添加配置
- `apps/backend/src/services/RateLimiter.ts` - 新建限流器
- `apps/backend/src/services/DownloadQueue.ts` - 集成限流器

---

## 下载验证系统 - 防损坏/完整性校验

### 背景
当前任务完成判断仅依赖 yt-dlp 退出码，存在以下问题：
- 已存在的视频会被跳过但仍标记为"成功"
- 下载中断可能产生损坏文件但未被检测
- 网络问题导致文件不完整无法发现

### 设计目标
- 下载完成后验证文件完整性
- 确保文件非空、格式有效、时长正常
- 验证失败不标记为成功，可重试

### 实现方案

#### 1. 验证层级（3 层混合）

```
┌─────────────────────────────────────┐
│  1. basicCheck()                    │  文件存在 + 大小 > 100KB
├─────────────────────────────────────┤
│  2. ffprobeCheck() (推荐)          │  ffprobe 深度验证
│     ↓ 失败                           │
├─────────────────────────────────────┤
│  3. metadataCheck() (降级)         │  music-metadata 验证
└─────────────────────────────────────┘
```

#### 2. 验证内容

| 检查项 | basicCheck | ffprobeCheck | metadataCheck |
|--------|------------|--------------|---------------|
| 文件存在 | ✅ | ✅ | ✅ |
| 文件大小 > 100KB | ✅ | - | - |
| 时长有效 | - | ✅ | ✅ |
| 采样率有效 | - | ✅ | ✅ |
| 比特率有效 | - | ✅ | - |
| 容器完整性 | - | ✅ | - |

#### 3. 新建文件
- **文件**: `apps/backend/src/services/DownloadVerifier.ts`
- **依赖**: `music-metadata`

#### 4. 修改文件
- `apps/backend/src/services/YoutubeManager.ts` - 集成验证
- `Dockerfile` - 添加 ffmpeg 支持

#### 5. Docker 集成
```dockerfile
# 方式1: Alpine 镜像
FROM oven/bun:1-alpine
RUN apk add --no-cache ffmpeg

# 方式2: COPY 二进制（推荐）
COPY --from=linuxserver/heimdall-ffmpeg:latest /usr/bin/ffprobe /usr/bin/ffprobe
```

#### 6. 预期文件路径
根据 YoutubeManager 的输出模板：
```
${downloadDir}/%(artist)s/%(title)s/%(title)s.%(ext)s
```
需要解析 URL 或使用 yt-dlp 输出获取实际路径。

#### 7. 损坏文件清理机制
当验证失败时，自动删除损坏/不完整的文件：

```
验证失败
  ↓
查找对应文件
  ↓
删除文件 (unlinkSync)
  ↓
记录清理日志
  ↓
返回验证结果
```

**新增方法**:
- `verifyAndCleanup()` - 验证并清理（主入口）
- `deleteCorruptedFile()` - 删除损坏文件

**修改点**:
- `DownloadVerifier.ts` - 添加清理方法
- `YoutubeManager.ts` - 调用 `verifyAndCleanup()`

---

# 测试计划 (Test Plan)

## 概述

本文档定义项目的测试策略和执行计划。

## 执行顺序

### 阶段 1: 后端 API 集成测试

#### 1.1 Subscriptions API
- **文件**: `apps/backend/test/integration/subscriptionsAPI.test.ts`
- **测试内容**:
  - `GET /api/subscriptions` - 获取订阅列表
  - `POST /api/subscriptions` - 添加订阅
  - `PUT /api/subscriptions/:id` - 更新订阅
  - `DELETE /api/subscriptions/:id` - 删除订阅
  - `POST /api/subscriptions/:id/sync` - 手动同步
  - `POST /api/subscriptions/sync-all` - 批量同步

#### 1.2 Scheduler API
- **文件**: `apps/backend/test/integration/schedulerAPI.test.ts`
- **测试内容**:
  - `GET /api/scheduler/status` - 获取调度器状态
  - `POST /api/scheduler/sync-now` - 立即触发同步

### 阶段 2: 后端服务单元测试

#### 2.1 Database 服务
- **文件**: `apps/backend/test/unit/database.test.ts`
- **测试内容**:
  - `getSubscriptions()` - 获取订阅列表
  - `addSubscription()` - 添加订阅
  - `updateSubscription()` - 更新订阅
  - `deleteSubscription()` - 删除订阅
  - `getEnabledSubscriptions()` - 获取启用状态的订阅
  - CRUD 操作边界条件测试

#### 2.2 DownloadQueue 服务
- **文件**: `apps/backend/test/unit/downloadQueue.test.ts`
- **测试内容**:
  - 任务添加逻辑
  - 队列状态管理
  - 暂停/恢复功能

#### 2.3 RateLimiter 服务
- **文件**: `apps/backend/test/unit/rateLimiter.test.ts`
- **测试内容**:
  - 滑动窗口算法
  - RPM 限制逻辑
  - 随机延迟计算
  - 边界条件测试

#### 2.4 DownloadVerifier 服务
- **文件**: `apps/backend/test/unit/downloadVerifier.test.ts`
- **测试内容**:
  - basicCheck() - 文件存在性 + 大小检查
  - ffprobeCheck() - ffprobe 验证（mock）
  - metadataCheck() - music-metadata 验证（mock）
  - verify() - 混合验证逻辑
  - 边界条件（文件不存在、文件为空、损坏文件）

### 阶段 3: 前端工具单元测试

#### 3.1 typeGuards
- **文件**: `apps/frontend/test/unit/typeGuards.test.ts`
- **测试内容**:
  - `isQueueInfo()` 类型守卫
  - `isDownloadTask()` 类型守卫
  - `isSubscription()` 类型守卫
  - `isSchedulerStatus()` 类型守卫

#### 3.2 api.ts
- **文件**: `apps/frontend/test/unit/api.test.ts`
- **测试内容**:
  - `fetchQueueInfo()` API 调用
  - `addDownload()` API 调用
  - `getSubscriptions()` API 调用
  - 错误处理

### 阶段 4: 前端组件测试

#### 4.1 组件渲染测试
- QueueStats 组件
- TaskItem 组件
- DownloadList 组件
- PlaylistSync 组件

## 测试命令

```bash
# 运行所有测试
bun test

# 后端测试
bun run test:backend

# 前端测试
bun run test:frontend

# 按类型运行
bun run test:unit        # 单元测试
bun run test:integration # 集成测试
bun run test:e2e         # E2E 测试

# 监听模式
bun run test:watch
```

## 测试文件命名规范

- 单元测试: `test/unit/**/*.test.ts`
- 集成测试: `test/integration/**/*.test.ts`
- E2E 测试: `test/e2e/**/*.test.ts`

## Mock 策略

- 数据库: 使用内存 SQLite 或 mock
- 外部服务 (yt-dlp): 使用 mock
- HTTP 请求: 使用 fetch mock
- WebSocket: 使用 mock
