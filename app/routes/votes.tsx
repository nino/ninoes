import { Button, Popconfirm, Table, type TableProps } from "antd";
import { useDeleteVote, useVotes } from "~/hooks/useSupabase";
import { VoteType, type VoteWithExtras } from "~/model/types";
import { useState, type ReactNode } from "react";

type SortState = {
  orderBy: string;
  orderDirection: "asc" | "desc";
};

type PaginationState = {
  page: number;
  pageSize: number;
};

export default function Votes(): ReactNode {
  const [votesPagination, setVotesPagination] = useState<PaginationState>({
    page: 0,
    pageSize: 50,
  });
  const [votesSort, setVotesSort] = useState<SortState>({
    orderBy: "created_at",
    orderDirection: "desc",
  });
  const [typeFilter, setTypeFilter] = useState<Array<VoteType>>([]);
  const { data: votesData, isFetching: isLoadingVotes } = useVotes({
    page: votesPagination.page,
    pageSize: votesPagination.pageSize,
    orderBy: votesSort.orderBy,
    orderDirection: votesSort.orderDirection,
    voteTypes: typeFilter,
  });

  const deleteVote = useDeleteVote();

  const handleDelete = (id: string): void => {
    deleteVote.mutate(id);
  };

  const voteColumns: TableProps<VoteWithExtras>["columns"] = [
    {
      title: "Name",
      dataIndex: "name_id",
      key: "name_id",
      render: (_: unknown, record: VoteWithExtras) => record.name.name,
    },
    {
      title: "User ID",
      dataIndex: "user_id",
      key: "user_id",
      render: (_: unknown, record: VoteWithExtras) => record.user.name,
    },
    {
      title: "Vote Type",
      dataIndex: "vote_type",
      key: "vote_type",
      sorter: true,
      filters: [
        { text: "Upvote", value: VoteType.UP },
        { text: "Downvote", value: VoteType.DOWN },
        { text: "Ban", value: VoteType.BAN },
      ],
    },
    {
      title: "Created At",
      dataIndex: "created_at",
      key: "created_at",
      render: (date: Date) => date.toLocaleString(),
      sorter: true,
      defaultSortOrder: "descend",
    },
    {
      title: "Actions",
      key: "actions",
      render: (_: unknown, record: VoteWithExtras) => (
        <Popconfirm
          title="Are you sure you want to delete this vote?"
          onConfirm={() => handleDelete(record.id)}
        >
          <Button danger>Delete</Button>
        </Popconfirm>
      ),
    },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-xl font-bold mb-4">All votes</h2>
        <Table
          size="small"
          scroll={{ x: "max-content" }}
          dataSource={votesData?.data}
          columns={voteColumns}
          loading={isLoadingVotes}
          rowKey="id"
          pagination={{
            current: votesPagination.page + 1,
            pageSize: votesPagination.pageSize,
            onChange: (page, pageSize) => {
              setVotesPagination({
                page: page - 1,
                pageSize,
              });
            },
            total: votesData?.total ?? undefined,
          }}
          onChange={(pagination, filters, sorter) => {
            console.log(filters);
            if (filters.vote_type) {
              setTypeFilter(filters.vote_type as Array<VoteType>);
            } else {
              setTypeFilter([]);
            }
            if ("field" in sorter && "order" in sorter) {
              setVotesSort({
                orderBy: String(sorter.field),
                orderDirection: sorter.order === "ascend" ? "asc" : "desc",
              });
            }
          }}
        />
      </div>
    </div>
  );
}
