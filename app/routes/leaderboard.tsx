import { useNameScores } from "~/hooks/useSupabase";
import type { NameScore } from "~/hooks/useSupabase";
import { type ReactNode, useState } from "react";
import { Table, type TableColumnDef } from "~/components/ui/Table";

export default function Leaderboard(): ReactNode {
   const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 50 });
   const [sorting, setSorting] = useState([{ id: "score", desc: true }]);

   const { data: scores, isFetching } = useNameScores({
      limit: pagination.pageSize,
      offset: pagination.pageIndex * pagination.pageSize,
      orderBy: sorting[0]?.id ?? "score",
      orderDirection: sorting[0]?.desc !== false ? "desc" : "asc",
   });

   const columns: Array<TableColumnDef<NameScore>> = [
      { accessorKey: "name", header: "Name" },
      {
         accessorKey: "score",
         header: "Score",
         cell: ({ row }) => row.original.score.toLocaleString(),
      },
      {
         accessorKey: "upvotes",
         header: "Upvotes",
         cell: ({ row }) => row.original.upvotes.toLocaleString(),
      },
      {
         accessorKey: "downvotes",
         header: "Downvotes",
         cell: ({ row }) => row.original.downvotes.toLocaleString(),
      },
      {
         accessorKey: "total_votes",
         header: "Total votes",
         cell: ({ row }) => row.original.total_votes.toLocaleString(),
      },
      {
         accessorKey: "controversial",
         header: "Controversial",
         cell: ({ row }) => row.original.controversial.toLocaleString(),
      },
   ];

   return (
      <div className="space-y-8">
         <h1 className="text-2xl font-bold">Name Leaderboard</h1>
         <Table
            data={scores?.data ?? []}
            columns={columns}
            sorting={sorting}
            setSorting={setSorting}
            pagination={pagination}
            setPagination={setPagination}
            isLoading={isFetching}
         />
      </div>
   );
}
