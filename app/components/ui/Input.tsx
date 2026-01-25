import { type InputHTMLAttributes, type ReactNode, type Ref } from "react";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
   label?: string;
   error?: string;
   ref?: Ref<HTMLInputElement>;
}

export const Input = ({
   label,
   error,
   className = "",
   ref,
   ...props
}: InputProps): ReactNode => {
   return (
      <div className="w-full">
         {label && (
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
               {label}
            </label>
         )}
         <input
            ref={ref}
            className={`
      w-full px-3 py-2 border rounded-md shadow-sm
      bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100
      focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500
      ${error ? "border-red-500" : "border-gray-300 dark:border-gray-600"}
      ${className}
      `}
            {...props}
         />
         {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
      </div>
   );
};
