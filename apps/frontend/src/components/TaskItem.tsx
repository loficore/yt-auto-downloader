import { memo } from "react";
import type { DownloadTask } from "@yt-auto-downloader/shared";
import { ActionIcon, Badge, Card, Group, Progress, Stack, Text } from "@mantine/core";
import { IconRefresh, IconTrash } from "@tabler/icons-react";

const STATUS_LABELS: Record<string, string> = {
  pending: "⏳ 等待中",
  downloading: "⬇️ 下载中",
  completed: "✅ 已完成",
  failed: "❌ 失败",
  paused: "⏸️ 暂停",
};

const STATUS_COLORS: Record<string, string> = {
  pending: "#f59e0b",
  downloading: "#3b82f6",
  completed: "#10b981",
  failed: "#ef4444",
  paused: "#8b5cf6",
};

interface TaskItemProps {
  task: DownloadTask;
  onRemove: (id: string) => void;
  onRetry?: (id: string) => void;
}

export const TaskItem = memo(function TaskItem({
  task,
  onRemove,
  onRetry,
}: TaskItemProps) {
  const displayTitle = task.title && task.title !== task.url ? task.title : "未知标题";
  const displayArtist = task.artist?.trim() ? task.artist : "Unknown";

  return (
    <Card withBorder radius="md" padding="md">
      <Stack gap="sm">
        <Group justify="space-between" align="flex-start" wrap="nowrap">
          <Stack gap={2} style={{ minWidth: 0, flex: 1 }}>
            <Text fw={600} size="sm" truncate>
              {displayTitle}
            </Text>
            <Text c="dimmed" size="xs">
              {displayArtist}
              {task.album ? ` • ${task.album}` : ""}
            </Text>
            <Group gap="xs">
              <Badge
                size="sm"
                style={{ backgroundColor: STATUS_COLORS[task.status] || "#6b7280" }}
              >
                {STATUS_LABELS[task.status] || task.status}
              </Badge>
              {task.error ? (
                <Text c="red.6" size="xs" truncate>
                  {task.error}
                </Text>
              ) : null}
            </Group>
          </Stack>
          <Group gap="xs">
            {task.status === "failed" && onRetry && (
              <ActionIcon
                variant="subtle"
                color="blue"
                onClick={() => onRetry(task.id)}
                aria-label="重试任务"
              >
                <IconRefresh size={16} />
              </ActionIcon>
            )}
            <ActionIcon
              variant="subtle"
              color="red"
              onClick={() => onRemove(task.id)}
              aria-label="删除任务"
            >
              <IconTrash size={16} />
            </ActionIcon>
          </Group>
        </Group>

        {task.status === "downloading" ? (
          <Group gap="sm" align="center">
            <Progress value={task.progress} radius="xl" style={{ flex: 1 }} />
            <Text c="dimmed" size="xs" fw={600}>
              {task.progress}%
            </Text>
          </Group>
        ) : null}
      </Stack>
    </Card>
  );
});
