import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { cleanup, fireEvent, renderHook } from "@testing-library/react";
import { holdDuration, useAltHold } from "./WeddingRain";

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
