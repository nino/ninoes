import React from "react";
import { NameGender, type Enum } from "~/model/types";

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
      `px-3 py-1 rounded-full text-sm border transition-colors ${
         selected
            ? "bg-pink-200 dark:bg-pink-800 border-pink-400 dark:border-pink-600 text-gray-900 dark:text-gray-50"
            : "bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
      }`;

   return (
      <div className="flex flex-wrap items-center gap-2">
         <button
            type="button"
            className={chipStyles(value.length === 0)}
            onClick={() => onChange([])}
         >
            All
         </button>
         {Object.values(NameGender).map((gender) => (
            <button
               key={gender}
               type="button"
               className={chipStyles(value.includes(gender))}
               onClick={() => toggle(gender)}
            >
               {GENDER_LABELS[gender]}
            </button>
         ))}
      </div>
   );
}
