import { type ReactNode, useMemo, useState } from "react";
import { useVotes } from "~/hooks/useSupabase";
import { VoteType } from "~/model/types";
import { Table, type TableColumnDef } from "~/components/ui/Table";
import { type BannedName, groupBans } from "~/utils/banned-names";

const columns: Array<TableColumnDef<BannedName>> = [
   { accessorKey: "name", header: "Name" },
   {
      id: "bannedBy",
      header: "Banned by",
      enableSorting: false,
      cell: ({ row }) => row.original.bannedBy.join(", "),
   },
   {
      accessorKey: "lastBannedAt",
      header: "Last banned",
      cell: ({ row }) => row.original.lastBannedAt.toLocaleDateString(),
   },
];

export default function Banned(): ReactNode {
   const [sorting, setSorting] = useState([{ id: "lastBannedAt", desc: true }]);
   const { data, isFetching, isError } = useVotes({
      page: 0,
      pageSize: 1000,
      orderBy: "created_at",
      orderDirection: "desc",
      voteTypes: [VoteType.BAN],
   });

   const banned = useMemo(() => groupBans(data?.data ?? []), [data]);

   return (
      <div className="space-y-8">
         <div className="space-y-2">
            <h1 className="font-title text-3xl">Banned names</h1>
            <p className="text-muted-fg">
               Names someone banned while voting. They no longer come up in the vote.
            </p>
         </div>
         {isError ? (
            <p className="text-muted-fg">Couldn&rsquo;t load banned names.</p>
         ) : !isFetching && banned.length === 0 ? (
            <p className="text-muted-fg">No names have been banned yet.</p>
         ) : (
            <Table
               data={banned}
               columns={columns}
               sorting={sorting}
               setSorting={setSorting}
               isLoading={isFetching}
            />
         )}
      </div>
   );
}
