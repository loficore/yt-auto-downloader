import { Elysia } from "elysia";
import { cors } from "@elysiajs/cors";
import { DownloadQueue } from "./services/DownloadQueue";
import { EventEmitter } from "./services/EventEmitter";
import { DatabaseService } from "./services/Database";
import { createDownloadAPI } from "./api/download";
import { config } from "./config";
import { resolve, dirname } from "path";

const rootDir = resolve(dirname(import.meta.filename), "..", "..", "..");
const DOWNLOAD_DIR = resolve(rootDir, config.downloadDir);
const DB_PATH = resolve(rootDir, config.dbPath);

const db = new DatabaseService(DB_PATH);
const queue = new DownloadQueue(DOWNLOAD_DIR, 1, db);
const emitter = new EventEmitter();

queue.setCallbacks({
  onTaskUpdated: (task) => {
    emitter.broadcast({
      type: "task-progress",
      data: {
        id: task.id,
        progress: task.progress,
      },
    });
  },
  onQueueChanged: () => {
    emitter.broadcast({
      type: "queue-info",
      data: queue.getQueueInfo(),
    });
  },
});

queue.loadFromDatabase();

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
});

process.on("SIGINT", () => {
  console.log("\n[🛑] 收到 SIGINT，正在关闭...");
  queue.shutdown();
  process.exit(0);
});

process.on("SIGTERM", () => {
  console.log("\n[🛑] 收到 SIGTERM，正在关闭...");
  queue.shutdown();
  process.exit(0);
});

export { app, queue, emitter };
