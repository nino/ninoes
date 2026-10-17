const realResizeObserver = globalThis.ResizeObserver;

/**
 * happy-dom has no layout, so components that size themselves with a
 * ResizeObserver never get a width. This reports `width` for every observed
 * element. Undo with restoreResizeObserver().
 */
export function stubResizeObserver(width: number): void {
   globalThis.ResizeObserver = class {
      callback: ResizeObserverCallback;
      constructor(callback: ResizeObserverCallback) {
         this.callback = callback;
      }
      observe(): void {
         const entry = { contentRect: { width } } as unknown as ResizeObserverEntry;
         this.callback([entry], this as unknown as ResizeObserver);
      }
      disconnect(): void {}
   } as unknown as typeof ResizeObserver;
}

export function restoreResizeObserver(): void {
   globalThis.ResizeObserver = realResizeObserver;
}
