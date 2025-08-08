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
   const baseStyles =
      "px-3 py-1 w-full rounded-[0.75rem] shadow-lg font-medium transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 active:rotate-15";

   const variantStyles: Record<ButtonVariant, string> = {
      primary:
         "bg-linear-[20deg] from-sky-50 to-emerald-50 text-black hover:bg-blue-700 focus:ring-blue-500",
      secondary: "bg-gray-200 text-gray-900 hover:bg-gray-300 focus:ring-gray-500",
      danger: "bg-red-600 text-white hover:bg-red-700 focus:ring-red-500",
      ghost: "text-gray-700 hover:bg-gray-100 focus:ring-gray-500",
   };

   const disabledStyles = "opacity-50 cursor-not-allowed";
   const loadingStyles = "relative text-transparent hover:text-transparent";

   return (
      <div className="p-1 bg-linear-to-tr from-red-200 to-pink-400 rounded-[1rem] shadow-xl">
         <button
            className={`
        ${baseStyles}
        ${variantStyles[variant]}
        ${disabled || isLoading ? disabledStyles : ""}
        ${isLoading ? loadingStyles : ""}
        ${className}
        ${big ? "text-lg" : ""}
      `}
            disabled={disabled ?? isLoading}
            {...props}
         >
            {children}
            {isLoading && (
               <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
               </div>
            )}
         </button>
      </div>
   );
}
