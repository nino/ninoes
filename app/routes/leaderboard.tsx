import { useNameScores } from "~/hooks/useSupabase";
import type { NameScore } from "~/hooks/useSupabase";
import { type ReactNode, useState } from "react";
import { Table } from "~/components/ui/Table";
import type { ColumnDef } from "@tanstack/react-table";

export default function Leaderboard(): ReactNode {
   const [pagination, setPagination] = useState({
      current: 1,
      pageSize: 50,
   });
   const [sorting, setSorting] = useState<{
      orderBy:
         | "score"
         | "name"
         | "created_at"
         | "total_votes"
         | "upvotes"
         | "downvotes"
         | "controversial";
      orderDirection: "asc" | "desc";
   }>({
      orderBy: "score",
      orderDirection: "desc",
   });

   const { data: scores, isLoading } = useNameScores({
      limit: pagination.pageSize,
      offset: (pagination.current - 1) * pagination.pageSize,
      orderBy: sorting.orderBy,
      orderDirection: sorting.orderDirection,
   });

   const columns: Array<ColumnDef<NameScore>> = [
      {
         id: "rank",
         header: "Rank",
         cell: ({ row }) =>
            (pagination.current - 1) * pagination.pageSize + row.index + 1,
      },
      {
         accessorKey: "name",
         header: "Name",
      },
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
         <Table data={scores?.data ?? []} columns={columns} />
      </div>
   );
}
