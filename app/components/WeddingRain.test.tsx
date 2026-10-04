import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { cleanup, fireEvent, renderHook } from "@testing-library/react";
import { flipWindow, holdDuration, useAltHold, useFlipBack } from "./WeddingRain";

beforeEach(() => {
   vi.useFakeTimers();
});

afterEach(() => {
   cleanup();
   vi.useRealTimers();
});

test("holding Alt for five seconds triggers the callback once", () => {
   const onHold = vi.fn();
   renderHook(() => useAltHold(onHold));

   fireEvent.keyDown(window, { key: "Alt" });
   vi.advanceTimersByTime(holdDuration - 1);
   fireEvent.keyDown(window, { key: "Alt", repeat: true });
   expect(onHold).not.toHaveBeenCalled();

   vi.advanceTimersByTime(1);
   expect(onHold).toHaveBeenCalledTimes(1);
});

test("releasing Alt early cancels it", () => {
   const onHold = vi.fn();
   renderHook(() => useAltHold(onHold));

   fireEvent.keyDown(window, { key: "Alt" });
   vi.advanceTimersByTime(holdDuration - 100);
   fireEvent.keyUp(window, { key: "Alt" });
   vi.advanceTimersByTime(holdDuration);

   expect(onHold).not.toHaveBeenCalled();
});

test("pressing another key while holding Alt cancels it", () => {
   const onHold = vi.fn();
   renderHook(() => useAltHold(onHold));

   fireEvent.keyDown(window, { key: "Alt" });
   vi.advanceTimersByTime(1000);
   fireEvent.keyDown(window, { key: "e", altKey: true });
   vi.advanceTimersByTime(holdDuration);

   expect(onHold).not.toHaveBeenCalled();
});

function fakeOrientation(): (landscape: boolean) => void {
   const listeners = new Set<(event: MediaQueryListEvent) => void>();
   vi.stubGlobal("matchMedia", (query: string) => ({
      media: query,
      addEventListener: (_: string, listener: (event: MediaQueryListEvent) => void) =>
         listeners.add(listener),
      removeEventListener: (_: string, listener: (event: MediaQueryListEvent) => void) =>
         listeners.delete(listener),
   }));
   return (landscape) => {
      // oxlint-disable-next-line typescript/consistent-type-assertions -- only `matches` is read
      const event = { matches: landscape } as MediaQueryListEvent;
      for (const listener of listeners) listener(event);
   };
}

test("turning the phone sideways and straight back triggers the callback", () => {
   const rotate = fakeOrientation();
   const onFlip = vi.fn();
   renderHook(() => useFlipBack(onFlip));

   rotate(true);
   vi.advanceTimersByTime(flipWindow - 100);
   rotate(false);

   expect(onFlip).toHaveBeenCalledTimes(1);
   vi.unstubAllGlobals();
});

test("staying sideways for too long doesn't trigger it", () => {
   const rotate = fakeOrientation();
   const onFlip = vi.fn();
   renderHook(() => useFlipBack(onFlip));

   rotate(true);
   vi.advanceTimersByTime(flipWindow + 100);
   rotate(false);

   expect(onFlip).not.toHaveBeenCalled();
   vi.unstubAllGlobals();
});

test("starting sideways and turning upright doesn't trigger it", () => {
   const rotate = fakeOrientation();
   const onFlip = vi.fn();
   renderHook(() => useFlipBack(onFlip));

   rotate(false);

   expect(onFlip).not.toHaveBeenCalled();
   vi.unstubAllGlobals();
});
