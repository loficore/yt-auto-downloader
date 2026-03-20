import { MantineProvider, createTheme } from "@mantine/core";
import { Notifications } from "@mantine/notifications";
import {
  createRootRoute,
  createRoute,
  createRouter,
  useNavigate,
} from "@tanstack/react-router";
import { useEffect } from "react";
import { AppLayout } from "./layout/AppLayout";
import { DownloadsPage } from "./pages/Downloads.tsx";
import { PlaylistsPage } from "./pages/Playlists.tsx";
import type { JSX } from "react";

const appTheme = createTheme({
  primaryColor: "blue",
  defaultRadius: "md",
  fontFamily: "IBM Plex Sans, Noto Sans SC, Segoe UI, sans-serif",
});

function RootLayout(): JSX.Element {
  return (
    <MantineProvider theme={appTheme} defaultColorScheme="light">
      <Notifications position="top-right" />
      <AppLayout />
    </MantineProvider>
  );
}

function NotFoundRedirect() {
  const navigate = useNavigate();
  useEffect(() => {
    navigate({ to: "/" });
  }, []);
  return null;
}

const rootRoute = createRootRoute({
  component: RootLayout,
  notFoundComponent: NotFoundRedirect,
});

const downloadsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  component: DownloadsPage,
});

const playlistsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/playlists",
  component: PlaylistsPage,
});

const routeTree = rootRoute.addChildren([downloadsRoute, playlistsRoute]);

export const router = createRouter({ routeTree });
