import {
   Field,
   Label,
   Listbox,
   ListboxButton,
   ListboxOption,
   ListboxOptions,
} from "@headlessui/react";
import React from "react";
import { PAGE_SIZES } from "~/hooks/usePageSize";
import { Button } from "./Button";
import { focusRing } from "./styles";

interface PagerProps {
   pageIndex: number;
   numPages: number;
   pageSize: number;
   onPageIndexChange: (pageIndex: number) => void;
   onPageSizeChange: (pageSize: number) => void;
}

// Prev/next and a page-size picker for the tables, which paginate on the server.
export function Pager({
   pageIndex,
   numPages,
   pageSize,
   onPageIndexChange,
   onPageSizeChange,
}: PagerProps): React.ReactNode {
   return (
      <div className="flex flex-wrap items-center justify-between gap-4">
         {/* A Listbox rather than a native select, so the options open right
             under the button, lined up with it, instead of wherever the OS
             puts its popup. */}
         <Field className="flex items-center gap-2 text-sm text-muted-fg">
            <Label>Rows per page</Label>
            <Listbox value={pageSize} onChange={onPageSizeChange}>
               <ListboxButton
                  className={`flex h-10 items-center gap-3 rounded-2xl border border-input bg-field pr-3 pl-3.5 text-fg tabular-nums shadow-xs ${focusRing}`}
               >
                  {pageSize}
                  <Chevron />
               </ListboxButton>
               <ListboxOptions
                  anchor={{ to: "bottom start", gap: 4 }}
                  className="z-10 w-(--button-width) rounded-2xl border border-border bg-card p-1 text-sm text-fg tabular-nums shadow-md outline-none"
               >
                  {/* Options are concentric with the list: 16px minus the 1px
                      border and 4px padding. A plain rounded-[11px] rather than
                      rounded-xl, which app.css turns into a squircle that reads
                      much tighter than the list's round corners. */}
                  {PAGE_SIZES.map((size) => (
                     <ListboxOption
                        key={size}
                        value={size}
                        className="flex h-8 cursor-default items-center justify-between rounded-[11px] px-2.5 select-none data-focus:bg-muted data-selected:font-semibold"
                     >
                        {size}
                        <Check />
                     </ListboxOption>
                  ))}
               </ListboxOptions>
            </Listbox>
         </Field>
         <div className="flex items-center gap-4">
            <Button
               variant="secondary"
               disabled={pageIndex <= 0}
               onClick={() => onPageIndexChange(Math.max(0, pageIndex - 1))}
            >
               prev
            </Button>
            <div className="text-sm text-muted-fg tabular-nums">
               {pageIndex + 1} / {Math.max(1, numPages)}
            </div>
            <Button
               variant="secondary"
               disabled={pageIndex >= numPages - 1}
               onClick={() => onPageIndexChange(Math.min(numPages - 1, pageIndex + 1))}
            >
               next
            </Button>
         </div>
      </div>
   );
}

function Chevron(): React.ReactNode {
   return (
      <svg viewBox="0 0 16 16" aria-hidden="true" className="size-4 text-muted-fg">
         <path
            d="m4 6 4 4 4-4"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
         />
      </svg>
   );
}

// Only shown on the selected option (ListboxOption sets data-selected).
function Check(): React.ReactNode {
   return (
      <svg
         viewBox="0 0 16 16"
         aria-hidden="true"
         className="invisible size-3.5 in-data-selected:visible"
      >
         <path
            d="m3.5 8.5 3 3 6-7"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.75"
            strokeLinecap="round"
            strokeLinejoin="round"
         />
      </svg>
   );
}
