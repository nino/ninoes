import React from "react";
import { useInterval } from "./useInterval";
import { utcDay } from "~/utils/blog-stats";

/**
 * Today's UTC date as "YYYY-MM-DD", kept current while the page stays open: it's
 * rechecked every minute and whenever the window regains focus, which is also
 * when React Query refetches.
 */
export function useUtcToday(): string {
   const [today, setToday] = React.useState(() => utcDay(new Date()));
   const update = React.useCallback(() => setToday(utcDay(new Date())), []);

   useInterval(update, 60_000);
   React.useEffect(() => {
      window.addEventListener("focus", update);
      return () => window.removeEventListener("focus", update);
   }, [update]);

   return today;
}
