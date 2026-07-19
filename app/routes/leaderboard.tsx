import { useNameScores } from "~/hooks/useSupabase";
import type { NameScore } from "~/hooks/useSupabase";
import { type ReactNode, useState } from "react";
import { Table } from "~/components/ui/Table";
import type { ColumnDef } from "@tanstack/react-table";
import { Spinner } from "~/components/ui/Spinner";
import { GENDER_LABELS, GenderFilter } from "~/components/GenderFilter";
import type { Enum, NameGender } from "~/model/types";

export default function Leaderboard(): ReactNode {
   const [pagination, setPagination] = useState({
      pageIndex: 0,
      pageSize: 50,
   });
   const [sorting, setSorting] = useState([
      {
         id: "score",
         desc: true,
      },
   ]);
   const [genders, setGenders] = useState<Array<Enum<typeof NameGender>>>([]);

   const { data: scores, isLoading } = useNameScores({
      limit: pagination.pageSize,
      offset: pagination.pageIndex * pagination.pageSize,
      orderBy: sorting[0]?.id ?? "score",
      orderDirection: sorting[0]?.desc !== false ? "desc" : "asc",
      genders,
   });

   const columns: Array<ColumnDef<NameScore>> = [
      {
         accessorKey: "name",
         header: "Name",
      },
      {
         accessorKey: "gender",
         header: "Gender",
         enableSorting: false,
         cell: ({ row }) =>
            row.original.gender != null ? GENDER_LABELS[row.original.gender] : "—",
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
         <GenderFilter
            value={genders}
            onChange={(value) => {
               setGenders(value);
               setPagination((current) => ({ ...current, pageIndex: 0 }));
            }}
         />
         {isLoading && <Spinner />}
         {scores?.data && (
            <Table
               data={scores.data}
               columns={columns}
               sorting={sorting}
               setSorting={setSorting}
               pagination={pagination}
               setPagination={setPagination}
            />
         )}
      </div>
   );
}
