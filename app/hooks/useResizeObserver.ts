import React from "react";

export function useResizeObserver(
   element: HTMLElement | null,
   onResize: (entries: Array<ResizeObserverEntry>) => void,
): void {
   const onResizeRef = React.useRef(onResize);
   React.useEffect(() => {
      onResizeRef.current = onResize;
   });

   React.useEffect(() => {
      if (!element) {
         return;
      }

      const observer = new ResizeObserver(onResizeRef.current);
      observer.observe(element);

      return observer.disconnect;
   }, [element]);
}
