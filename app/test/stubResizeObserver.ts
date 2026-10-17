import { vi } from "vitest";

/**
 * jsdom has no layout, so components that size themselves with a ResizeObserver
 * never get a width. This reports `width` for every observed element. Undo with
 * vi.unstubAllGlobals().
 */
export function stubResizeObserver(width: number): void {
   vi.stubGlobal(
      "ResizeObserver",
      class {
         callback: ResizeObserverCallback;
         constructor(callback: ResizeObserverCallback) {
            this.callback = callback;
         }
         observe(): void {
            const entry = { contentRect: { width } } as unknown as ResizeObserverEntry;
            this.callback([entry], this as unknown as ResizeObserver);
         }
         disconnect(): void {}
      },
   );
}
