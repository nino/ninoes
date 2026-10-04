import React from "react";
import { NameGender, type Enum } from "~/model/types";
import { focusRing } from "~/components/ui/styles";

export const GENDER_LABELS: Record<Enum<typeof NameGender>, string> = {
   [NameGender.ALWAYS_MALE]: "Always male",
   [NameGender.MOSTLY_MALE]: "Mostly male",
   [NameGender.NEUTRAL]: "Neutral",
   [NameGender.MOSTLY_FEMALE]: "Mostly female",
   [NameGender.ALWAYS_FEMALE]: "Always female",
};

interface GenderFilterProps {
   value: Array<Enum<typeof NameGender>>;
   onChange: (value: Array<Enum<typeof NameGender>>) => void;
}

export function GenderFilter({ value, onChange }: GenderFilterProps): React.ReactNode {
   const toggle = (gender: Enum<typeof NameGender>): void => {
      onChange(
         value.includes(gender) ? value.filter((g) => g !== gender) : [...value, gender],
      );
   };

   const chipStyles = (selected: boolean): string =>
      `h-8 rounded-full border px-3 text-sm font-medium transition-colors ${focusRing} ${
         selected
            ? "border-primary bg-primary text-primary-fg"
            : "border-border bg-card text-muted-fg shadow-xs hover:bg-muted hover:text-fg"
      }`;

   return (
      <div className="flex flex-wrap items-center gap-2">
         <button
            type="button"
            className={chipStyles(value.length === 0)}
            aria-pressed={value.length === 0}
            onClick={() => onChange([])}
         >
            All
         </button>
         {Object.values(NameGender).map((gender) => (
            <button
               key={gender}
               type="button"
               className={chipStyles(value.includes(gender))}
               aria-pressed={value.includes(gender)}
               onClick={() => toggle(gender)}
            >
               {GENDER_LABELS[gender]}
            </button>
         ))}
      </div>
   );
}
