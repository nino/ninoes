import React from "react";

/**
 * Returns the given value, or — while it is nullish — the last non-nullish
 * value it had on an earlier render. Useful for keeping stale-but-valid
 * data on screen (a page count, a total) while a refetch is in flight, so
 * UI doesn't disappear and reappear.
 *
 * Why this shape? "Remember something from a previous render" has three
 * candidate implementations, and two of them are wrong:
 *
 * - A ref written in an effect can't be *read* during render: React (and
 *   the React Compiler, which this repo lints for) assumes render output
 *   never depends on `ref.current`, so a memoized render could keep using
 *   a stale value.
 * - `useEffect(() => setLast(value))` works but commits a render with the
 *    old value first and immediately schedules a second one — a guaranteed
 *    double render (the "cascading renders" lint error).
 * - Calling setState *during* render, guarded so it only fires on change,
 *   is React's sanctioned pattern for exactly this ("storing information
 *   from previous renders"): React discards the in-progress render before
 *   anything reaches the DOM and re-renders synchronously with the new
 *   state. One commit, no stale frame.
 */
export function usePreviousValue<T extends string | number | boolean | bigint>(
   value: T | null | undefined,
): T | null {
   const [last, setLast] = React.useState<T | null>(null);
   // T is constrained to primitives because this guard compares by identity:
   // an object or array recreated on each render would never compare equal,
   // and the render-time setState would loop forever. (Object.is rather than
   // !== so that NaN converges too.)
   if (value != null && !Object.is(value, last)) {
      setLast(value);
   }
   return value ?? last;
}
