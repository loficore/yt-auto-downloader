import { memo, useMemo, useState } from "react";
import type { DownloadTask } from "@yt-auto-downloader/shared";
import { Button, Card, Group, SegmentedControl, Stack, Text, Title } from "@mantine/core";
import { TaskItem } from "./TaskItem";

type FilterValue = "all" | "downloading" | "pending" | "completed" | "failed";

interface DownloadListProps {
  tasks: DownloadTask[];
  onRemove: (id: string) => void;
  onClearCompleted: () => void;
  onRetry?: (id: string) => void;
}

const FILTER_OPTIONS: { value: FilterValue; label: string }[] = [
  { value: "all", label: "全部" },
  { value: "downloading", label: "下载中" },
  { value: "pending", label: "等待中" },
  { value: "completed", label: "已完成" },
  { value: "failed", label: "失败" },
];

export const DownloadList = memo(function DownloadList({
  tasks,
  onRemove,
  onClearCompleted,
  onRetry,
}: DownloadListProps) {
  const [filter, setFilter] = useState<FilterValue>("all");

  const filteredTasks = useMemo(() => {
    if (filter === "all") return tasks;
    return tasks.filter((t) => t.status === filter);
  }, [tasks, filter]);

  const hasCompleted = useMemo(
    () => tasks.some((t) => t.status === "completed"),
    [tasks],
  );

  const filterCounts = useMemo(() => {
    return {
      all: tasks.length,
      downloading: tasks.filter((t) => t.status === "downloading").length,
      pending: tasks.filter((t) => t.status === "pending").length,
      completed: tasks.filter((t) => t.status === "completed").length,
      failed: tasks.filter((t) => t.status === "failed").length,
    };
  }, [tasks]);

  return (
    <Card withBorder radius="lg" shadow="sm" p="lg">
      <Group justify="space-between" mb="md">
        <Title order={4}>下载列表</Title>
        <Group gap="sm">
          <SegmentedControl
            value={filter}
            onChange={(v) => setFilter(v as FilterValue)}
            data={FILTER_OPTIONS.map((opt) => ({
              value: opt.value,
              label: `${opt.label} (${filterCounts[opt.value as keyof typeof filterCounts]})`,
            }))}
            size="xs"
          />
          {hasCompleted && (
            <Button variant="light" color="gray" onClick={onClearCompleted}>
              清理已完成
            </Button>
          )}
        </Group>
      </Group>

      {filteredTasks.length === 0 ? (
        <Stack align="center" justify="center" py={54} gap={4}>
          <Text c="dimmed" fw={600}>
            暂无任务
          </Text>
          <Text c="dimmed" size="sm">
            {filter === "all" ? "添加 URL 后将在这里显示下载进度" : "当前筛选条件下没有任务"}
          </Text>
        </Stack>
      ) : (
        <Stack gap="sm">
          {filteredTasks.map((task) => (
            <TaskItem key={task.id} task={task} onRemove={onRemove} onRetry={onRetry} />
          ))}
        </Stack>
      )}
    </Card>
  );
});
