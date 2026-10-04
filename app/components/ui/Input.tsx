import { type InputHTMLAttributes, type ReactNode, type Ref } from "react";
import { inputClass } from "./styles";

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
      <div className="flex w-full flex-col gap-2">
         {label && <label className="text-sm font-medium">{label}</label>}
         <input
            ref={ref}
            aria-invalid={error ? true : undefined}
            className={`h-10 ${inputClass} ${className}`}
            {...props}
         />
         {error && <p className="text-sm text-danger">{error}</p>}
      </div>
   );
};
