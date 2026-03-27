import { useState, useCallback } from "react";
import type { DownloadTask, QueueInfo, WebSocketMessage, PlaylistSyncResult } from "@yt-auto-downloader/shared";
import { requestApi } from "../utils/api";
import {
  isTaskArray,
  isAddTaskData,
  isBulkImportData,
  isRemoveTaskData,
  isQueueInfo,
  isRecord,
  isRetryTaskData,
} from "../utils/typeGuards";
import { logger } from "../utils/logger";

function isPlaylistSyncResult(value: unknown): value is PlaylistSyncResult {
  if (!isRecord(value)) return false;
  return (
    typeof value.added === "number" &&
    typeof value.total === "number" &&
    typeof value.downloaded === "number"
  );
}

/**
 * 下载任务管理 Hook
 * 提供下载任务列表、队列信息以及相关操作函数
 * 通过 WebSocket 实时更新任务状态和队列信息
 */
export interface UseDownloadTasksReturn {
  /** 下载任务列表 */
  tasks: DownloadTask[];
  /** 下载队列信息 */
  queueInfo: QueueInfo;
  /** 添加下载任务 */
  addTask: (url: string) => Promise<void>;
  /** 批量导入下载任务 */
  bulkImport: (urls: string[]) => Promise<void>;
  /** 移除下载任务 */
  removeTask: (id: string) => Promise<void>;
  /** 清除已完成的下载任务 */
  clearCompleted: () => Promise<void>;
  /** 重试失败的任务 */
  retryTask: (id: string) => Promise<void>;
  /** 同步播放列表 */
  syncPlaylist: (playlistUrl: string) => Promise<PlaylistSyncResult | null>;
  /** 刷新下载任务列表 */
  refreshTasks: () => Promise<void>;
  /** 处理 WebSocket 消息 */
  handleWebSocketMessage: (message: WebSocketMessage) => void;
}

/**
 *  使用下载任务管理 Hook
 * @returns {UseDownloadTasksReturn}  下载任务管理相关数据和函数
 */
export function useDownloadTasks(): UseDownloadTasksReturn {
  const [tasks, setTasks] = useState<DownloadTask[]>([]);
  const [queueInfo, setQueueInfo] = useState<QueueInfo>({
    total: 0,
    pending: 0,
    downloading: 0,
    completed: 0,
    failed: 0,
  });

  const handleWebSocketMessage = useCallback((message: WebSocketMessage) => {
    switch (message.type) {
      case "task-added":
        setTasks((prev) => [...prev, message.data]);
        break;
      case "task-progress":
        setTasks((prev) =>
          prev.map((t) =>
            t.id === message.data.id
              ? { ...t, progress: message.data.progress }
              : t,
          ),
        );
        break;
      case "queue-info":
        setQueueInfo(message.data);
        break;
      case "task-completed":
        setTasks((prev) =>
          prev.map((t) =>
            t.id === message.data.id
              ? { ...t, status: "completed", progress: 100 }
              : t,
          ),
        );
        break;
      case "task-failed":
        setTasks((prev) =>
          prev.map((t) =>
            t.id === message.data.id
              ? { ...t, status: "failed", error: message.data.error }
              : t,
          ),
        );
        break;
    }
  }, []);

  const refreshTasks = useCallback(async () => {
    try {
      const data = await requestApi("/api/download/queue", isTaskArray);
      setTasks(data);
    } catch (err: unknown) {
      logger.error("Failed to fetch queue", { error: err });
    }
  }, []);

  const addTask = useCallback(async (url: string): Promise<void> => {
    try {
      const data = await requestApi("/api/download/add", isAddTaskData, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });
      logger.info("Task added", { taskId: data.taskId });
    } catch (err: unknown) {
      logger.error("Failed to add task", { error: err });
    }
  }, []);

  const bulkImport = useCallback(async (urls: string[]): Promise<void> => {
    try {
      const data = await requestApi("/api/download/bulk", isBulkImportData, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ urls }),
      });
      logger.info("Bulk import completed", { count: data.count });
    } catch (err: unknown) {
      logger.error("Failed to bulk import", { error: err });
    }
  }, []);

  const removeTask = useCallback(async (id: string): Promise<void> => {
    try {
      const data = await requestApi("/api/download/task", isRemoveTaskData, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      if (data.removed) {
        setTasks((prev) => prev.filter((t) => t.id !== id));
      }
    } catch (err: unknown) {
      logger.error("Failed to remove task", { error: err });
    }
  }, []);

  const clearCompleted = useCallback(async (): Promise<void> => {
    try {
      await requestApi("/api/download/clear-completed", isQueueInfo, {
        method: "POST",
      });
      setTasks((prev) => prev.filter((t) => t.status !== "completed"));
    } catch (err: unknown) {
      logger.error("Failed to clear completed", { error: err });
    }
  }, []);

  const retryTask = useCallback(async (id: string): Promise<void> => {
    try {
      const data = await requestApi(`/api/download/task/${id}/retry`, isRetryTaskData, {
        method: "POST",
      });
      if (data.task) {
        setTasks((prev) =>
          prev.map((t) =>
            t.id === id ? { ...t, status: "pending", progress: 0, error: undefined } : t,
          ),
        );
      }
    } catch (err: unknown) {
      logger.error("Failed to retry task", { error: err });
    }
  }, []);

  const syncPlaylist = useCallback(async (playlistUrl: string): Promise<PlaylistSyncResult | null> => {
    try {
      const data = await requestApi("/api/download/sync-playlist", isPlaylistSyncResult, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: playlistUrl }),
      });
      logger.info("Playlist synced", { added: data.added, total: data.total, downloaded: data.downloaded });
      return data;
    } catch (err: unknown) {
      logger.error("Failed to sync playlist", { error: err });
      return null;
    }
  }, []);

  return {
    tasks,
    queueInfo,
    addTask,
    bulkImport,
    removeTask,
    clearCompleted,
    retryTask,
    syncPlaylist,
    refreshTasks,
    handleWebSocketMessage,
  };
}
