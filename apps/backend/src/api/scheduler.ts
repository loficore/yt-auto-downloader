import { Elysia } from "elysia";
import type { Scheduler } from "../services/Scheduler";

interface SchedulerAPIContext {
  scheduler: Scheduler;
}

/**
 * 创建调度器 API
 * @param {SchedulerAPIContext} param0 - 包含调度器实例的上下文
 * @returns {Elysia} 配置好的 Elysia 实例
 */
export function createSchedulerAPI({ scheduler }: SchedulerAPIContext) {
  return new Elysia({ prefix: "/api/scheduler" })
    .get("/status", () => {
      const status = scheduler.getStatus();
      return {
        success: true,
        data: status,
      };
    })
    .post("/sync-now", async () => {
      await scheduler.syncNow();
      return {
        success: true,
        data: { message: "Sync started" },
      };
    });
}
