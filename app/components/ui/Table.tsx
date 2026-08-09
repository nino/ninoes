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
import { Spinner } from "./Spinner";

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
      <div className="aqua-panel w-full overflow-x-auto">
         <table className="aqua-table min-w-full">
            <thead>
               {table.getHeaderGroups().map((headerGroup) => (
                  <tr key={headerGroup.id}>
                     {headerGroup.headers.map((header) => (
                        <th
                           key={header.id}
                           className={header.column.getCanSort() ? "is-sortable" : ""}
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
                     <td
                        colSpan={table.getVisibleLeafColumns().length}
                        className="border-b-0 p-0"
                     >
                        <div
                           className="flex items-center justify-center"
                           data-testid="table-loading-placeholder"
                           style={{ height: placeholderHeight, minHeight: 80 }}
                        >
                           <Spinner />
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
                        className={onRowClick ? "is-clickable" : ""}
                     >
                        {row.getVisibleCells().map((cell) => (
                           <td key={cell.id}>
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
