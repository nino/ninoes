import React, { type ReactNode } from "react";
import { Input } from "~/components/ui/Input";

export default function Page(): ReactNode {
   // Uncontrolled, and uppercased in place, so the cursor stays where it was.
   const handleChange = (event: React.ChangeEvent<HTMLInputElement>): void => {
      const input = event.currentTarget;
      const { selectionStart, selectionEnd } = input;
      input.value = input.value.toUpperCase();
      input.setSelectionRange(selectionStart, selectionEnd);
   };

   return (
      <div>
         hi
         <Input onChange={handleChange} />
      </div>
   );
}
