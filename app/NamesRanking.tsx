import { useNames, useVotes } from "./hooks/useSupabase";
import type { Enum, Name, NameGender, VoteWithExtras } from "./model/types";
import React, { type ReactNode } from "react";
import { Table, type TableColumnDef } from "~/components/ui/Table";
import { GENDER_LABELS, GenderFilter } from "~/components/GenderFilter";

export function NamesRanking(): ReactNode {
   const [genders, setGenders] = React.useState<Array<Enum<typeof NameGender>>>([]);

   const { data: names, isLoading: isLoadingNames } = useNames({
      page: 0,
      pageSize: 50,
      orderBy: "name",
      orderDirection: "asc",
      genders,
   });

   const { data: votesData, isFetching: isLoadingVotes } = useVotes({
      page: 0,
      pageSize: 50,
      orderBy: "created_at",
      orderDirection: "desc",
   });

   const nameColumns: Array<TableColumnDef<Name>> = [
      { accessorKey: "name", header: "Name" },
      {
         accessorKey: "gender",
         header: "Gender",
         enableSorting: false,
         cell: ({ row }) =>
            row.original.gender != null ? GENDER_LABELS[row.original.gender] : "—",
      },
      {
         accessorKey: "created_at",
         header: "Created At",
         cell: ({ row }) => row.original.created_at.toLocaleDateString(),
      },
   ];

   const voteColumns: Array<TableColumnDef<VoteWithExtras>> = [
      { accessorKey: "name.name", header: "Name" },
      { accessorKey: "user.name", header: "User ID" },
      { accessorKey: "vote_type", header: "Vote Type" },
      {
         accessorKey: "created_at",
         header: "Created At",
         cell: ({ row }) => row.original.created_at.toLocaleString(),
      },
   ];

   return (
      <div className="space-y-8">
         <div>
            <h2 className="mb-4 font-title text-2xl">Names</h2>
            <div className="mb-4">
               <GenderFilter value={genders} onChange={setGenders} />
            </div>
            <Table data={names ?? []} columns={nameColumns} isLoading={isLoadingNames} />
         </div>
         <div>
            <h2 className="mb-4 flex items-baseline gap-3">
               <span className="font-title text-2xl">Votes</span>
               <a
                  href="/votes"
                  className="rounded-sm text-sm font-medium underline underline-offset-4 outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:shadow-glow"
               >
                  See all
               </a>
            </h2>
            <Table
               data={votesData?.data ?? []}
               columns={voteColumns}
               isLoading={isLoadingVotes}
            />
         </div>
      </div>
   );
}
