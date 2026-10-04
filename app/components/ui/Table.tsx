import {
   type ColumnDef,
   columnVisibilityFeature,
   createSortedRowModel,
   flexRender,
   type OnChangeFn,
   type PaginationState,
   type RowData,
   rowPaginationFeature,
   rowSortingFeature,
   type SortingState,
   tableFeatures,
   useTable,
} from "@tanstack/react-table";
import React from "react";
import { Skeleton } from "./Skeleton";

// v9 needs every feature to be registered. These are the ones this table uses:
// column visibility for getVisibleLeafColumns/getVisibleCells, sorting for the
// clickable headers, and pagination for the externally held page state.
const features = tableFeatures({
   columnVisibilityFeature,
   rowPaginationFeature,
   rowSortingFeature,
   sortedRowModel: createSortedRowModel(),
});

// v9 makes ColumnDef generic over the feature set. Call sites all use this
// table, so they import this alias and don't name the features themselves.
export type TableColumnDef<TData extends RowData> = ColumnDef<typeof features, TData>;

// Varied so the loading rows look like names of different lengths.
const skeletonWidths = ["w-2/5", "w-3/5", "w-1/3", "w-1/2", "w-2/3"];
// Matches the h-11 of a body row.
const rowHeight = 44;

interface TableProps<TData extends RowData> {
   data: Array<TData>;
   columns: Array<TableColumnDef<TData>>;
   onRowClick?: (row: TData) => void;
   sorting?: SortingState;
   setSorting?: OnChangeFn<SortingState>;
   pagination?: PaginationState;
   setPagination?: OnChangeFn<PaginationState>;
   isLoading?: boolean;
}

export function Table<TData extends RowData>({
   data,
   columns,
   onRowClick,
   pagination,
   setPagination,
   sorting,
   setSorting,
   isLoading = false,
}: TableProps<TData>): React.ReactNode {
   const tbodyRef = React.useRef<HTMLTableSectionElement>(null);
   const [lastBodyHeight, setLastBodyHeight] = React.useState<number | null>(null);
   const [lastRowCount, setLastRowCount] = React.useState<number | null>(null);

   // Remember the body height while rows are shown, so the loading
   // placeholder can hold the same height and the table doesn't collapse
   // to just the header and jump back when the next page arrives.
   React.useLayoutEffect(() => {
      if (data.length > 0 && tbodyRef.current) {
         setLastBodyHeight(tbodyRef.current.getBoundingClientRect().height);
         setLastRowCount(data.length);
      }
   }, [data]);

   const showPlaceholder = isLoading && data.length === 0;

   // Expect the incoming page to be pageSize rows tall. If the last page we
   // measured was shorter (e.g. the final page), scale its per-row height up
   // so the placeholder matches the page that's about to arrive.
   const placeholderHeight =
      lastBodyHeight == null || lastRowCount == null || lastRowCount === 0
         ? undefined
         : pagination != null && pagination.pageSize !== lastRowCount
           ? (lastBodyHeight / lastRowCount) * pagination.pageSize
           : lastBodyHeight;
   const skeletonRows =
      placeholderHeight == null ? 2 : Math.ceil(placeholderHeight / rowHeight);

   // The core row model is built automatically in v9, so it is no longer passed.
   const table = useTable({
      features,
      data,
      columns,
      onSortingChange: setSorting,
      onPaginationChange: setPagination,
      state: { sorting, pagination },
      manualPagination: true,
   });

   return (
      <div className="w-full overflow-x-auto rounded-xl border border-border bg-card shadow-xs">
         <table className="min-w-full text-sm">
            <thead>
               {table.getHeaderGroups().map((headerGroup) => (
                  <tr key={headerGroup.id}>
                     {headerGroup.headers.map((header) => (
                        <th
                           key={header.id}
                           className={`h-10 border-b border-border px-4 text-left text-xs font-medium whitespace-nowrap text-muted-fg select-none ${
                              header.column.getCanSort()
                                 ? "cursor-pointer transition-colors hover:text-fg"
                                 : ""
                           }`}
                           onClick={header.column.getToggleSortingHandler()}
                        >
                           {flexRender(
                              header.column.columnDef.header,
                              header.getContext(),
                           )}
                           {{ asc: " ▲", desc: " ▼" }[
                              header.column.getIsSorted() as string
                           ] ?? null}
                        </th>
                     ))}
                  </tr>
               ))}
            </thead>
            {showPlaceholder ? (
               <tbody>
                  <tr>
                     <td colSpan={table.getVisibleLeafColumns().length} className="p-0">
                        <div
                           className="overflow-hidden"
                           data-testid="table-loading-placeholder"
                           style={{ height: placeholderHeight, minHeight: 80 }}
                        >
                           <div role="status" className="flex flex-col">
                              <span className="sr-only">Loading</span>
                              {Array.from({ length: skeletonRows }, (_, i) => (
                                 <div
                                    key={i}
                                    className="flex h-11 items-center border-b border-border px-4"
                                 >
                                    <Skeleton
                                       className={`h-4 ${skeletonWidths[i % skeletonWidths.length]}`}
                                    />
                                 </div>
                              ))}
                           </div>
                        </div>
                     </td>
                  </tr>
               </tbody>
            ) : (
               <tbody ref={tbodyRef}>
                  {table.getRowModel().rows.map((row) => (
                     <tr
                        key={row.id}
                        onClick={() => onRowClick?.(row.original)}
                        className={`border-b border-border last:border-b-0 ${
                           onRowClick
                              ? "cursor-pointer transition-colors hover:bg-muted"
                              : ""
                        }`}
                     >
                        {row.getVisibleCells().map((cell) => (
                           <td key={cell.id} className="h-11 px-4 py-1.5 whitespace-nowrap">
                              {flexRender(cell.column.columnDef.cell, cell.getContext())}
                           </td>
                        ))}
                     </tr>
                  ))}
               </tbody>
            )}
         </table>
      </div>
   );
}
