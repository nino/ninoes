import { useEloLeaderboard, useEloLeaderboards } from "~/hooks/useSupabase";
import { usePreviousValue } from "~/hooks/usePreviousValue";
import React from "react";
import type {
   EloLeaderboardRow,
   EloScope,
   EloScoreWithName,
   Enum,
   NameGender,
} from "~/model/types";
import { Table, type TableColumnDef } from "~/components/ui/Table";
import { type SortingState } from "@tanstack/react-table";
import { Pager } from "~/components/ui/Pager";
import { usePageSize } from "~/hooks/usePageSize";
import { GenderFilter } from "~/components/GenderFilter";
import { GenderScale } from "~/components/GenderScale";
import { chipClass } from "~/components/ui/styles";
import { Skeleton } from "~/components/ui/Skeleton";

type LeaderboardChoice = { key: string; label: string; scope: EloScope };
type TeamChoices = {
   teamName: string;
   whole: LeaderboardChoice;
   members: Array<LeaderboardChoice>;
};

/**
 * Groups my_elo_leaderboards() rows into the user's own board and, per team, the
 * whole team's board and each other member's.
 */
function groupChoices(rows: Array<EloLeaderboardRow>): {
   me: LeaderboardChoice | null;
   teams: Array<TeamChoices>;
} {
   let me: LeaderboardChoice | null = null;
   const teams = new Map<string, TeamChoices>();
   for (const row of rows) {
      if (row.team_id == null && row.user_id != null) {
         me = {
            key: `user:${row.user_id}`,
            label: "Me",
            scope: { kind: "user", userId: row.user_id },
         };
      } else if (row.team_id != null) {
         const team = teams.get(row.team_id) ?? {
            teamName: row.team_name ?? "Unnamed team",
            whole: {
               key: `team:${row.team_id}`,
               label: "Whole team",
               scope: { kind: "team", teamId: row.team_id },
            },
            members: [],
         };
         teams.set(row.team_id, team);
         if (row.user_id != null) {
            team.members.push({
               key: `team:${row.team_id}:user:${row.user_id}`,
               label: row.user_name ?? "Unnamed",
               scope: { kind: "user", userId: row.user_id },
            });
         }
      }
   }
   const myId = me?.scope.kind === "user" ? me.scope.userId : null;
   for (const team of teams.values()) {
      // "Me" already covers the signed-in user.
      team.members = team.members
         .filter(
            (member) => member.scope.kind !== "user" || member.scope.userId !== myId,
         )
         .sort((a, b) => a.label.localeCompare(b.label));
   }
   return {
      me,
      teams: [...teams.values()].sort((a, b) => a.teamName.localeCompare(b.teamName)),
   };
}

export default function Leaderboard(): React.ReactNode {
   const [pageIndex, setPageIndex] = React.useState(0);
   const [pageSize, setPageSize] = usePageSize(10);
   const pagination = { pageIndex, pageSize };
   const [sorting, setSorting] = React.useState<SortingState>([]);
   const [genders, setGenders] = React.useState<Array<Enum<typeof NameGender>>>([]);
   const [chosenKey, setChosenKey] = React.useState<string | null>(null);

   const leaderboards = useEloLeaderboards();
   const { me, teams } = groupChoices(leaderboards.data ?? []);
   const allChoices = [
      ...(me ? [me] : []),
      ...teams.flatMap((team) => [team.whole, ...team.members]),
   ];
   // Until the user picks one, show their first team's board, or their own.
   const chosen =
      allChoices.find((choice) => choice.key === chosenKey) ??
      teams.at(0)?.whole ??
      me ??
      null;

   const eloLeaderboard = useEloLeaderboard({
      scope: chosen?.scope ?? null,
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

   const choose = (key: string): void => {
      setChosenKey(key);
      setPageIndex(0);
   };

   const chip = (choice: LeaderboardChoice): React.ReactNode => (
      <button
         key={choice.key}
         type="button"
         className={chipClass(choice.key === chosen?.key)}
         aria-pressed={choice.key === chosen?.key}
         onClick={() => choose(choice.key)}
      >
         {choice.label}
      </button>
   );

   const columns: Array<TableColumnDef<EloScoreWithName>> = [
      { accessorKey: "elo", header: "ELO" },
      { accessorKey: "name.name", header: "Name", enableSorting: false },
      {
         accessorKey: "name.gender",
         header: "Gender",
         enableSorting: false,
         cell: ({ row }) => <GenderScale gender={row.original.name.gender} />,
      },
      { accessorKey: "wins", header: "Wins" },
      { accessorKey: "losses", header: "Losses" },
   ];

   return (
      <div className="space-y-8">
         <h1 className="font-title text-3xl">Name Leaderboard</h1>
         <section aria-label="Whose votes" className="space-y-3">
            {leaderboards.isPending ? (
               <Skeleton className="h-8 w-64" />
            ) : (
               <>
                  {me && (
                     <div className="flex flex-wrap items-center gap-2">{chip(me)}</div>
                  )}
                  {teams.map((team) => (
                     <div
                        key={team.whole.key}
                        className="flex flex-wrap items-center gap-2"
                        role="group"
                        aria-label={team.teamName}
                     >
                        <span className="mr-1 text-sm font-semibold">
                           {team.teamName}
                        </span>
                        {chip(team.whole)}
                        {team.members.map(chip)}
                     </div>
                  ))}
               </>
            )}
         </section>
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
