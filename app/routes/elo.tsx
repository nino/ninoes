import { useEloLeaderboard, useTeams } from "~/hooks/useSupabase";
import { useState, type ReactNode } from "react";
import type { TeamEloWithName } from "~/model/types";
import { Table } from "~/components/ui/Table";
import type { ColumnDef } from "@tanstack/react-table";

export default function Leaderboard(): ReactNode {
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 10,
  });
  const [sorting, setSorting] = useState<{
    orderBy: "elo" | "name";
    orderDirection: "asc" | "desc";
  }>({
    orderBy: "elo",
    orderDirection: "desc",
  });

  const teamsQuery = useTeams({ page: 0, pageSize: 10 });
  const teamId = teamsQuery.data?.data[0]?.id;

  const eloLeaderboard = useEloLeaderboard({
    teamId: teamId ?? null,
    page: pagination.current - 1, // Convert from 1-indexed to 0-indexed
    pageSize: pagination.pageSize,
    orderBy: sorting.orderBy,
    orderDirection: sorting.orderDirection,
  });

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
      <Table data={eloLeaderboard.data?.data ?? []} columns={columns} />
    </div>
  );
}
