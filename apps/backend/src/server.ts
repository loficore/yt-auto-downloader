import { Elysia } from "elysia";
import { cors } from "@elysiajs/cors";
import { DownloadQueue } from "./services/DownloadQueue";
import { EventEmitter } from "./services/EventEmitter";
import { DatabaseService } from "./services/Database";
import { Scheduler } from "./services/Scheduler";
import { DownloadVerifier } from "./services/DownloadVerifier";
import { createDownloadAPI } from "./api/download";
import { createSubscriptionsAPI } from "./api/subscriptions";
import { createSchedulerAPI } from "./api/scheduler";
import { config } from "./config";
import { resolve, dirname, join } from "path";

const rootDir = resolve(dirname(import.meta.filename), "..", "..", "..");
const DOWNLOAD_DIR = resolve(rootDir, config.downloadDir!);
const DB_PATH = resolve(rootDir, config.dbPath!);

const db = new DatabaseService(DB_PATH);
const queue = new DownloadQueue(DOWNLOAD_DIR, 1, db);
const emitter = new EventEmitter();
const verifier = new DownloadVerifier(DOWNLOAD_DIR);

queue.setCallbacks({
  onTaskUpdated: (task) => {
    if (task.status === "completed") {
      emitter.broadcast({
        type: "task-completed",
        data: { id: task.id },
      });
    } else if (task.status === "failed") {
      emitter.broadcast({
        type: "task-failed",
        data: { id: task.id, error: task.error || "Unknown error" },
      });
    } else {
      emitter.broadcast({
        type: "task-progress",
        data: {
          id: task.id,
          progress: task.progress,
        },
      });
    }
  },
  onQueueChanged: () => {
    emitter.broadcast({
      type: "queue-info",
      data: queue.getQueueInfo(),
    });
  },
});

try {
  const archiveStats = await verifier.rebuildArchive(
    join(DOWNLOAD_DIR, "history.txt"),
  );
  console.log(
    `[🗂️] 启动重建归档完成: 扫描 ${archiveStats.total}, 保留 ${archiveStats.valid}, 删除损坏 ${archiveStats.removed}`,
  );
} catch (error) {
  console.error("[❌] 启动重建归档失败:", error);
}

const scheduler = new Scheduler(db, queue);

const app = new Elysia()
  .use(cors())
  .get("/health", () => ({
    status: "ok",
    timestamp: new Date().toISOString(),
  }))

  .ws("/ws", {
    open(ws) {
      try {
        console.log("[💬] WebSocket 连接已建立");
        emitter.addConnection(ws.raw);
        ws.send(
          JSON.stringify({
            type: "queue-info",
            data: queue.getQueueInfo(),
          }),
        );
      } catch (err) {
        console.error("[❌] WebSocket open 处理失败:", err);
      }
    },
    message(ws, message) {
      console.log("[📨] WebSocket 消息:", message);
    },
    close(ws) {
      console.log("[💬] WebSocket 连接已关闭");
      emitter.removeConnection(ws.raw);
    },
  })

  .use(createDownloadAPI(queue))
  .use(createSubscriptionsAPI({ db, queue }))
  .use(createSchedulerAPI({ scheduler }))

  .get("/public/*", (ctx) => {
    const filePath = `./public${ctx.path.replace("/public", "")}`;
    const file = Bun.file(filePath);
    try {
      return file;
    } catch {
      return new Response("Not Found", { status: 404 });
    }
  })

  .get("/", async () => {
    const file = Bun.file("./public/index.html");
    if (await file.exists()) {
      return new Response(file, {
        headers: { "Content-Type": "text/html" },
      });
    }
    return new Response("Welcome to yt-auto-downloader API", {
      headers: { "Content-Type": "text/plain" },
    });
  });

app.listen(config.port, () => {
  console.log(`🚀 服务器启动成功!`);
  console.log(`📍 API: http://localhost:${config.port}`);
  console.log(`🔌 WebSocket: ws://localhost:${config.port}/ws`);

  console.log("[🧠] 任务队列为内存会话模式，重启后自动清空");

  scheduler.start();
});

process.on("SIGINT", () => {
  console.log("\n[🛑] 收到 SIGINT，正在关闭...");
  scheduler.stop();
  queue.shutdown();
  process.exit(0);
});

process.on("SIGTERM", () => {
  console.log("\n[🛑] 收到 SIGTERM，正在关闭...");
  scheduler.stop();
  queue.shutdown();
  process.exit(0);
});

export { app, queue, emitter, scheduler };
