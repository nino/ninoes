import React from "react";

/**
 * Listens for `type` on `window`, or on the target `getTarget` returns. The
 * latest `listener` is always called, so an inline function is fine. The
 * target is looked up once, after mount, so it can touch browser-only APIs
 * like `matchMedia`.
 */
export function useEventListener<K extends keyof WindowEventMap>(
   type: K,
   listener: (event: WindowEventMap[K]) => void,
): void;
export function useEventListener<K extends keyof MediaQueryListEventMap>(
   type: K,
   listener: (event: MediaQueryListEventMap[K]) => void,
   getTarget: () => MediaQueryList,
): void;
export function useEventListener(
   type: string,
   listener: (event: Event) => void,
   getTarget: () => EventTarget = () => window,
): void {
   const onEvent = React.useEffectEvent(listener);
   const getTargetEvent = React.useEffectEvent(getTarget);

   React.useEffect(() => {
      const target = getTargetEvent();
      const handle = (event: Event): void => onEvent(event);
      target.addEventListener(type, handle);
      return () => target.removeEventListener(type, handle);
   }, [type]);
}
