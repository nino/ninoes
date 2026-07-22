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
            <label className="mb-1 block text-[12px] font-bold text-[#3d3d3d] [text-shadow:0_1px_0_rgba(255,255,255,0.7)]">
               {label}
            </label>
         )}
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
