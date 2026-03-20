import { memo, useMemo } from "react";
import type { DownloadTask } from "@yt-auto-downloader/shared";
import { Button, Card, Group, Stack, Text, Title } from "@mantine/core";
import { TaskItem } from "./TaskItem";

interface DownloadListProps {
  tasks: DownloadTask[];
  onRemove: (id: string) => void;
  onClearCompleted: () => void;
}

export const DownloadList = memo(function DownloadList({
  tasks,
  onRemove,
  onClearCompleted,
}: DownloadListProps) {
  const hasCompleted = useMemo(
    () => tasks.some((t) => t.status === "completed"),
    [tasks],
  );

  return (
    <Card withBorder radius="lg" shadow="sm" p="lg">
      <Group justify="space-between" mb="md">
        <Title order={4}>下载列表</Title>
        {hasCompleted && (
          <Button variant="light" color="gray" onClick={onClearCompleted}>
            清理已完成
          </Button>
        )}
      </Group>

      {tasks.length === 0 ? (
        <Stack align="center" justify="center" py={54} gap={4}>
          <Text c="dimmed" fw={600}>
            暂无任务
          </Text>
          <Text c="dimmed" size="sm">
            添加 URL 后将在这里显示下载进度
          </Text>
        </Stack>
      ) : (
        <Stack gap="sm">
          {tasks.map((task) => (
            <TaskItem key={task.id} task={task} onRemove={onRemove} />
          ))}
        </Stack>
      )}
    </Card>
  );
});
