import type { ReactNode } from "react";
import { Outlet } from "react-router";
import { Layout } from "~/components/Layout";
import { Button } from "~/components/ui/Button";
import { useSession } from "~/hooks/useSession";

/** The Aqua window around the voting app's pages. */
export default function AquaLayout(): ReactNode {
   const { session } = useSession();
   return (
      <Layout>
         <Outlet />
         {session && (
            <div className="flex my-16 justify-end">
               <form action="/logout" method="post">
                  <Button variant="secondary" type="submit">
                     Sign Out
                  </Button>
               </form>
            </div>
         )}
      </Layout>
   );
}
