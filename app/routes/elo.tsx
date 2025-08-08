import { useEloLeaderboard, useTeams } from "~/hooks/useSupabase";
import React from "react";
import type { TeamEloWithName } from "~/model/types";
import { Table } from "~/components/ui/Table";
import { type SortingState, type ColumnDef } from "@tanstack/react-table";
import { Button } from "~/components/ui/Button";

export default function Leaderboard(): React.ReactNode {
   const [pagination, setPagination] = React.useState({
      pageIndex: 0,
      pageSize: 10,
   });
   const [sorting, setSorting] = React.useState<SortingState>([]);

   const teamsQuery = useTeams({ page: 0, pageSize: 10 });
   const teamId = teamsQuery.data?.data[0]?.id;

   const eloLeaderboard = useEloLeaderboard({
      teamId: teamId ?? null,
      page: pagination.pageIndex,
      pageSize: pagination.pageSize,
      orderBy: sorting[0]?.id ?? "elo",
      orderDirection: sorting[0]?.desc === false ? "asc" : "desc",
   });
   const numPages =
      eloLeaderboard.data?.total == null
         ? null
         : Math.ceil(eloLeaderboard.data.total / pagination.pageSize);

   const columns: Array<ColumnDef<TeamEloWithName>> = [
      {
         accessorKey: "elo",
         header: "ELO",
      },
      {
         accessorKey: "name.name",
         header: "Name",
      },
   ];

   return (
      <div className="space-y-8">
         <h1 className="text-2xl font-bold">Name Leaderboard</h1>
         <Table
            data={eloLeaderboard.data?.data ?? []}
            columns={columns}
            pagination={pagination}
            setPagination={setPagination}
            sorting={sorting}
            setSorting={setSorting}
         />
         {eloLeaderboard.data && numPages != null && (
            <div className="flex justify-end items-baseline gap-4">
               <Button
                  onClick={() =>
                     setPagination((current) => ({
                        ...current,
                        pageIndex: Math.max(0, current.pageIndex - 1),
                     }))
                  }
               >
                  prev
               </Button>
               <div>{pagination.pageIndex + 1}</div>
               <Button
                  onClick={() =>
                     setPagination((current) => ({
                        ...current,
                        pageIndex: Math.min(numPages - 1, current.pageIndex + 1),
                     }))
                  }
               >
                  next
               </Button>
            </div>
         )}
      </div>
   );
}
