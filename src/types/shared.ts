/** 下载任务状态*/
export type DownloadStatus =
  | "pending"
  | "downloading"
  | "completed"
  | "failed"
  | "paused";

/** 下载任务接口 */
export interface DownloadTask {
  /** 任务唯一标识符 */
  id: string;
  /** 视频标题 */
  title: string;
  /** 视频 URL */
  url: string;
  /** 可选的艺术家信息 */
  artist?: string;
  /** 可选的专辑信息 */
  album?: string;
  /** 任务状态 */
  status: DownloadStatus;
  /** 下载进度，0-100 */
  progress: number; // 0-100
  /** 任务创建时间戳 */
  createdAt: number;
  /** 任务更新时间戳 */
  updatedAt: number;
  /** 可选的错误信息 */
  error?: string;
}

/** 队列信息*/
export interface QueueInfo {
  /** 队列中任务总数 */
  total: number;
  /** 等待中的任务数 */
  pending: number;
  /** 下载中的任务数 */
  downloading: number;
  /** 已完成的任务数 */
  completed: number;
  /** 失败的任务数 */
  failed: number;
}

/** WebSocket 消息类型  */
export type WebSocketMessage =
  | {
      /** 任务添加消息 */
      type: "task-added";
      /** 任务数据 */
      data: DownloadTask;
    }
  | {
      /** 任务进度更新消息 */
      type: "task-progress";
      /** 任务进度数据 */
      data: {
        /** 任务唯一标识符 */
        id: string;
        /** 下载进度，0-100 */
        progress: number;
      };
    }
  | {
      /** 任务完成消息 */
      type: "task-completed";
      /** 任务完成数据 */
      data: {
        /** 任务唯一标识符 */
        id: string;
      };
    }
  | {
      /** 任务失败消息 */
      type: "task-failed";
      /** 任务失败数据 */
      data: {
        /** 任务唯一标识符 */
        id: string;
        /** 错误信息 */
        error: string;
      };
    }
  | {
      /**
       * 队列统计更新消息
       */
      type: "queue-info";
      /** 队列统计数据 */
      data: QueueInfo;
    }
  | {
      /** 任务日志消息 */
      type: "task-log";
      /** 任务日志数据 */
      data: {
        /** 任务唯一标识符 */
        id: string;
        /** 日志内容 */
        log: string;
      };
    };

/**
 * API 响应接口
 * @template T - 响应数据类型
 */
export interface ApiResponse<T> {
  /** 响应是否成功 */
  success: boolean;
  /** 响应数据 */
  data?: T;
  /** 错误信息 */
  error?: string;
}
