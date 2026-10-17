import React from "react";

/**
 * Runs `effect` once after the component mounts, and its cleanup once on
 * unmount. This is the escape hatch for the `useEffect` ban: anything that
 * would need dependencies is either derived state, an event handler, or a
 * component that should be remounted with a `key`.
 */
export function useMountEffect(effect: React.EffectCallback): void {
   // oxlint-disable-next-line react/exhaustive-deps -- mount-only by design
   React.useEffect(effect, []);
}
