import { type ButtonHTMLAttributes, type ReactNode } from "react";
import { buttonBase, buttonColors } from "./styles";

type ButtonVariant = "primary" | "secondary" | "danger" | "ghost";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
   variant?: ButtonVariant;
   isLoading?: boolean;
   big?: boolean;
}

const variantStyles: Record<ButtonVariant, string> = {
   primary: buttonColors.primary,
   secondary: buttonColors.outline,
   danger: buttonColors.dangerOutline,
   ghost: buttonColors.ghost,
};

export function Button({
   children,
   variant = "primary",
   isLoading = false,
   className = "",
   disabled,
   big,
   ...props
}: ButtonProps): ReactNode {
   return (
      <button
         className={`relative ${buttonBase} ${variantStyles[variant]} ${
            // Long candidate names must wrap rather than overflow the page.
            big ? "min-h-14 px-7 py-3 text-lg" : "h-10 px-4 text-sm whitespace-nowrap"
         } ${isLoading ? "text-transparent!" : ""} ${className}`}
         disabled={(disabled ?? false) || isLoading}
         {...props}
      >
         {children}
         {isLoading && (
            <span
               className={`absolute inset-0 flex items-center justify-center ${
                  variant === "primary"
                     ? "text-primary-fg"
                     : variant === "danger"
                       ? "text-danger"
                       : "text-muted-fg"
               }`}
            >
               <span className="size-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
               <span className="sr-only">Loading</span>
            </span>
         )}
      </button>
   );
}
