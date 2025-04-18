import { Table, type TableProps } from "antd";
import { useEloLeaderboard, useTeams } from "~/hooks/useSupabase";
import { useState, type ReactNode } from "react";
import type { TeamEloWithName } from "~/model/types";

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
  console.log({ teamId, eloLeaderboard: eloLeaderboard.data });

  const columns: TableProps<TeamEloWithName>["columns"] = [
    { title: "ELO", dataIndex: "elo", sorter: true },
    {
      title: "Name",
      key: "name",
      dataIndex: ["name", "name"],
    },
  ];

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold">Name Leaderboard</h1>
      <Table
        dataSource={eloLeaderboard.data?.data ?? []}
        columns={columns}
        loading={eloLeaderboard.isPending}
        rowKey="id"
        scroll={{ x: "max-content" }}
        pagination={{
          ...pagination,
          onChange: (page, pageSize) => {
            setPagination({ current: page, pageSize });
          },
          total: eloLeaderboard.data?.total ?? 0,
        }}
        onChange={(pagination, _, sorter) => {
          if (!Array.isArray(sorter) && sorter.column) {
            setSorting({
              orderBy: sorter.field as "elo" | "name",
              orderDirection: sorter.order === "ascend" ? "asc" : "desc",
            });
          }
        }}
        size="small"
      />
    </div>
  );
}
