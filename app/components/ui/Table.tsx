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
}

export function Table<TData>({
   data,
   columns,
   onRowClick,
   pagination,
   setPagination,
   sorting,
   setSorting,
}: TableProps<TData>): React.ReactNode {
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
            <tbody>
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
         </table>
      </div>
   );
}
