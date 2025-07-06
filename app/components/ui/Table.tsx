import {
   type ColumnDef,
   flexRender,
   getCoreRowModel,
   getSortedRowModel,
   type SortingState,
   useReactTable,
} from "@tanstack/react-table";
import { type ReactNode, useState } from "react";

interface TableState {}

interface TableProps<TData> {
   data: Array<TData>;
   columns: Array<ColumnDef<TData>>;
   onRowClick?: (row: TData) => void;
   state: TableState;
   onChange: (newState: TableState) => void;
}

export function Table<TData>({
   data,
   columns,
   onRowClick,
   state,
   onChange,
}: TableProps<TData>): ReactNode {
   const [sorting, setSorting] = useState<SortingState>([]);

   const table = useReactTable({
      data,
      columns,
      getCoreRowModel: getCoreRowModel(),
      getSortedRowModel: getSortedRowModel(),
      onSortingChange: setSorting,
      state: {
         sorting,
      },
   });

   return (
      <div className="w-full overflow-x-auto">
         <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
               {table.getHeaderGroups().map((headerGroup) => (
                  <tr key={headerGroup.id}>
                     {headerGroup.headers.map((header) => (
                        <th
                           key={header.id}
                           className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
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
            <tbody className="bg-white divide-y divide-gray-200">
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
                           className="px-6 py-4 whitespace-nowrap text-sm text-gray-900"
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
