import { Table, type TableProps } from "antd";
import { useNames, useVotes } from "~/hooks/useSupabase";
import type { Name } from "~/model/types";
import { VOTE_TYPE } from "~/model/types";

type NameWithScore = Name & {
  score: number;
  upvotes: number;
  downvotes: number;
};

export default function Leaderboard() {
  const { data: names = [], isLoading: isLoadingNames } = useNames();
  const { data: votes = [], isLoading: isLoadingVotes } = useVotes();

  const namesWithScores: NameWithScore[] = names.map((name) => {
    const nameVotes = votes.filter((vote) => vote.name_id === name.id);
    const upvotes = nameVotes.filter(
      (vote) => vote.vote_type === VOTE_TYPE.UP
    ).length;
    const downvotes = nameVotes.filter(
      (vote) => vote.vote_type === VOTE_TYPE.DOWN
    ).length;

    return {
      ...name,
      score: upvotes - downvotes,
      upvotes,
      downvotes,
    };
  });

  const columns: TableProps<NameWithScore>["columns"] = [
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
        dataSource={namesWithScores.sort((a, b) => b.score - a.score)}
        columns={columns}
        loading={isLoadingNames || isLoadingVotes}
        rowKey="id"
        pagination={{
          pageSize: 10,
        }}
        size="small"
      />
    </div>
  );
}
