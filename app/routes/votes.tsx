import { useDeleteVote, useVotes } from "~/hooks/useSupabase";
import { VoteType, type VoteWithExtras } from "~/model/types";
import { type ReactNode, useState } from "react";
import { Table } from "~/components/ui/Table";
import { Button } from "~/components/ui/Button";
import { useToast } from "~/components/ui/Toast";
import type { ColumnDef } from "@tanstack/react-table";

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
   const { showToast } = useToast();

   const handleDelete = async (id: string): Promise<void> => {
      if (window.confirm("Are you sure you want to delete this vote?")) {
         try {
            await deleteVote.mutateAsync(id);
            showToast("success", "Vote deleted successfully");
         } catch (error) {
            console.error("Failed to delete vote", error);
            showToast("error", "Failed to delete vote");
         }
      }
   };

   const voteColumns: Array<ColumnDef<VoteWithExtras>> = [
      {
         accessorKey: "name.name",
         header: "Name",
      },
      {
         accessorKey: "user.name",
         header: "User ID",
      },
      {
         accessorKey: "vote_type",
         header: "Vote Type",
      },
      {
         accessorKey: "created_at",
         header: "Created At",
         cell: ({ row }) => row.original.created_at.toLocaleString(),
      },
      {
         id: "actions",
         header: "Actions",
         cell: ({ row }) => (
            <Button
               variant="danger"
               onClick={() => handleDelete(row.original.id)}
               isLoading={deleteVote.isPending}
            >
               Delete
            </Button>
         ),
      },
   ];

   return (
      <div className="space-y-8">
         <div>
            <h2 className="text-xl font-bold mb-4">All votes</h2>
            <Table data={votesData?.data ?? []} columns={voteColumns} />
         </div>
      </div>
   );
}
