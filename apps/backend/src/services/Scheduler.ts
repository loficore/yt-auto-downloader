import CronExpressionParser from "cron-parser";
import { config } from "../config";
import { logger } from "@yt-auto-downloader/shared";
import type { DatabaseService } from "./Database";
import type { DownloadQueue } from "./DownloadQueue";

/**
 * 调度器状态接口
 */
export interface SchedulerStatus {
  /** 调度器是否启用 */
  enabled: boolean;
  /** Cron 表达式 */
  cronExpression: string;
  /** 时区 */
  timezone: string;
  /** 下次运行时间（时间戳） */
  nextRunAt: number | null;
  /** 调度器是否正在运行 */
  isRunning: boolean;
}

/**
 * 调度器服务
 */
export class Scheduler {
  private db: DatabaseService;
  private queue: DownloadQueue;
  private task: ReturnType<typeof setInterval> | null = null;
  private nextRunAt: Date | null = null;
  private isRunning = false;

  /**
   * 初始化调度器
   * @param {DatabaseService} db - 数据库服务实例
   * @param {DownloadQueue} queue  - 下载队列服务实例
   */
  constructor(db: DatabaseService, queue: DownloadQueue) {
    this.db = db;
    this.queue = queue;
  }

  /**
   * 获取调度器状态
   * @returns {SchedulerStatus} 调度器的状态
   */
  getStatus(): SchedulerStatus {
    return {
      enabled: config.schedulerEnabled,
      cronExpression: config.schedulerCron ?? "0 6 * * *",
      timezone: config.timezone ?? "UTC",
      nextRunAt: this.nextRunAt?.getTime() ?? null,
      isRunning: this.isRunning,
    };
  }

  /**
   * 启动调度器
   */
  start(): void {
    if (!config.schedulerEnabled) {
      logger.info("Scheduler is disabled");
      return;
    }

    if (this.isRunning) {
      return;
    }

    this.isRunning = true;
    void this.scheduleNextRun();
    logger.info("Scheduler started", {
      cron: config.schedulerCron,
      timezone: config.timezone,
      nextRunAt: this.nextRunAt?.toISOString(),
    });
  }

  /**
   * 停止调度器
   * 清除定时任务，重置状态
   */
  stop(): void {
    if (this.task) {
      clearTimeout(this.task);
      this.task = null;
    }
    this.isRunning = false;
    this.nextRunAt = null;
    logger.info("Scheduler stopped");
  }

  private scheduleNextRun(): void {
    try {
      const cron = config.schedulerCron ?? "0 6 * * *";
      const tz = config.timezone ?? "UTC";
      const interval = CronExpressionParser.parse(cron, { tz });
      this.nextRunAt = interval.next().toDate();

      const now = Date.now();
      const nextRunMs = this.nextRunAt.getTime() - now;
      const delay = Math.max(0, nextRunMs);

      logger.info("Scheduler next run scheduled", {
        nextRunAt: this.nextRunAt.toISOString(),
        delayMs: delay,
      });

      this.task = setTimeout(() => {
        this.run();
      }, delay);
    } catch (error) {
      logger.error("Failed to parse cron expression", {
        cron: config.schedulerCron,
        error,
      });
    }
  }

  private async run(): Promise<void> {
    if (!config.schedulerEnabled) {
      this.stop();
      return;
    }

    logger.info("Scheduler running sync");

    try {
      const subscriptions = this.db.getEnabledSubscriptions();

      for (const subscription of subscriptions) {
        try {
          logger.info("Syncing subscription", {
            id: subscription.id,
            name: subscription.name,
            url: subscription.url,
            limitPerSync: subscription.limit_per_sync,
          });

          const result = await this.queue.syncPlaylist(
            subscription.url,
            subscription.limit_per_sync ?? undefined,
          );

          this.db.updateSubscription(subscription.id, {
            last_synced_at: Date.now(),
          });

          logger.info("Subscription synced", {
            id: subscription.id,
            name: subscription.name,
            added: result.added,
            total: result.total,
            downloaded: result.downloaded,
          });
        } catch (error) {
          logger.error("Failed to sync subscription", {
            id: subscription.id,
            name: subscription.name,
            error,
          });
        }
      }
    } catch (error) {
      logger.error("Scheduler run failed", { error });
    }

    this.scheduleNextRun();
  }

  /**
   * 立即执行一次同步
   */
  async syncNow(): Promise<void> {
    await this.run();
  }
}
