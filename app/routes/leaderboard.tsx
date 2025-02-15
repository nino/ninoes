import { Table, type TableProps } from "antd";
import { useNameScores } from "~/hooks/useSupabase";
import type { NameScore } from "~/hooks/useSupabase";

export default function Leaderboard() {
  const { data: scores = [], isLoading } = useNameScores();

  const columns: TableProps<NameScore>["columns"] = [
    {
      title: "Rank",
      key: "rank",
      render: (_: unknown, _record: unknown, index: number) => index + 1,
      width: 80,
    },
    {
      title: "Name",
      dataIndex: "name",
      key: "name",
      sorter: (a, b) => a.name.localeCompare(b.name),
    },
    {
      title: "Score",
      dataIndex: "score",
      key: "score",
      defaultSortOrder: "descend",
      sorter: (a, b) => a.score - b.score,
    },
    {
      title: "Upvotes",
      dataIndex: "upvotes",
      key: "upvotes",
      sorter: (a, b) => a.upvotes - b.upvotes,
    },
    {
      title: "Downvotes",
      dataIndex: "downvotes",
      key: "downvotes",
      sorter: (a, b) => a.downvotes - b.downvotes,
    },
  ];

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold">Name Leaderboard</h1>
      <Table
        dataSource={scores}
        columns={columns}
        loading={isLoading}
        rowKey="id"
        pagination={{
          pageSize: 10,
        }}
        size="small"
      />
    </div>
  );
}
