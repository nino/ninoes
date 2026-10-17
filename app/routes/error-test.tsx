import { type ReactNode, useState } from "react";
import { Link, type LoaderFunctionArgs } from "react-router";
import { Button } from "~/components/ui/Button";
import { outlineButton } from "~/components/ui/styles";

// Throws errors on purpose, to check that each kind reaches PostHog: one from
// a click handler (posthog-js's uncaught-error capture), one during render
// (the root ErrorBoundary) and one from the loader (handleError on the server).

export const loader = ({ request }: LoaderFunctionArgs): null => {
   if (new URL(request.url).searchParams.has("server")) {
      throw new Error("Test error from the /error-test loader");
   }
   return null;
};

function ThrowWhileRendering(): ReactNode {
   throw new Error("Test error while rendering /error-test");
}

export default function ErrorTest(): ReactNode {
   const [renderError, setRenderError] = useState(false);

   return (
      <div className="flex flex-col items-start gap-4 p-4">
         <h1 className="font-title text-2xl">Error test</h1>
         <p className="text-muted-fg">
            Each button throws a test error that should show up in PostHog.
         </p>
         <Button
            variant="danger"
            onClick={() => {
               throw new Error("Test error from an /error-test click handler");
            }}
         >
            Throw in a click handler
         </Button>
         <Button variant="danger" onClick={() => setRenderError(true)}>
            Throw while rendering
         </Button>
         <Link className={outlineButton} to="?server" reloadDocument>
            Throw on the server
         </Link>
         {renderError && <ThrowWhileRendering />}
      </div>
   );
}
