import type { JSX } from "react";

/** A shimmering placeholder block; size it with className. */
export function Skeleton({ className }: { className: string }): JSX.Element {
   return <div className={`skeleton rounded-md ${className}`} />;
}
