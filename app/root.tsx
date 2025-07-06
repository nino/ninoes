import {
   isRouteErrorResponse,
   Links,
   Meta,
   Outlet,
   Scripts,
   ScrollRestoration,
   useNavigation,
} from "react-router";
import * as Sentry from "@sentry/react";
import { type ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useSession } from "./hooks/useSession";
import { Layout as OtherLayout } from "./components/Layout";
import { Button } from "./components/ui/Button";
import { Toaster } from "sonner";

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

export const links: Route.LinksFunction = () => [];

export function Layout({ children }: { children: ReactNode }): ReactNode {
   const nav = useNavigation();
   return (
      <html lang="en">
         <head>
            <meta charSet="utf-8" />
            <meta
               name="viewport"
               content="width=device-width, initial-scale=1"
            />
            <Meta />
            <Links />
            <style
               dangerouslySetInnerHTML={{
                  __html: `
              body {
                transition: opacity ease-in 0.2s;
              }
              body[unresolved] {
                opacity: 0;
                display: block;
              }
            `,
               }}
            />
         </head>
         <body className={nav.state === "loading" ? "opacity-40" : ""}>
            {children}
            <ScrollRestoration />
            <Scripts />
         </body>
      </html>
   );
}

const queryClient = new QueryClient({
   defaultOptions: {
      queries: {
         staleTime: 1000 * 60, // 1 minute
         refetchOnWindowFocus: true,
      },
   },
});

function AuthenticatedLayout({ children }: { children: ReactNode }): ReactNode {
   const { session } = useSession();
   return (
      <Layout>
         <OtherLayout>
            {children}
            {session && (
               <div className="fixed bottom-4 right-4">
                  <form action="/logout" method="post">
                     <Button variant="secondary" type="submit">
                        Sign Out
                     </Button>
                  </form>
               </div>
            )}
         </OtherLayout>
      </Layout>
   );
}

export default function App(): ReactNode {
   return (
      <QueryClientProvider client={queryClient}>
         <AuthenticatedLayout>
            <Outlet />
         </AuthenticatedLayout>
         <Toaster />
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
