import type { QueueInfo } from "@yt-auto-downloader/shared";
import { Card, Group, SimpleGrid, Text, ThemeIcon, Title } from "@mantine/core";
import {
  IconAlertTriangle,
  IconCircleDashed,
  IconClock,
  IconDownload,
  IconListCheck,
} from "@tabler/icons-react";

interface QueueStatsProps {
  stats: QueueInfo;
}

/**
 * 队列统计组件
 * @param {QueueStatsProps} param0 组件属性，包括队列信息
 * @returns {JSX.Element} 渲染的队列统计组件
 */
export function QueueStats({ stats }: QueueStatsProps) {
  const items = [
    {
      label: "总计",
      value: stats.total,
      color: "blue",
      icon: IconListCheck,
    },
    {
      label: "等待中",
      value: stats.pending,
      color: "yellow",
      icon: IconClock,
    },
    {
      label: "下载中",
      value: stats.downloading,
      color: "cyan",
      icon: IconDownload,
    },
    {
      label: "已完成",
      value: stats.completed,
      color: "teal",
      icon: IconCircleDashed,
    },
    {
      label: "失败",
      value: stats.failed,
      color: "red",
      icon: IconAlertTriangle,
    },
  ] as const;

  return (
    <Card radius="lg" withBorder shadow="sm" p="lg">
      <Group justify="space-between" mb="md">
        <Title order={4}>队列统计</Title>
      </Group>
      <SimpleGrid cols={{ base: 1, sm: 2, md: 5 }} spacing="sm">
        {items.map((item) => (
          <Card key={item.label} radius="md" withBorder padding="sm">
            <Group justify="space-between" align="flex-start">
              <div>
                <Text c="dimmed" size="xs" fw={600} tt="uppercase">
                  {item.label}
                </Text>
                <Text size="xl" fw={700} c={`${item.color}.6`}>
                  {item.value}
                </Text>
              </div>
              <ThemeIcon color={item.color} variant="light" radius="xl" size="lg">
                <item.icon size={16} />
              </ThemeIcon>
            </Group>
          </Card>
        ))}
      </SimpleGrid>
    </Card>
  );
}
