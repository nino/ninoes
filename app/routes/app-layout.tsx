import type { ReactNode } from "react";
import { Outlet } from "react-router";
import { Layout } from "~/components/Layout";
import { useSession } from "~/hooks/useSession";
import type { Route } from "./+types/app-layout";

// The wishlist sits outside this layout and has its own favicon.
export const links: Route.LinksFunction = () => [
   { rel: "icon", href: "/favicon.svg", type: "image/svg+xml" },
   { rel: "apple-touch-icon", href: "/apple-touch-icon.png" },
];

/** The header and page frame around the voting app's pages. */
export default function AppLayout(): ReactNode {
   const { session } = useSession();
   return (
      <Layout signedIn={session != null}>
         <Outlet />
      </Layout>
   );
}
