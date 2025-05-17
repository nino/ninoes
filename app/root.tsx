import "@ant-design/v5-patch-for-react-19";
import { App as AntApp } from "antd";
import {
  isRouteErrorResponse,
  Link,
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
  useNavigation,
} from "react-router";
import * as Sentry from "@sentry/react";
import { useSyncExternalStore, type ReactNode } from "react";
import { ConfigProvider, theme } from "antd";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Button, Layout as AntdLayout, Menu } from "antd";

if (import.meta.env.PROD) {
  Sentry.init({
    dsn: "https://6dedc280f764a89de4caa4d2af92ff01@o4508201817407488.ingest.de.sentry.io/4508789873180752",
    integrations: [
      Sentry.browserTracingIntegration(),
      Sentry.replayIntegration(),
    ],
    // Tracing
    tracesSampleRate: 1.0, //  Capture 100% of the transactions
    // Set 'tracePropagationTargets' to control for which URLs distributed tracing should be enabled
    tracePropagationTargets: ["localhost", /^https:\/\/yourserver\.io\/api/],
    // Session Replay
    replaysSessionSampleRate: 0.1, // This sets the sample rate at 10%. You may want to change it to 100% while in development and then sample at a lower rate in production.
    replaysOnErrorSampleRate: 1.0, // If you're not already sampling the entire session, change the sample rate to 100% when sampling sessions where errors occur.
  });
}

import type { Route } from "./+types/root";
import "./app.css";
import { useSession } from "./hooks/useSession";

export const links: Route.LinksFunction = () => [];

export function Layout({ children }: { children: ReactNode }): ReactNode {
  const nav = useNavigation();
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <Meta />
        <Links />
      </head>
      <body className={nav.state === "loading" ? "opacity-40" : ""}>
        {children}
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

function useSystemDarkMode(): boolean {
  const mediaQuery = "(prefers-color-scheme: dark)";

  const subscribe = (callback: () => void) => {
    const matchMedia = window.matchMedia(mediaQuery);
    matchMedia.addEventListener("change", callback);
    return () => matchMedia.removeEventListener("change", callback);
  };

  const getSnapshot = (): boolean => {
    return window.matchMedia(mediaQuery).matches;
  };

  const getServerSnapshot = (): boolean => false;

  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60, // 1 minute
      refetchOnWindowFocus: false,
    },
  },
});

function AuthenticatedLayout({ children }: { children: ReactNode }): ReactNode {
  const { session } = useSession();
  return (
    <AntdLayout>
      <AntdLayout.Header>
        <Menu
          items={[
            { key: "home", title: "Home", label: <Link to="/">Home 🏠</Link> },
            { key: "vote", title: "Vote", label: <Link to="/vote">Vote 🏩</Link> },
            {
              key: "teams",
              title: "Teams",
              label: <Link to="/teams">Teams 🏃‍♂️</Link>,
            },
            {
              key: "elo",
              title: "Elo Leaderboard",
              label: <Link to="/elo">Elo Leaderboard</Link>,
            },
            {
              key: "leaderboard",
              title: "Leaderboard",
              label: <Link to="/leaderboard">Leaderboard 🥇</Link>,
            },
          ]}
          mode="horizontal"
          theme="dark"
        />
      </AntdLayout.Header>

      <AntdLayout.Content className="p-4 md:p-8">{children}</AntdLayout.Content>
      <AntdLayout.Footer>
        {session && (
          <form action="/logout" method="post">
            <Button htmlType="submit">Sign Out</Button>
          </form>
        )}
      </AntdLayout.Footer>
    </AntdLayout>
  );
}

export default function App(): ReactNode {
  const isDarkMode = useSystemDarkMode();

  return (
    <QueryClientProvider client={queryClient}>
      <ConfigProvider
        theme={{
          token: {
            colorPrimary: "#835",
            borderRadius: 6,
          },
          algorithm: isDarkMode ? theme.darkAlgorithm : theme.defaultAlgorithm,
        }}
      >
        <AntApp>
          {/* {isLoading ? (
            <div className="flex m-8 justify-center">
              <Spin />
            </div>
          ) : session ? (
            <AuthenticatedLayout>
              <Outlet />
            </AuthenticatedLayout>
          ) : (
            <Auth />
          )} */}
          <AuthenticatedLayout>
            <Outlet />
          </AuthenticatedLayout>
        </AntApp>
      </ConfigProvider>
    </QueryClientProvider>
  );
}

export function ErrorBoundary({ error }: Route.ErrorBoundaryProps): ReactNode {
  let message = "Oops!";
  let details = "An unexpected error occurred.";
  let stack: string | undefined;

  if (isRouteErrorResponse(error)) {
    message = error.status === 404 ? "404" : "Error";
    details =
      error.status === 404
        ? "The requested page could not be found."
        : error.statusText || details;
  } else if (import.meta.env.DEV && error != null && error instanceof Error) {
    details = error.message;
    stack = error.stack;
  }

  return (
    <main className="pt-16 p-4 container mx-auto">
      <h1>{message}</h1>
      <p>{details}</p>
      {stack != null && (
        <pre className="w-full p-4 overflow-x-auto">
          <code>{stack}</code>
        </pre>
      )}
    </main>
  );
}
