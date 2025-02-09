import React from "react";
import { Input as HeadlessInput } from "@headlessui/react";

type InputProps = {
  label: string;
  type: string;
  value?: string;
  defaultValue?: string;
  onChange?: React.ChangeEventHandler<HTMLInputElement>;
  required?: boolean;
  name?: string;
  onBlur?: React.FocusEventHandler<HTMLInputElement>;
  ref?: React.Ref<HTMLInputElement>;
} & React.InputHTMLAttributes<HTMLInputElement>;

export function Input({
  label,
  type,
  value,
  defaultValue,
  onChange,
  required,
  name,
  onBlur,
  ref,
  ...props
}: InputProps) {
  const id = React.useId();
  return (
    <div className="flex flex-col">
      <label htmlFor={id}>{label}</label>
      <HeadlessInput
        type={type}
        id={id}
        value={value}
        defaultValue={defaultValue}
        onChange={onChange}
        className="border border-gray-500 px-2"
        required={required}
        name={name}
        onBlur={onBlur}
        ref={ref}
        {...props}
      />
    </div>
  );
}
