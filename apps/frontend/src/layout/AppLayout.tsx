import type { JSX } from "react";
import { Link, Outlet } from "@tanstack/react-router";
import { AppShell, Container, Group, Text } from "@mantine/core";

export function AppLayout(): JSX.Element {
  return (
    <AppShell header={{ height: 72 }} footer={{ height: 54 }} padding="lg">
      <AppShell.Header className="app-header-shell">
        <Container size="xl" h="100%">
          <Group h="100%" justify="space-between" wrap="nowrap">
            <Text fw={700} size="lg" c="dark.8">
              YouTube Auto Downloader
            </Text>
            <Group gap="xs" wrap="nowrap">
              <Link
                to="/"
                className="app-nav-link"
                activeProps={{ className: "app-nav-link app-nav-link-active" }}
                inactiveProps={{ className: "app-nav-link" }}
                activeOptions={{ exact: true }}
              >
                Downloads
              </Link>
              <Link
                to="/playlists"
                className="app-nav-link"
                activeProps={{ className: "app-nav-link app-nav-link-active" }}
                inactiveProps={{ className: "app-nav-link" }}
              >
                Playlists
              </Link>
            </Group>
          </Group>
        </Container>
      </AppShell.Header>

      <AppShell.Main>
        <Container size="xl" py="lg">
          <Outlet />
        </Container>
      </AppShell.Main>

      <AppShell.Footer className="app-footer-shell">
        <Container size="xl" h="100%">
          <Group h="100%" justify="center">
            <Text size="sm" c="dimmed">
              Built for music workflow automation
            </Text>
          </Group>
        </Container>
      </AppShell.Footer>
    </AppShell>
  );
}
