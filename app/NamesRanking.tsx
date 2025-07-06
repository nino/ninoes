import { Table, type TableProps } from "antd";
import { useNames, useVotes } from "./hooks/useSupabase";
import type { Name, VoteWithExtras } from "./model/types";
import { useState, type ReactNode } from "react";

type SortState = {
   orderBy: string;
   orderDirection: "asc" | "desc";
};

type PaginationState = {
   page: number;
   pageSize: number;
};

export function NamesRanking(): ReactNode {
   const [namesPagination, setNamesPagination] = useState<PaginationState>({
      page: 0,
      pageSize: 50,
   });
   const [namesSort, setNamesSort] = useState<SortState>({
      orderBy: "created_at",
      orderDirection: "desc",
   });

   const [votesPagination, setVotesPagination] = useState<PaginationState>({
      page: 0,
      pageSize: 50,
   });
   const [votesSort, setVotesSort] = useState<SortState>({
      orderBy: "created_at",
      orderDirection: "desc",
   });

   const { data: names = [], isLoading: isLoadingNames } = useNames({
      page: namesPagination.page,
      pageSize: namesPagination.pageSize,
      orderBy: namesSort.orderBy,
      orderDirection: namesSort.orderDirection,
   });

   const { data: votesData, isFetching: isLoadingVotes } = useVotes({
      page: votesPagination.page,
      pageSize: votesPagination.pageSize,
      orderBy: votesSort.orderBy,
      orderDirection: votesSort.orderDirection,
   });

   const nameColumns: TableProps<Name>["columns"] = [
      {
         title: "Name",
         dataIndex: "name",
         key: "name",
         sorter: true,
      },
      {
         title: "Created At",
         dataIndex: "created_at",
         key: "created_at",
         render: (date: Date) => date.toLocaleDateString(),
         sorter: true,
         defaultSortOrder: "descend",
      },
   ];

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
      },
      {
         title: "Created At",
         dataIndex: "created_at",
         key: "created_at",
         render: (date: Date) => date.toLocaleString(),
         sorter: true,
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
               pagination={{
                  current: namesPagination.page + 1,
                  pageSize: namesPagination.pageSize,
                  onChange: (page, pageSize) => {
                     setNamesPagination({
                        page: page - 1,
                        pageSize,
                     });
                  },
               }}
               onChange={(_, __, sorter) => {
                  if ("field" in sorter && "order" in sorter) {
                     setNamesSort({
                        orderBy: String(sorter.field),
                        orderDirection:
                           sorter.order === "ascend" ? "asc" : "desc",
                     });
                  }
               }}
            />
         </div>
         <div>
            <h2 className="text-xl font-bold mb-4">
               Votes <a href="/votes">(see all)</a>
            </h2>
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
               onChange={(_, __, sorter) => {
                  if ("field" in sorter && "order" in sorter) {
                     setVotesSort({
                        orderBy: String(sorter.field),
                        orderDirection:
                           sorter.order === "ascend" ? "asc" : "desc",
                     });
                  }
               }}
            />
         </div>
      </div>
   );
}
