import { Table, type TableProps } from "antd";
import { useNames, useVotes } from "./hooks/useSupabase";
import type { Name, VoteWithExtras } from "./model/types";

export function NamesRanking() {
  const { data: names = [], isLoading: isLoadingNames } = useNames();
  const { data: votes = [], isLoading: isLoadingVotes } = useVotes();

  const nameColumns: TableProps<Name>["columns"] = [
    {
      title: "Name",
      dataIndex: "name",
      key: "name",
      sorter: (a, b) => a.name.localeCompare(b.name),
    },
    {
      title: "Created At",
      dataIndex: "created_at",
      key: "created_at",
      render: (date: Date) => date.toLocaleDateString(),
      sorter: (a, b) => a.created_at.getTime() - b.created_at.getTime(),
      defaultSortOrder: "descend",
    },
  ];

  const voteColumns: TableProps<VoteWithExtras>["columns"] = [
    {
      title: "Name",
      dataIndex: "name_id",
      key: "name_id",
      render: (_: unknown, record: VoteWithExtras) => record.name.name,
      sorter: (a, b) => a.name.name.localeCompare(b.name.name),
    },
    {
      title: "User ID",
      dataIndex: "user_id",
      key: "user_id",
      render: (_: unknown, record: VoteWithExtras) => record.user.name,
      sorter: (a, b) => a.user.name.localeCompare(b.user.name),
    },
    {
      title: "Vote Type",
      dataIndex: "vote_type",
      key: "vote_type",
      sorter: (a, b) => a.vote_type.localeCompare(b.vote_type),
    },
    {
      title: "Created At",
      dataIndex: "created_at",
      key: "created_at",
      render: (date: Date) => date.toLocaleString(),
      sorter: (a, b) => a.created_at.getTime() - b.created_at.getTime(),
      defaultSortOrder: "descend",
    },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-xl font-bold mb-4">Names</h2>
        <Table
          size="small"
          scroll={{ x: "max-content" }}
          dataSource={names}
          columns={nameColumns}
          loading={isLoadingNames}
          rowKey="id"
        />
      </div>
      <div>
        <h2 className="text-xl font-bold mb-4">Votes</h2>
        <Table
          size="small"
          scroll={{ x: "max-content" }}
          dataSource={votes}
          columns={voteColumns}
          loading={isLoadingVotes}
          rowKey="id"
        />
      </div>
    </div>
  );
}
