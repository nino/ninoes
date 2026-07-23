// @vitest-environment jsdom
import { expect, test } from "vitest";
import { renderHook } from "@testing-library/react";
import { usePreviousValue } from "./usePreviousValue";

test("returns the current value while it is present", () => {
   const { result, rerender } = renderHook(
      ({ value }: { value: number | undefined }) => usePreviousValue(value),
      { initialProps: { value: 42 as number | undefined } },
   );
   expect(result.current).toBe(42);

   rerender({ value: 43 });
   expect(result.current).toBe(43);
});

test("keeps the last known value while the current one is nullish", () => {
   const { result, rerender } = renderHook(
      ({ value }: { value: number | undefined }) => usePreviousValue(value),
      { initialProps: { value: 42 as number | undefined } },
   );

   rerender({ value: undefined });
   expect(result.current).toBe(42);

   rerender({ value: 7 });
   expect(result.current).toBe(7);
});

test("returns null when no value has ever been present", () => {
   const { result } = renderHook(() => usePreviousValue<number>(undefined));
   expect(result.current).toBeNull();
});
