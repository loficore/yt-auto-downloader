import { Elysia } from 'elysia';
import { cors } from '@elysiajs/cors';
import { DownloadQueue } from './services/DownloadQueue';
import { EventEmitter } from './services/EventEmitter';
import { createDownloadAPI } from './api/download';
import type { DownloadTask } from '../types/shared';

const PORT = 3000;
const DOWNLOAD_DIR = './data';

// 初始化核心服务
const queue = new DownloadQueue(DOWNLOAD_DIR, 1);
const emitter = new EventEmitter();

// 设置队列更新回调
queue.setCallbacks({
    /**
     * 任务更新回调
     * @param {DownloadTask} task - 更新的任务对象 
     */
  onTaskUpdated: (task) => {
    emitter.broadcast({
      type: 'task-progress',
      data: {
        id: task.id,
        progress: task.progress,
      },
    });
  },
  /**
   * 队列变化回调
   */
  onQueueChanged: () => {
    emitter.broadcast({
      type: 'queue-info',
      data: queue.getQueueInfo(),
    });
  },
});

/**
 * 创建 Elysia 服务器
 */
const app = new Elysia()
  .use(cors())
  // 健康检查
  .get('/health', () => ({
    status: 'ok',
    timestamp: new Date().toISOString(),
  }))

  // WebSocket 路由
  .ws('/ws', {
    open(ws) {
      try {
        console.log('[💬] WebSocket 连接已建立');
        emitter.addConnection(ws.raw);
        // 发送初始队列信息
        ws.send(JSON.stringify({
          type: 'queue-info',
          data: queue.getQueueInfo(),
        }));
      } catch (err) {
        console.error('[❌] WebSocket open 处理失败:', err);
      }
    },
    message(ws, message) {
      console.log('[📨] WebSocket 消息:', message);
    },
    close(ws) {
      console.log('[💬] WebSocket 连接已关闭');
      emitter.removeConnection(ws.raw);
    },
  })

  // 注册 API 路由
  .use(createDownloadAPI(queue))

  // 静态文件服务 (前端构建输出)
  .get('/public/*', (ctx) => {
    const filePath = `./public${ctx.path.replace('/public', '')}`;
    const file = Bun.file(filePath);
    // 简单地尝试返回文件，Bun 会处理是否存在
    try {
      return file;
    } catch {
      return new Response('Not Found', { status: 404 });
    }
  })

  // 静态索引页
  .get('/', async () => {
    const file = Bun.file('./public/index.html');
    if (await file.exists()) {
      return new Response(file, {
        headers: { 'Content-Type': 'text/html' },
      });
    }
    return new Response('Welcome to yt-auto-downloader API', {
      headers: { 'Content-Type': 'text/plain' },
    });
  });

// 启动服务器
app.listen(PORT, () => {
  console.log(`🚀 服务器启动成功!`);
  console.log(`📍 API: http://localhost:${PORT}`);
  console.log(`🔌 WebSocket: ws://localhost:${PORT}/ws`);
});

export { app, queue, emitter };
