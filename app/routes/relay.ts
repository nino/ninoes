import { relay } from "~/utils/posthog-relay";
import type { Route } from "./+types/relay";

// PostHog's endpoints, served from this site so tracker blockers let them
// through. See `app/utils/posthog-relay.ts`.
export function loader({ request, params }: Route.LoaderArgs): Promise<Response> {
   return relay(request, params["*"]);
}

export function action({ request, params }: Route.ActionArgs): Promise<Response> {
   return relay(request, params["*"]);
}
