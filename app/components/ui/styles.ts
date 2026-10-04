// Class strings shared by the Button and Input components and the wishlist,
// which builds its own controls from them.

export const focusRing =
   "outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:shadow-glow";

export const buttonBase = `inline-flex shrink-0 items-center justify-center gap-2 rounded-md font-medium transition-colors ${focusRing} disabled:pointer-events-none disabled:opacity-50 [&_svg]:size-4 [&_svg]:shrink-0`;

export const buttonColors = {
   primary: "bg-primary text-primary-fg shadow-xs hover:bg-primary/90",
   outline: "border border-border bg-card shadow-xs hover:bg-muted",
   ghost: "text-muted-fg hover:bg-muted hover:text-fg",
   danger: "bg-danger text-white shadow-xs hover:bg-danger/90",
   dangerGhost: "text-danger hover:bg-danger/10",
   dangerOutline:
      "border border-border bg-card text-danger shadow-xs hover:bg-danger/10",
} as const;

export const primaryButton = `${buttonBase} h-10 px-4 text-sm whitespace-nowrap ${buttonColors.primary}`;
export const outlineButton = `${buttonBase} h-10 px-4 text-sm whitespace-nowrap ${buttonColors.outline}`;
export const ghostButton = `${buttonBase} h-9 px-3 text-sm whitespace-nowrap ${buttonColors.ghost}`;
export const dangerButton = `${buttonBase} h-10 px-4 text-sm whitespace-nowrap ${buttonColors.danger}`;
export const dangerGhostButton = `${buttonBase} h-10 px-3 text-sm whitespace-nowrap ${buttonColors.dangerGhost}`;

export const inputClass =
   "w-full min-w-0 rounded-md border border-input bg-field px-3 text-base shadow-xs transition-[color,box-shadow] outline-none placeholder:text-muted-fg focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:shadow-glow aria-invalid:border-danger aria-invalid:ring-danger/20 sm:text-sm";

export const cardClass = "rounded-xl border border-border bg-card shadow-xs";
