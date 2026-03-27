import { Elysia, t } from "elysia";
import type { DownloadQueue } from "../services/DownloadQueue";
import type { DownloadTask } from "@yt-auto-downloader/shared";

/**
 * 将内部 QueueTask 转换为 API 返回的 DownloadTask
 * @param {unknown} queueTask - 队列任务对象
 * @returns {DownloadTask} 下载任务对象
 */
function transformQueueTaskToDownloadTask(queueTask: unknown): DownloadTask {
  const task = queueTask as Record<string, unknown>;
  const id = task.id as string;
  const url = task.url as string;
  const title = task.title as string | undefined;
  const artist = task.artist as string | undefined;
  const status = task.status as DownloadTask["status"];
  const error = task.error as string | undefined;

  return {
    id: id ?? "",
    url: url ?? "",
    title: title ?? url ?? "未知标题",
    artist: artist ?? "Unknown",
    album: "",
    status: status ?? "pending",
    progress: Number(task.progress ?? 0),
    createdAt: Number(task.createdAt ?? Date.now()),
    updatedAt: Number(task.updatedAt ?? Date.now()),
    error: error ?? undefined,
  };
}

/**
 * 创建下载 API 路由
 * @param {DownloadQueue} queue - 下载队列实例
 * @returns {Elysia} Elysia 路由
 */
export function createDownloadAPI(queue: DownloadQueue) {
  return new Elysia({ prefix: "/api/download" })
    .post(
      "/add",
      ({ body }) => {
        const taskId = queue.addTask(body.url, body.title, body.artist);
        const queueTask = queue.getTask(taskId);
        return {
          success: true,
          data: {
            taskId,
            task: queueTask
              ? transformQueueTaskToDownloadTask(queueTask)
              : null,
          },
        };
      },
      {
        body: t.Object({
          url: t.String({ minLength: 1 }),
          title: t.Optional(t.String()),
          artist: t.Optional(t.String()),
        }),
      },
    )
    .post(
      "/bulk",
      ({ body }) => {
        const taskIds = queue.addBulkTasks(body.urls);
        return {
          success: true,
          data: {
            taskIds,
            count: taskIds.length,
          },
        };
      },
      {
        body: t.Object({
          urls: t.Array(t.String({ minLength: 1 })),
        }),
      },
    )
    .get("/queue", () => {
      const tasks = queue.getAllTasks();
      return {
        success: true,
        data: tasks.map(transformQueueTaskToDownloadTask),
      };
    })
    .get("/queue-info", () => ({
      success: true,
      data: queue.getQueueInfo(),
    }))
    .delete("/task/:id", ({ params }) => {
      const removed = queue.removeTask(params.id);
      return {
        success: removed,
        data: { removed },
      };
    })
    .post("/task/:id/pause", ({ params }) => {
      queue.pauseTask(params.id);
      const task = queue.getTask(params.id);
      return {
        success: true,
        data: task ? transformQueueTaskToDownloadTask(task) : null,
      };
    })
    .post("/task/:id/resume", ({ params }) => {
      queue.resumeTask(params.id);
      const task = queue.getTask(params.id);
      return {
        success: true,
        data: task ? transformQueueTaskToDownloadTask(task) : null,
      };
    })
    .post("/task/:id/retry", ({ params }) => {
      const task = queue.getTask(params.id);
      if (!task) {
        return {
          success: false,
          error: "Task not found",
        };
      }
      if (task.status !== "failed") {
        return {
          success: false,
          error: "Only failed tasks can be retried",
        };
      }
      queue.retryTask(params.id);
      const retriedTask = queue.getTask(params.id);
      return {
        success: true,
        data: retriedTask ? transformQueueTaskToDownloadTask(retriedTask) : null,
      };
    })
    .post("/clear-completed", () => {
      queue.clearCompleted();
      return {
        success: true,
        data: queue.getQueueInfo(),
      };
    })
    .post(
      "/sync-playlist",
      async ({ body }) => {
        const result = await queue.syncPlaylist(body.url);
        return {
          success: true,
          data: result,
        };
      },
      {
        body: t.Object({
          url: t.String({ minLength: 1 }),
        }),
      },
    )
    .get("/playlist-stats/:playlistId", ({ params }) => {
      const stats = queue.getPlaylistStats(params.playlistId);
      return {
        success: true,
        data: stats,
      };
    });
}
