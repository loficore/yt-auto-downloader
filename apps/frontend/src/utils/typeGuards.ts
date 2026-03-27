import type { DownloadTask, QueueInfo, WebSocketMessage } from "@yt-auto-downloader/shared";

/**
 * 检查值是否为记录类型
 * @param {unknown} value  要检查的值
 * @returns {boolean}  如果值是记录类型，则返回 true；否则返回 false
 */
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export { isRecord };

/**
 * 检查值是否为下载任务类型
 * @param {unknown} value  要检查的值
 * @returns {boolean}  如果值是下载任务类型，则返回 true；否则返回 false
 */
export function isDownloadTask(value: unknown): value is DownloadTask {
  if (!isRecord(value)) return false;
  return (
    typeof value.id === "string" &&
    typeof value.url === "string" &&
    typeof value.status === "string" &&
    typeof value.progress === "number" &&
    typeof value.createdAt === "number" &&
    typeof value.updatedAt === "number" &&
    typeof value.title === "string"
  );
}

/**
 * 检查值是否为队列信息类型
 * @param {unknown} value  要检查的值
 * @returns {boolean}  如果值是队列信息类型，则返回 true；否则返回 false
 */
export function isQueueInfo(value: unknown): value is QueueInfo {
  if (!isRecord(value)) return false;
  return (
    typeof value.total === "number" &&
    typeof value.pending === "number" &&
    typeof value.downloading === "number" &&
    typeof value.completed === "number" &&
    typeof value.failed === "number"
  );
}

/**
 * 检查值是否为 WebSocket 消息类型
 * @param {unknown} value  要检查的值
 * @returns {boolean}  如果值是 WebSocket 消息类型，则返回 true；否则返回 false
 */
export function isWebSocketMessage(value: unknown): value is WebSocketMessage {
  if (
    !isRecord(value) ||
    typeof value.type !== "string" ||
    !("data" in value)
  ) {
    return false;
  }

  const data = value.data;
  switch (value.type) {
    case "task-added":
      return isDownloadTask(data);
    case "task-progress":
      return (
        isRecord(data) &&
        typeof data.id === "string" &&
        typeof data.progress === "number"
      );
    case "task-completed":
      return isRecord(data) && typeof data.id === "string";
    case "task-failed":
      return (
        isRecord(data) &&
        typeof data.id === "string" &&
        typeof data.error === "string"
      );
    case "queue-info":
      return isQueueInfo(data);
    case "task-log":
      return (
        isRecord(data) &&
        typeof data.id === "string" &&
        typeof data.log === "string"
      );
    default:
      return false;
  }
}

/**
 * 检查值是否为下载任务数组类型
 * @param {unknown} value  要检查的值
 * @returns {boolean}  如果值是下载任务数组类型，则返回 true；否则返回 false
 */
export function isTaskArray(value: unknown): value is DownloadTask[] {
  return Array.isArray(value) && value.every((item) => isDownloadTask(item));
}

/**
 * 检查值是否为队列信息数组类型
 */
export interface AddTaskData {
  /** 任务 ID */
  taskId: string;
  /** 任务数据，如果添加失败则为 null */
  task: DownloadTask | null;
}

/**
 * 检查值是否为添加任务数据类型
 * @param {unknown} value  要检查的值
 * @returns {boolean}  如果值是添加任务数据类型，则返回 true；否则返回 false
 */
export function isAddTaskData(value: unknown): value is AddTaskData {
  return (
    isRecord(value) &&
    typeof value.taskId === "string" &&
    (value.task === null || isDownloadTask(value.task))
  );
}

/**
 * 批量导入数据类型
 */
export interface BulkImportData {
  /** 导入的任务 ID 列表 */
  taskIds: string[];
  /** 成功导入的任务数量 */
  count: number;
}

/**
 * 检查值是否为批量导入数据类型
 * @param {unknown} value  要检查的值
 * @returns {boolean}  如果值是批量导入数据类型，则返回 true；否则返回 false
 */
export function isBulkImportData(value: unknown): value is BulkImportData {
  return (
    isRecord(value) &&
    Array.isArray(value.taskIds) &&
    value.taskIds.every((item) => typeof item === "string") &&
    typeof value.count === "number"
  );
}

/**
 * 移除任务数据类型
 */
export interface RemoveTaskData {
  /** 是否成功移除 */
  removed: boolean;
}

/**
 * 检查值是否为移除任务数据类型
 * @param {unknown} value  要检查的值
 * @returns {boolean}  如果值是移除任务数据类型，则返回 true；否则返回 false
 */
export function isRemoveTaskData(value: unknown): value is RemoveTaskData {
  return isRecord(value) && typeof value.removed === "boolean";
}

/**
 * 重试任务响应类型
 */
export interface RetryTaskData {
  /** 重试后的任务数据 */
  task: DownloadTask | null;
}

/**
 * 检查值是否为重试任务数据类型
 * @param {unknown} value  要检查的值
 * @returns {boolean}  如果值是重试任务数据类型，则返回 true；否则返回 false
 */
export function isRetryTaskData(value: unknown): value is RetryTaskData {
  return isRecord(value) && (value.task === null || isDownloadTask(value.task));
}
