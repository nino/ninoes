import { useNames, useVotes } from "./hooks/useSupabase";
import type { Name, VoteWithExtras } from "./model/types";
import { type ReactNode } from "react";
import { Table } from "~/components/ui/Table";
import type { ColumnDef } from "@tanstack/react-table";
import { Spinner } from "./components/ui/Spinner";

export function NamesRanking(): ReactNode {
   const { data: names, isLoading: isLoadingNames } = useNames({
      page: 0,
      pageSize: 50,
      orderBy: "name",
      orderDirection: "asc",
   });

   const { data: votesData, isFetching: isLoadingVotes } = useVotes({
      page: 0,
      pageSize: 50,
      orderBy: "created_at",
      orderDirection: "desc",
   });

   const nameColumns: Array<ColumnDef<Name>> = [
      {
         accessorKey: "name",
         header: "Name",
      },
      {
         accessorKey: "created_at",
         header: "Created At",
         cell: ({ row }) => row.original.created_at.toLocaleDateString(),
      },
   ];

   const voteColumns: Array<ColumnDef<VoteWithExtras>> = [
      {
         accessorKey: "name.name",
         header: "Name",
      },
      {
         accessorKey: "user.name",
         header: "User ID",
      },
      {
         accessorKey: "vote_type",
         header: "Vote Type",
      },
      {
         accessorKey: "created_at",
         header: "Created At",
         cell: ({ row }) => row.original.created_at.toLocaleString(),
      },
   ];

   return (
      <div className="space-y-8">
         <div>
            <h2 className="text-xl font-bold mb-4">Names</h2>
            {isLoadingNames && <Spinner />}
            {names && <Table data={names} columns={nameColumns} />}
         </div>
         <div>
            <h2 className="text-xl font-bold mb-4">
               Votes <a href="/votes">(see all)</a>
            </h2>
            {isLoadingVotes && <Spinner />}
            {votesData?.data && <Table data={votesData.data} columns={voteColumns} />}
         </div>
      </div>
   );
}
