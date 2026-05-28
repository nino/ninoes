import React from "react";

/**
 * Calls `callback` every `delayMs`. Pass `null` as the delay to pause the
 * interval. The latest `callback` is always used without restarting the timer,
 * so an inline function is fine and won't reset the cadence on every render.
 */
export function useInterval(callback: () => void, delayMs: number | null): void {
   const savedCallback = React.useRef(callback);

   React.useEffect(() => {
      savedCallback.current = callback;
   }, [callback]);

   React.useEffect(() => {
      if (delayMs == null) return;
      const id = setInterval(() => savedCallback.current(), delayMs);
      return () => clearInterval(id);
   }, [delayMs]);
}
