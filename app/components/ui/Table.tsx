import {
   type ColumnDef,
   flexRender,
   getCoreRowModel,
   getSortedRowModel,
   type OnChangeFn,
   type PaginationState,
   type SortingState,
   useReactTable,
} from "@tanstack/react-table";
import React from "react";

interface TableProps<TData> {
   data: Array<TData>;
   columns: Array<ColumnDef<TData>>;
   onRowClick?: (row: TData) => void;
   sorting?: SortingState;
   setSorting?: OnChangeFn<SortingState>;
   pagination?: PaginationState;
   setPagination?: OnChangeFn<PaginationState>;
   isLoading?: boolean;
}

export function Table<TData>({
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

   // Remember the body height while rows are shown, so the loading
   // placeholder can hold the same height and the table doesn't collapse
   // to just the header and jump back when the next page arrives.
   React.useLayoutEffect(() => {
      if (data.length > 0 && tbodyRef.current) {
         setLastBodyHeight(tbodyRef.current.getBoundingClientRect().height);
      }
   }, [data]);

   const showPlaceholder = isLoading && data.length === 0;
   const table = useReactTable({
      data,
      columns,
      getCoreRowModel: getCoreRowModel(),
      getSortedRowModel: getSortedRowModel(),
      onSortingChange: setSorting,
      onPaginationChange: setPagination,
      state: {
         sorting,
         pagination,
      },
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
                           {{
                              asc: " ▲",
                              desc: " ▼",
                           }[header.column.getIsSorted() as string] ?? null}
                        </th>
                     ))}
                  </tr>
               ))}
            </thead>
            {showPlaceholder ? (
               <tbody>
                  <tr>
                     <td colSpan={columns.length} className="border-b-0 p-0">
                        <div
                           className="flex items-center justify-center"
                           style={{
                              height: lastBodyHeight ?? undefined,
                              minHeight: 80,
                           }}
                        >
                           <div
                              className="aqua-spinner"
                              role="status"
                              aria-label="Loading"
                           />
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
