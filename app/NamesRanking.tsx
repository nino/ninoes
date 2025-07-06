import { useNames, useVotes } from "./hooks/useSupabase";
import type { Name, VoteWithExtras } from "./model/types";
import { type ReactNode, useState } from "react";
import { Table } from "~/components/ui/Table";
import type { ColumnDef } from "@tanstack/react-table";

type SortState = {
   orderBy: string;
   orderDirection: "asc" | "desc";
};

type PaginationState = {
   page: number;
   pageSize: number;
};

export function NamesRanking(): ReactNode {
   const [namesPagination, setNamesPagination] = useState<PaginationState>({
      page: 0,
      pageSize: 50,
   });
   const [namesSort, setNamesSort] = useState<SortState>({
      orderBy: "created_at",
      orderDirection: "desc",
   });

   const [votesPagination, setVotesPagination] = useState<PaginationState>({
      page: 0,
      pageSize: 50,
   });
   const [votesSort, setVotesSort] = useState<SortState>({
      orderBy: "created_at",
      orderDirection: "desc",
   });

   const { data: names = [], isLoading: isLoadingNames } = useNames({
      page: namesPagination.page,
      pageSize: namesPagination.pageSize,
      orderBy: namesSort.orderBy,
      orderDirection: namesSort.orderDirection,
   });

   const { data: votesData, isFetching: isLoadingVotes } = useVotes({
      page: votesPagination.page,
      pageSize: votesPagination.pageSize,
      orderBy: votesSort.orderBy,
      orderDirection: votesSort.orderDirection,
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
            <Table data={names} columns={nameColumns} />
         </div>
         <div>
            <h2 className="text-xl font-bold mb-4">
               Votes <a href="/votes">(see all)</a>
            </h2>
            <Table data={votesData?.data ?? []} columns={voteColumns} />
         </div>
      </div>
   );
}
