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
      <div className="w-full overflow-x-auto">
         <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50 dark:bg-gray-950">
               {table.getHeaderGroups().map((headerGroup) => (
                  <tr key={headerGroup.id}>
                     {headerGroup.headers.map((header) => (
                        <th
                           key={header.id}
                           className="px-2 py-1 text-left text-xs font-medium text-gray-500 dark:text-gray-200 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                           onClick={header.column.getToggleSortingHandler()}
                        >
                           {flexRender(
                              header.column.columnDef.header,
                              header.getContext(),
                           )}
                           {{
                              asc: " 🔼",
                              desc: " 🔽",
                           }[header.column.getIsSorted() as string] ?? null}
                        </th>
                     ))}
                  </tr>
               ))}
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-amber-700">
               {table.getRowModel().rows.map((row) => (
                  <tr
                     key={row.id}
                     onClick={() => onRowClick?.(row.original)}
                     className={
                        onRowClick ? "cursor-pointer hover:bg-gray-50" : ""
                     }
                  >
                     {row.getVisibleCells().map((cell) => (
                        <td
                           key={cell.id}
                           className="px-2 py-1 whitespace-nowrap text-sm text-gray-900 dark:text-gray-50"
                        >
                           {flexRender(
                              cell.column.columnDef.cell,
                              cell.getContext(),
                           )}
                        </td>
                     ))}
                  </tr>
               ))}
            </tbody>
         </table>
      </div>
   );
}
