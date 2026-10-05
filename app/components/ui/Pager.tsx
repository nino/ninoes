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
   const id = React.useId();

   return (
      <div className="flex flex-wrap items-center justify-between gap-4">
         <div className="flex items-center gap-2 text-sm text-muted-fg">
            <label htmlFor={id}>Rows per page</label>
            <select
               id={id}
               value={pageSize}
               onChange={(event) => onPageSizeChange(Number(event.target.value))}
               className={`h-10 rounded-md border border-input bg-field px-2 text-fg tabular-nums shadow-xs ${focusRing}`}
            >
               {PAGE_SIZES.map((size) => (
                  <option key={size} value={size}>
                     {size}
                  </option>
               ))}
            </select>
         </div>
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
