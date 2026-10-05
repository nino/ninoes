import { useEloLeaderboard, useTeams } from "~/hooks/useSupabase";
import { usePreviousValue } from "~/hooks/usePreviousValue";
import React from "react";
import type { Enum, NameGender, TeamEloWithName } from "~/model/types";
import { Table, type TableColumnDef } from "~/components/ui/Table";
import { type SortingState } from "@tanstack/react-table";
import { Pager } from "~/components/ui/Pager";
import { usePageSize } from "~/hooks/usePageSize";
import { GENDER_LABELS, GenderFilter } from "~/components/GenderFilter";

export default function Leaderboard(): React.ReactNode {
   const [pageIndex, setPageIndex] = React.useState(0);
   const [pageSize, setPageSize] = usePageSize(10);
   const pagination = { pageIndex, pageSize };
   const [sorting, setSorting] = React.useState<SortingState>([]);
   const [genders, setGenders] = React.useState<Array<Enum<typeof NameGender>>>([]);

   const teamsQuery = useTeams({ page: 0, pageSize: 10 });
   const teamId = teamsQuery.data?.data[0]?.id;

   const eloLeaderboard = useEloLeaderboard({
      teamId: teamId ?? null,
      page: pagination.pageIndex,
      pageSize: pagination.pageSize,
      orderBy: sorting[0]?.id ?? "elo",
      orderDirection: sorting[0]?.desc === false ? "asc" : "desc",
      genders,
   });

   // Remember the last known total so the pager doesn't disappear (and the
   // page doesn't jump) while the next page is being fetched.
   const total = usePreviousValue(eloLeaderboard.data?.total);
   const numPages = total == null ? null : Math.ceil(total / pagination.pageSize);

   const columns: Array<TableColumnDef<TeamEloWithName>> = [
      { accessorKey: "elo", header: "ELO" },
      { accessorKey: "name.name", header: "Name" },
      {
         accessorKey: "name.gender",
         header: "Gender",
         enableSorting: false,
         cell: ({ row }) =>
            row.original.name.gender != null
               ? GENDER_LABELS[row.original.name.gender]
               : "—",
      },
   ];

   return (
      <div className="space-y-8">
         <h1 className="font-title text-3xl">Name Leaderboard</h1>
         <GenderFilter
            value={genders}
            onChange={(value) => {
               setGenders(value);
               setPageIndex(0);
            }}
         />
         <Table
            data={eloLeaderboard.data?.data ?? []}
            columns={columns}
            pagination={pagination}
            sorting={sorting}
            setSorting={setSorting}
            isLoading={eloLeaderboard.isFetching}
         />
         {numPages != null && numPages > 0 && !eloLeaderboard.isError && (
            <Pager
               pageIndex={pageIndex}
               numPages={numPages}
               pageSize={pageSize}
               onPageIndexChange={setPageIndex}
               onPageSizeChange={(size) => {
                  setPageSize(size);
                  setPageIndex(0);
               }}
            />
         )}
      </div>
   );
}
