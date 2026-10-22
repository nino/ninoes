import type { ReactNode } from "react";
import { NameGender, type Enum } from "~/model/types";
import { GENDER_LABELS } from "~/components/GenderFilter";

const SCALE: Array<Enum<typeof NameGender>> = Object.values(NameGender);

/**
 * A gender label with a five-step scale in front of it, from always male on the
 * left to always female on the right. The step for this name stands tall.
 */
export function GenderScale({
   gender,
}: {
   gender: Enum<typeof NameGender> | null | undefined;
}): ReactNode {
   if (gender == null) {
      return "—";
   }

   return (
      <span className="inline-flex items-center gap-2.5">
         <span aria-hidden className="flex h-3.5 items-end gap-0.5">
            {SCALE.map((step) => (
               <span
                  key={step}
                  data-active={step === gender || undefined}
                  className="h-1 w-1.5 rounded-full bg-border data-active:h-3.5 data-active:bg-primary"
               />
            ))}
         </span>
         {GENDER_LABELS[gender]}
      </span>
   );
}
