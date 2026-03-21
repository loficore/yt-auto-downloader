import { useState, useEffect, useCallback } from "react";
import {
  ActionIcon,
  Badge,
  Button,
  Card,
  Grid,
  Group,
  NumberInput,
  Paper,
  Stack,
  Switch,
  Table,
  Text,
  TextInput,
  Title,
} from "@mantine/core";
import {
  IconAlertTriangle,
  IconClock,
  IconHash,
  IconPlaylist,
  IconRefresh,
  IconTrash,
  IconWaveSawTool,
} from "@tabler/icons-react";
import type { JSX } from "react";

interface Subscription {
  id: string;
  url: string;
  name: string;
  enabled: boolean;
  limitPerSync: number | null;
  lastSyncedAt: number | null;
  createdAt: number;
  updatedAt: number;
}

interface SchedulerStatus {
  enabled: boolean;
  cronExpression: string;
  timezone: string;
  nextRunAt: number | null;
  isRunning: boolean;
}

const DEFAULT_LIMIT_PER_SYNC = 10;

/**
 *  播放列表页面组件
 * @returns {JSX.Element} 渲染的播放列表页面组件
 * @description 播放列表页面组件，显示用户订阅的播放列表信息
 * 提供添加、启用/禁用、删除和同步订阅的功能
 * 显示调度器状态和下一次同步时间
 * 连接后端 API 获取数据并实时更新界面
 */
export function PlaylistsPage(): JSX.Element {
  const [url, setUrl] = useState("");
  const [name, setName] = useState("");
  const [limitPerSync, setLimitPerSync] = useState(DEFAULT_LIMIT_PER_SYNC);
  const [isAdding, setIsAdding] = useState(false);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [schedulerStatus, setSchedulerStatus] = useState<SchedulerStatus | null>(
    null,
  );
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const [subsRes, schedRes] = await Promise.all([
        fetch("/api/subscriptions"),
        fetch("/api/scheduler/status"),
      ]);
      const subsData = (await subsRes.json()) as { data: Subscription[] };
      const schedData = (await schedRes.json()) as { data: SchedulerStatus };
      setSubscriptions(subsData.data);
      setSchedulerStatus(schedData.data);
    } catch (error) {
      console.error("Failed to fetch data:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  const handleAdd = () => {
    if (!url) return;
    setIsAdding(true);
    void (async () => {
      try {
        const res = await fetch("/api/subscriptions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            url: url.trim(),
            name:
              name.trim() ||
              new URL(url.trim()).pathname.split("/").pop() ||
              "Playlist",
            limitPerSync,
          }),
        });
        const data = await res.json();
        if (data.success) {
          setUrl("");
          setName("");
          setLimitPerSync(DEFAULT_LIMIT_PER_SYNC);
          void fetchData();
        }
      } catch (error) {
        console.error("Failed to add subscription:", error);
      } finally {
        setIsAdding(false);
      }
    })();
  };

  const handleToggleEnabled = (id: string, enabled: boolean) => {
    void (async () => {
      try {
        await fetch(`/api/subscriptions/${id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ enabled }),
        });
        void fetchData();
      } catch (error) {
        console.error("Failed to update subscription:", error);
      }
    })();
  };

  const handleDelete = (id: string) => {
    void (async () => {
      try {
        await fetch(`/api/subscriptions/${id}`, { method: "DELETE" });
        void fetchData();
      } catch (error) {
        console.error("Failed to delete subscription:", error);
      }
    })();
  };

  const handleSync = (id: string) => {
    void (async () => {
      try {
        await fetch(`/api/subscriptions/${id}/sync`, { method: "POST" });
        void fetchData();
      } catch (error) {
        console.error("Failed to sync subscription:", error);
      }
    })();
  };

  const handleSyncAll = () => {
    setIsSyncing(true);
    void (async () => {
      try {
        await fetch("/api/subscriptions/sync-all", { method: "POST" });
        void fetchData();
      } catch (error) {
        console.error("Failed to sync all:", error);
      } finally {
        setIsSyncing(false);
      }
    })();
  };

  const formatDate = (timestamp: number | null) => {
    if (!timestamp) return "Never";
    return new Date(timestamp).toLocaleString();
  };

  const getNextSyncText = () => {
    if (!schedulerStatus?.enabled || !schedulerStatus.nextRunAt) {
      return "Disabled";
    }
    const diff = schedulerStatus.nextRunAt - Date.now();
    if (diff <= 0) return "Soon";
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}h ${minutes}m remaining`;
  };

  const isEmpty = subscriptions.length === 0;
  const enabledCount = subscriptions.filter((s) => s.enabled).length;
  const canSyncAll = !isEmpty && !isSyncing && !isLoading;

  return (
    <Stack gap="lg">
      <Title order={2}>My Playlists</Title>

      <Paper withBorder radius="lg" p="md">
        <Grid align="end" gutter="sm">
          <Grid.Col span={{ base: 12, lg: 6 }}>
            <TextInput
              value={url}
              onChange={(e) => setUrl(e.currentTarget.value)}
              label="Playlist URL"
              placeholder="Playlist URL to sync automatically"
              disabled={isAdding}
            />
          </Grid.Col>
          <Grid.Col span={{ base: 12, sm: 6, lg: 3 }}>
            <TextInput
              value={name}
              onChange={(e) => setName(e.currentTarget.value)}
              label="Name"
              placeholder="Name (optional)"
              disabled={isAdding}
            />
          </Grid.Col>
          <Grid.Col span={{ base: 12, sm: 6, lg: 2 }}>
            <NumberInput
              value={limitPerSync}
              onChange={(value) =>
                setLimitPerSync(typeof value === "number" && value > 0 ? value : 1)
              }
              min={1}
              max={10000}
              label="Limit per sync"
              placeholder="10"
              leftSection={<IconHash size={16} />}
            />
          </Grid.Col>
          <Grid.Col span={{ base: 12, lg: 1 }}>
            <Button
              fullWidth
              onClick={handleAdd}
              disabled={!url}
              loading={isAdding}
              leftSection={<IconWaveSawTool size={16} />}
            >
              Add
            </Button>
          </Grid.Col>
        </Grid>
      </Paper>

      <Grid>
        <Grid.Col span={{ base: 12, md: 4 }}>
          <Card withBorder radius="lg" p="md">
            <Group justify="space-between">
              <Stack gap={0}>
                <Text c="dimmed" size="sm">
                  Active
                </Text>
                <Text size="xl" fw={700}>
                  {enabledCount}
                  <Text span c="dimmed" size="sm">
                    {` / ${subscriptions.length}`}
                  </Text>
                </Text>
              </Stack>
              <Badge color="teal" variant="light" size="lg">
                <IconPlaylist size={16} />
              </Badge>
            </Group>
          </Card>
        </Grid.Col>

        <Grid.Col span={{ base: 12, md: 4 }}>
          <Card withBorder radius="lg" p="md">
            <Group justify="space-between">
              <Stack gap={0}>
                <Text c="dimmed" size="sm">
                  Next sync
                </Text>
                <Text size="xl" fw={700}>
                  {getNextSyncText()}
                </Text>
              </Stack>
              <Badge color="blue" variant="light" size="lg">
                <IconClock size={16} />
              </Badge>
            </Group>
          </Card>
        </Grid.Col>

        <Grid.Col span={{ base: 12, md: 4 }}>
          <Card withBorder radius="lg" p="md">
            <Group justify="space-between" align="center">
              <Stack gap={0}>
                <Text c="dimmed" size="sm">
                  Batch action
                </Text>
                <Text fw={600}>Sync all subscriptions</Text>
              </Stack>
              <Button
                onClick={handleSyncAll}
                disabled={!canSyncAll}
                loading={isSyncing}
                leftSection={<IconRefresh size={16} />}
              >
                Sync now
              </Button>
            </Group>
          </Card>
        </Grid.Col>
      </Grid>

      {!schedulerStatus?.enabled ? (
        <Paper withBorder radius="md" p="sm" bg="yellow.0">
          <Group gap="xs">
            <IconAlertTriangle size={16} color="#ca8a04" />
            <Text c="yellow.8" fw={600} size="sm">
              Scheduler is disabled.
            </Text>
          </Group>
        </Paper>
      ) : null}

      {!isEmpty ? (
        <Paper withBorder radius="lg" p="sm">
          <Table.ScrollContainer minWidth={860}>
            <Table highlightOnHover striped>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>NAME</Table.Th>
                  <Table.Th>URL</Table.Th>
                  <Table.Th>MAX ITEMS</Table.Th>
                  <Table.Th>LAST SYNCED</Table.Th>
                  <Table.Th>ENABLED</Table.Th>
                  <Table.Th>ACTIONS</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {subscriptions.map((sub) => (
                  <Table.Tr key={sub.id}>
                    <Table.Td>{sub.name}</Table.Td>
                    <Table.Td>
                      <Text size="xs" style={{ wordBreak: "break-all" }}>
                        {sub.url}
                      </Text>
                    </Table.Td>
                    <Table.Td>{sub.limitPerSync}</Table.Td>
                    <Table.Td>{formatDate(sub.lastSyncedAt)}</Table.Td>
                    <Table.Td>
                      <Switch
                        checked={sub.enabled}
                        onChange={(e) =>
                          handleToggleEnabled(sub.id, e.currentTarget.checked)
                        }
                        size="sm"
                      />
                    </Table.Td>
                    <Table.Td>
                      <Group gap="xs">
                        <ActionIcon
                          variant="light"
                          onClick={() => handleSync(sub.id)}
                          disabled={isSyncing}
                          aria-label="同步订阅"
                        >
                          <IconRefresh size={16} />
                        </ActionIcon>
                        <ActionIcon
                          color="red"
                          variant="light"
                          onClick={() => handleDelete(sub.id)}
                          aria-label="删除订阅"
                        >
                          <IconTrash size={16} />
                        </ActionIcon>
                      </Group>
                    </Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          </Table.ScrollContainer>
        </Paper>
      ) : (
        <Paper withBorder radius="lg" p="xl">
          <Stack align="center" gap={4}>
            <IconPlaylist size={42} color="#94a3b8" />
            <Text fw={600} c="dimmed">
              No playlists subscribed yet.
            </Text>
            <Text size="sm" c="dimmed">
              Add a playlist URL above to get started.
            </Text>
          </Stack>
        </Paper>
      )}
    </Stack>
  );
}
