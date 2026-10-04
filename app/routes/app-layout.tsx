import type { ReactNode } from "react";
import { Outlet } from "react-router";
import { Layout } from "~/components/Layout";
import { useSession } from "~/hooks/useSession";

/** The header and page frame around the voting app's pages. */
export default function AppLayout(): ReactNode {
   const { session } = useSession();
   return (
      <Layout signedIn={session != null}>
         <Outlet />
      </Layout>
   );
}
