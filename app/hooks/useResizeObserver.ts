import React from "react";

/**
 * Calls `onResize` whenever `element` changes size, and once when it is
 * first observed. The latest `onResize` is always used, so an inline
 * function is fine.
 */
export function useResizeObserver(
   element: Element | null,
   onResize: (entries: Array<ResizeObserverEntry>) => void,
): void {
   const onResizeEvent = React.useEffectEvent(onResize);

   React.useEffect(() => {
      if (!element) {
         return;
      }

      const observer = new ResizeObserver((entries) => onResizeEvent(entries));
      observer.observe(element);

      return () => observer.disconnect();
   }, [element]);
}
