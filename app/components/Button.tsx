import { Button as HeadlessButton } from "@headlessui/react";

export function Button({
  children,
  loading,
  ...props
}: {
  children: React.ReactNode;
  loading?: boolean;
} & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <HeadlessButton
      className="rounded-md px-4 border focus:outline-2 active:bg-gray-200"
      {...props}
    >
      {loading ? <span className="block animate-spin">Loading</span> : children}
    </HeadlessButton>
  );
}
