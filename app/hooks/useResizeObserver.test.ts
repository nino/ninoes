import { describe, expect, it, vi, beforeEach } from "vitest";
import { renderHook } from "@testing-library/react";
import { useResizeObserver } from "./useResizeObserver";

describe("useResizeObserver", () => {
  let mockObserve: ReturnType<typeof vi.fn>;
  let mockDisconnect: ReturnType<typeof vi.fn>;
  let mockUnobserve: ReturnType<typeof vi.fn>;
  let ResizeObserverInstance: any;

  beforeEach(() => {
    mockObserve = vi.fn();
    mockDisconnect = vi.fn();
    mockUnobserve = vi.fn();

    // Store the callback for later use
    let observerCallback: ResizeObserverCallback;

    global.ResizeObserver = class ResizeObserver {
      constructor(callback: ResizeObserverCallback) {
        observerCallback = callback;
        ResizeObserverInstance = this;
      }
      observe = mockObserve;
      disconnect = mockDisconnect;
      unobserve = mockUnobserve;
      takeRecords() {
        return [];
      }

      // Helper to trigger the callback
      trigger(entries: ResizeObserverEntry[]) {
        observerCallback(entries, this);
      }
    } as any;
  });

  it("should not observe when element is null", () => {
    const onResize = vi.fn();

    renderHook(() => useResizeObserver(null, onResize));

    expect(mockObserve).not.toHaveBeenCalled();
  });

  it("should observe element when provided", () => {
    const element = document.createElement("div");
    const onResize = vi.fn();

    renderHook(() => useResizeObserver(element, onResize));

    expect(mockObserve).toHaveBeenCalledTimes(1);
    expect(mockObserve).toHaveBeenCalledWith(element);
  });

  it("should call onResize when element is resized", () => {
    const element = document.createElement("div");
    const onResize = vi.fn();

    renderHook(() => useResizeObserver(element, onResize));

    const mockEntries: ResizeObserverEntry[] = [
      {
        target: element,
        contentRect: {
          width: 100,
          height: 100,
          top: 0,
          left: 0,
          bottom: 100,
          right: 100,
          x: 0,
          y: 0,
          toJSON: () => ({}),
        },
        borderBoxSize: [],
        contentBoxSize: [],
        devicePixelContentBoxSize: [],
      } as ResizeObserverEntry,
    ];

    // Trigger resize
    ResizeObserverInstance.trigger(mockEntries);

    expect(onResize).toHaveBeenCalledTimes(1);
    // ResizeObserver callback receives (entries, observer) as parameters
    expect(onResize).toHaveBeenCalledWith(mockEntries, expect.anything());
  });

  it("should disconnect observer on unmount", () => {
    const element = document.createElement("div");
    const onResize = vi.fn();

    const { unmount } = renderHook(() => useResizeObserver(element, onResize));

    expect(mockDisconnect).not.toHaveBeenCalled();

    unmount();

    expect(mockDisconnect).toHaveBeenCalledTimes(1);
  });

  it("should update observer when element changes", () => {
    const element1 = document.createElement("div");
    const element2 = document.createElement("div");
    const onResize = vi.fn();

    const { rerender } = renderHook(
      ({ el }) => useResizeObserver(el, onResize),
      {
        initialProps: { el: element1 },
      }
    );

    expect(mockObserve).toHaveBeenCalledTimes(1);
    expect(mockObserve).toHaveBeenLastCalledWith(element1);

    const firstDisconnectCount = mockDisconnect.mock.calls.length;

    rerender({ el: element2 });

    // Should disconnect old observer and create new one
    expect(mockDisconnect).toHaveBeenCalledTimes(firstDisconnectCount + 1);
    expect(mockObserve).toHaveBeenCalledTimes(2);
    expect(mockObserve).toHaveBeenLastCalledWith(element2);
  });

  it("should update callback without recreating observer", () => {
    const element = document.createElement("div");
    const onResize1 = vi.fn();
    const onResize2 = vi.fn();

    const { rerender } = renderHook(
      ({ callback }) => useResizeObserver(element, callback),
      {
        initialProps: { callback: onResize1 },
      }
    );

    const observeCountAfterFirst = mockObserve.mock.calls.length;

    rerender({ callback: onResize2 });

    // Should not recreate observer when only callback changes
    expect(mockObserve).toHaveBeenCalledTimes(observeCountAfterFirst);

    // Hook should handle callback updates without errors
    expect(mockDisconnect).not.toHaveBeenCalled();
  });

  it("should handle element changing to null", () => {
    const element = document.createElement("div");
    const onResize = vi.fn();

    const { rerender } = renderHook(
      ({ el }) => useResizeObserver(el, onResize),
      {
        initialProps: { el: element as HTMLElement | null },
      }
    );

    expect(mockObserve).toHaveBeenCalledTimes(1);

    rerender({ el: null });

    expect(mockDisconnect).toHaveBeenCalledTimes(1);
  });

  it("should handle element changing from null to element", () => {
    const element = document.createElement("div");
    const onResize = vi.fn();

    const { rerender } = renderHook(
      ({ el }) => useResizeObserver(el, onResize),
      {
        initialProps: { el: null as HTMLElement | null },
      }
    );

    expect(mockObserve).not.toHaveBeenCalled();

    rerender({ el: element });

    expect(mockObserve).toHaveBeenCalledTimes(1);
    expect(mockObserve).toHaveBeenCalledWith(element);
  });

  it("should handle multiple resize events", () => {
    const element = document.createElement("div");
    const onResize = vi.fn();

    renderHook(() => useResizeObserver(element, onResize));

    const createMockEntry = (width: number, height: number): ResizeObserverEntry => ({
      target: element,
      contentRect: {
        width,
        height,
        top: 0,
        left: 0,
        bottom: height,
        right: width,
        x: 0,
        y: 0,
        toJSON: () => ({}),
      },
      borderBoxSize: [],
      contentBoxSize: [],
      devicePixelContentBoxSize: [],
    } as ResizeObserverEntry);

    ResizeObserverInstance.trigger([createMockEntry(100, 100)]);
    ResizeObserverInstance.trigger([createMockEntry(200, 150)]);
    ResizeObserverInstance.trigger([createMockEntry(300, 200)]);

    expect(onResize).toHaveBeenCalledTimes(3);
  });

  it("should handle multiple elements in entries array", () => {
    const element = document.createElement("div");
    const onResize = vi.fn();

    renderHook(() => useResizeObserver(element, onResize));

    const mockEntries: ResizeObserverEntry[] = [
      {
        target: element,
        contentRect: { width: 100, height: 100, top: 0, left: 0, bottom: 100, right: 100, x: 0, y: 0, toJSON: () => ({}) },
        borderBoxSize: [],
        contentBoxSize: [],
        devicePixelContentBoxSize: [],
      } as ResizeObserverEntry,
      {
        target: element,
        contentRect: { width: 200, height: 200, top: 0, left: 0, bottom: 200, right: 200, x: 0, y: 0, toJSON: () => ({}) },
        borderBoxSize: [],
        contentBoxSize: [],
        devicePixelContentBoxSize: [],
      } as ResizeObserverEntry,
    ];

    ResizeObserverInstance.trigger(mockEntries);

    expect(onResize).toHaveBeenCalledTimes(1);
    expect(onResize).toHaveBeenCalledWith(mockEntries, expect.anything());
  });
});
