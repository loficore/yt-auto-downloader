import { DownloadList } from "../components/DownloadList";
import { QueueStats } from "../components/QueueStats";
import { useWebSocket } from "../hooks/useWebSocket";
import { useDownloadTasks } from "../hooks/useDownloadTasks";
import { Badge, Group, Stack, Title } from "@mantine/core";
import type { JSX } from "react";

/**
 *  下载页面组件
 * @returns {JSX.Element} 渲染的下载页面组件
 * @description 下载页面组件，显示下载任务列表和队列状态
 * 连接 WebSocket 实时更新下载任务状态
 * 提供删除任务和清除已完成任务的功能
 * 显示连接状态指示灯
 */
export function DownloadsPage(): JSX.Element {
  const {
    tasks,
    queueInfo,
    removeTask,
    clearCompleted,
    refreshTasks,
    handleWebSocketMessage,
  } = useDownloadTasks();

  const { connected } = useWebSocket({
    onMessage: handleWebSocketMessage,
    onConnect: () => {
      void refreshTasks();
    },
  });

  const handleRemoveTask = (id: string) => {
    void removeTask(id);
  };

  const handleClearCompleted = () => {
    void clearCompleted();
  };

  return (
    <Stack gap="lg">
      <Group justify="space-between" align="center">
        <Title order={2}>Downloads</Title>
        <Badge color={connected ? "teal" : "red"} variant="light" size="lg">
          {connected ? "Connected" : "Disconnected"}
        </Badge>
      </Group>
      <QueueStats stats={queueInfo} />
      <DownloadList
        tasks={tasks}
        onRemove={handleRemoveTask}
        onClearCompleted={handleClearCompleted}
      />
    </Stack>
  );
}
