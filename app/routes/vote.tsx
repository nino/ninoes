import { Button, Space, App, Spin } from "antd";
import {
   useRandomNames,
   useCreateVote,
   useTeams,
   useCreateVoteNew,
} from "~/hooks/useSupabase";
import { VoteType } from "~/model/types";
import { requireUser } from "~/server/guards.server";
import type { LoaderFunctionArgs } from "react-router";
import { Link, useLoaderData } from "react-router";
import type { ReactNode } from "react";
import type { User } from "@supabase/supabase-js";

export const loader = async ({
   request,
}: LoaderFunctionArgs): Promise<{ user: User }> => {
   const { user } = await requireUser(request);
   return { user };
};

export default function Vote(): ReactNode {
   const { user: _ } = useLoaderData<typeof loader>();
   const { data: names, isLoading, refetch, isFetching } = useRandomNames();
   const createVote = useCreateVote();
   const vote = useCreateVoteNew();
   const teamsQuery = useTeams({ page: 0, pageSize: 10 });
   const { message } = App.useApp();

   if (isLoading || !names || teamsQuery.isPending) {
      return <Spin />;
   }

   const handleVote = async (selectedNameIndex: number): Promise<void> => {
      if (names.length !== 2 || !teamsQuery.data) return;

      try {
         await vote.mutateAsync({
            winnerId: names[selectedNameIndex].id,
            loserId: names[1 - selectedNameIndex].id,
            teamId: teamsQuery.data.data[0].id,
         });

         message.success("Votes recorded successfully!");
         void refetch();
      } catch (error) {
         message.error("Failed to record votes");
         console.error(error);
      }
   };

   const handleBan = async (nameIndexes: Array<number>): Promise<void> => {
      try {
         await Promise.all(
            nameIndexes.map((index) => {
               createVote.mutate({
                  nameId: names[index].id,
                  voteType: VoteType.BAN,
               });
            }),
         );

         message.success("Ban votes recorded successfully!");
         void refetch();
      } catch (error) {
         message.error("Failed to record ban votes");
         console.error(error);
      }
   };

   return (
      <div className="flex flex-col items-center gap-8 p-8">
         <h1 className="text-2xl font-bold">Choose a name</h1>
         <div className="text-sm -mt-4">
            (it should be much more difficult now)
         </div>
         <Space size="large">
            {names.map((name, index) => (
               <Button
                  key={name.id}
                  size="large"
                  type="primary"
                  onClick={() => handleVote(index)}
                  loading={createVote.isPending || isFetching}
               >
                  {name.name}
               </Button>
            ))}
         </Space>
         <Space size="large" wrap className="justify-center">
            <Button
               danger
               onClick={() => handleBan([0])}
               loading={createVote.isPending || isFetching}
            >
               Ban {names[0].name}
            </Button>
            <Button
               danger
               onClick={() => handleBan([1])}
               loading={createVote.isPending || isFetching}
            >
               Ban {names[1].name}
            </Button>
            <Button
               danger
               onClick={() => handleBan([0, 1])}
               loading={createVote.isPending || isFetching}
            >
               Ban both
            </Button>
         </Space>
      </div>
   );
}
