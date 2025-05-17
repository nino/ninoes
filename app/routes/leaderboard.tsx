import { Table, type TableProps } from "antd";
import {
  useNameScores,
} from "~/hooks/useSupabase";
import type { NameScore } from "~/hooks/useSupabase";
import { useState, type ReactNode } from "react";

export default function Leaderboard(): ReactNode {
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 50,
  });
  const [sorting, setSorting] = useState<{
    orderBy:
      | "score"
      | "name"
      | "created_at"
      | "upvotes"
      | "downvotes"
      | "controversial";
    orderDirection: "asc" | "desc";
  }>({
    orderBy: "score",
    orderDirection: "desc",
  });

  const { data: scores, isLoading } = useNameScores({
    limit: pagination.pageSize,
    offset: (pagination.current - 1) * pagination.pageSize,
    orderBy: sorting.orderBy,
    orderDirection: sorting.orderDirection,
  });

  const columns: TableProps<NameScore>["columns"] = [
    {
      title: "Rank",
      key: "rank",
      render: (_: unknown, _record: unknown, index: number) =>
        (pagination.current - 1) * pagination.pageSize + index + 1,
      width: 80,
    },
    {
      title: "Name",
      dataIndex: "name",
      key: "name",
      sortDirections: ["ascend", "descend"],
      sorter: true,
    },
    {
      title: "Score",
      dataIndex: "score",
      key: "score",
      defaultSortOrder: "descend",
      sortDirections: ["ascend", "descend"],
      sorter: true,
      render: (value: number) => value.toLocaleString(),
    },
    {
      title: "Upvotes",
      dataIndex: "upvotes",
      key: "upvotes",
      sortDirections: ["ascend", "descend"],
      sorter: true,
      render: (value: number) => value.toLocaleString(),
    },
    {
      title: "Downvotes",
      dataIndex: "downvotes",
      key: "downvotes",
      sortDirections: ["ascend", "descend"],
      sorter: true,
      render: (value: number) => value.toLocaleString(),
    },
    {
      title: "Controversial",
      dataIndex: "controversial",
      key: "controversial",
      sortDirections: ["ascend", "descend"],
      sorter: true,
      render: (value: number) => value.toLocaleString(),
    },
  ];

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold">Name Leaderboard</h1>
      <Table
        dataSource={scores?.data}
        columns={columns}
        loading={isLoading}
        rowKey="id"
        scroll={{ x: "max-content" }}
        pagination={{
          ...pagination,
          onChange: (page, pageSize) => {
            setPagination({ current: page, pageSize });
          },
          total: scores?.total,
        }}
        onChange={(pagination, _, sorter) => {
          if (!Array.isArray(sorter) && sorter.column) {
            setSorting({
              orderBy: sorter.field as
                | "score"
                | "name"
                | "created_at"
                | "upvotes"
                | "downvotes"
                | "controversial",
              orderDirection: sorter.order === "ascend" ? "asc" : "desc",
            });
          }
        }}
        size="small"
      />
    </div>
  );
}
