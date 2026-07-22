import { type ButtonHTMLAttributes, type ReactNode } from "react";

type ButtonVariant = "primary" | "secondary" | "danger" | "ghost";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
   variant?: ButtonVariant;
   isLoading?: boolean;
   big?: boolean;
}

export function Button({
   children,
   variant = "primary",
   isLoading = false,
   className = "",
   disabled,
   big,
   ...props
}: ButtonProps): ReactNode {
   const variantStyles: Record<ButtonVariant, string> = {
      primary: "aqua-btn--blue",
      secondary: "",
      danger: "aqua-btn--red",
      ghost: "aqua-btn--ghost",
   };

   return (
      <button
         className={`
        aqua-btn
        ${variantStyles[variant]}
        ${big ? "aqua-btn--big" : ""}
        ${isLoading ? "is-loading" : ""}
        ${className}
      `}
         disabled={(disabled ?? false) || isLoading}
         {...props}
      >
         {children}
         {isLoading && (
            <div className="aqua-btn__spinner text-gray-600">
               <span className="sr-only">Loading</span>
            </div>
         )}
      </button>
   );
}
