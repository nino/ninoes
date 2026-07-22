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
         {label && <label className="aqua-label mb-1">{label}</label>}
         <input
            ref={ref}
            className={`
      aqua-input
      ${error ? "aqua-input--error" : ""}
      ${className}
      `}
            {...props}
         />
         {error && <p className="mt-1 text-sm text-red-700">{error}</p>}
      </div>
   );
};
