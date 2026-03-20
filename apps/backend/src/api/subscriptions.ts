import { Elysia, t } from "elysia";
import type { DatabaseService } from "../services/Database";
import type { DownloadQueue } from "../services/DownloadQueue";

interface SubscriptionAPIContext {
  db: DatabaseService;
  queue: DownloadQueue;
}

function transformSubscription(sub: ReturnType<DatabaseService["getSubscriptions"]>[number]) {
  return {
    id: sub.id,
    url: sub.url,
    name: sub.name,
    enabled: sub.enabled,
    maxItems: sub.max_items,
    lastSyncedAt: sub.last_synced_at,
    createdAt: sub.created_at,
    updatedAt: sub.updated_at,
  };
}

/**
 * 创建订阅 API
 * @param {SubscriptionAPIContext} param0 - 包含数据库和服务实例的上下文
 * @returns {Elysia} 配置好的 Elysia 实例
 */
export function createSubscriptionsAPI({ db, queue }: SubscriptionAPIContext) {
  return new Elysia({ prefix: "/api/subscriptions" })
    .get("", () => {
      const subscriptions = db.getSubscriptions();
      return {
        success: true,
        data: subscriptions.map(transformSubscription),
      };
    })
    .post(
      "",
      ({ body }) => {
        const { url, name, maxItems } = body;
        const existing = db.getSubscriptions();
        const found = existing.find((s) => s.url === url);

        if (found) {
          return {
            success: false,
            error: "Subscription with this URL already exists",
          };
        }

        const subscription = db.addSubscription(url, name, maxItems);
        return {
          success: true,
          data: transformSubscription(subscription),
        };
      },
      {
        body: t.Object({
          url: t.String({ minLength: 1 }),
          name: t.String({ minLength: 1 }),
          maxItems: t.Optional(t.Number({ minimum: 1 })),
        }),
      },
    )
    .put(
      "/:id",
      ({ params, body }) => {
        const { id } = params;
        const { name, enabled, maxItems } = body;

        const updates: Partial<{
          name: string;
          enabled: boolean;
          max_items: number;
          last_synced_at: number | null;
        }> = {};

        if (name !== undefined) updates.name = name;
        if (enabled !== undefined) updates.enabled = enabled;
        if (maxItems !== undefined) updates.max_items = maxItems;

        const success = db.updateSubscription(id, updates);

        if (!success) {
          return {
            success: false,
            error: "Subscription not found",
          };
        }

        const subscriptions = db.getSubscriptions();
        const updated = subscriptions.find((s) => s.id === id);

        return {
          success: true,
          data: updated ? transformSubscription(updated) : null,
        };
      },
      {
        params: t.Object({ id: t.String() }),
        body: t.Object({
          name: t.Optional(t.String({ minLength: 1 })),
          enabled: t.Optional(t.Boolean()),
          maxItems: t.Optional(t.Number({ minimum: 1 })),
        }),
      },
    )
    .delete("/:id", ({ params }) => {
      const { id } = params;
      const success = db.deleteSubscription(id);

      return {
        success,
        data: { deleted: success },
      };
    })
    .post(
      "/:id/sync",
      async ({ params }) => {
        const { id } = params;
        const subscriptions = db.getSubscriptions();
        const subscription = subscriptions.find((s) => s.id === id);

        if (!subscription) {
          return {
            success: false,
            error: "Subscription not found",
          };
        }

        const result = await queue.syncPlaylist(subscription.url);

        db.updateSubscription(id, { last_synced_at: Date.now() });

        return {
          success: true,
          data: result,
        };
      },
      {
        params: t.Object({ id: t.String() }),
      },
    )
    .post("/sync-all", async () => {
      const subscriptions = db.getEnabledSubscriptions();
      const results = [];

      for (const subscription of subscriptions) {
        const result = await queue.syncPlaylist(subscription.url);
        db.updateSubscription(subscription.id, { last_synced_at: Date.now() });
        results.push({
          id: subscription.id,
          name: subscription.name,
          ...result,
        });
      }

      return {
        success: true,
        data: results,
      };
    });
}
