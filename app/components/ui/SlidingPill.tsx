import React from "react";

/**
 * The highlight behind the selected option of a segmented control. It slides to
 * its new position with an overshoot, and wiggles every time `wiggleKey` changes
 * (pass 0 to skip the wiggle on first render). `dir` is 1 when the pill moves
 * right and -1 when it moves left, so it leans into the slide.
 *
 * Position it with `className` or `style`; the parent must be `relative`.
 */
export function SlidingPill({
   className = "",
   style,
   dir,
   wiggleKey,
}: {
   className?: string;
   style?: React.CSSProperties;
   dir: 1 | -1;
   wiggleKey: number;
}): React.ReactNode {
   return (
      <span
         aria-hidden
         className={`pointer-events-none absolute inset-y-[3px] transition-[translate,width] duration-500 ease-[cubic-bezier(0.3,1.9,0.45,0.9)] motion-reduce:transition-none ${
            dir === 1 ? "[--dir:1]" : "[--dir:-1]"
         } ${className}`}
         style={style}
      >
         <span
            key={wiggleKey}
            className={`block size-full rounded-md bg-card shadow-xs motion-reduce:animate-none ${
               wiggleKey > 0 ? "animate-pill-wiggle" : ""
            }`}
         />
      </span>
   );
}
