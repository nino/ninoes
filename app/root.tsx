import {
   isRouteErrorResponse,
   Links,
   Meta,
   Outlet,
   Scripts,
   ScrollRestoration,
   useNavigation,
} from "react-router";
import { type ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "sonner";

import { initPostHog, reportError } from "~/posthog";

initPostHog();

import type { Route } from "./+types/root";
import "./app.css";

export const links: Route.LinksFunction = () => [
   { rel: "stylesheet", href: "/app.css" },
   // Bunny Fonts is a drop-in for Google Fonts that doesn't log visitors' IP addresses.
   { rel: "preconnect", href: "https://fonts.bunny.net" },
   {
      rel: "stylesheet",
      href: "https://fonts.bunny.net/css?family=bevan:400|bricolage-grotesque:400,500,600,700&display=swap",
   },
];

export function Layout({ children }: { children: ReactNode }): ReactNode {
   const nav = useNavigation();
   return (
      <html lang="en">
         <head>
            <meta charSet="utf-8" />
            <meta name="viewport" content="width=device-width, initial-scale=1" />
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

export default function App(): ReactNode {
   return (
      <QueryClientProvider client={queryClient}>
         <Outlet />
         <Toaster theme="system" />
      </QueryClientProvider>
   );
}

export function ErrorBoundary({ error }: Route.ErrorBoundaryProps): ReactNode {
   let message = "Oops!";
   let details = "An unexpected error occurred.";
   let stack: string | undefined;

   // The boundary catches route errors, so nothing else reports them. It can
   // stay mounted while the error changes, so this runs on every commit and
   // `reportError` skips what it already sent. A response the app threw on
   // purpose (a 404) isn't a bug.
   const report = (): void => {
      if (!isRouteErrorResponse(error) || error.status >= 500) {
         reportError(error);
      }
   };

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
      <main
         ref={(element) => {
            if (element) report();
         }}
         className="container mx-auto flex flex-col gap-2 p-4 pt-16"
      >
         <h1 className="font-title text-3xl">{message}</h1>
         <p className="text-muted-fg">{details}</p>
         {stack != null && (
            <pre className="w-full p-4 overflow-x-auto">
               <code>{stack}</code>
            </pre>
         )}
      </main>
   );
}
