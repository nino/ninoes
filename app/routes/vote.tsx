import {
   useCreateVote,
   useCreateVoteNew,
   useRandomNames,
   useTeams,
} from "~/hooks/useSupabase";
import { VoteType } from "~/model/types";
import { requireUser } from "~/server/guards.server";
import type { LoaderFunctionArgs } from "react-router";
import { useLoaderData } from "react-router";
import type { ReactNode } from "react";
import type { User } from "@supabase/supabase-js";
import { Button } from "~/components/ui/Button";
import { useToast } from "~/components/ui/Toast";

export const loader = async ({
   request,
}: LoaderFunctionArgs): Promise<{ user: User }> => {
   const { user } = await requireUser(request);
   console.log({ user });
   return { user };
};

export default function Vote(): ReactNode {
   const { user: _ } = useLoaderData<typeof loader>();
   const { data: names, isLoading, refetch, isFetching } = useRandomNames();
   const createVote = useCreateVote();
   const vote = useCreateVoteNew();
   const teamsQuery = useTeams({ page: 0, pageSize: 10 });
   const { showToast } = useToast();

   if (isLoading || !names || teamsQuery.isPending) {
      return (
         <div className="flex justify-center items-center min-h-screen">
            <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
         </div>
      );
   }

   const handleVote = async (selectedNameIndex: number): Promise<void> => {
      if (names.length !== 2 || !teamsQuery.data) return;

      try {
         await vote.mutateAsync({
            winnerId: names[selectedNameIndex].id,
            loserId: names[1 - selectedNameIndex].id,
            teamId: teamsQuery.data.data[0].id,
         });

         showToast("success", "Votes recorded successfully!");
         void refetch();
      } catch (error) {
         showToast("error", "Failed to record votes");
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

         showToast("success", "Ban votes recorded successfully!");
         void refetch();
      } catch (error) {
         showToast("error", "Failed to record ban votes");
         console.error(error);
      }
   };

   return (
      <div className="flex flex-col items-center gap-8 p-8">
         <h1 className="text-2xl font-bold">Choose a name</h1>
         <div className="text-sm -mt-4">
            (it should be much more difficult now)
         </div>
         <div className="flex gap-4">
            {names.map((name, index) => (
               <Button
                  key={name.id}
                  onClick={() => handleVote(index)}
                  isLoading={createVote.isPending || isFetching}
               >
                  {name.name}
               </Button>
            ))}
         </div>
         <div className="flex gap-4 flex-wrap justify-center">
            <Button
               variant="danger"
               onClick={() => handleBan([0])}
               isLoading={createVote.isPending || isFetching}
            >
               Ban {names[0].name}
            </Button>
            <Button
               variant="danger"
               onClick={() => handleBan([1])}
               isLoading={createVote.isPending || isFetching}
            >
               Ban {names[1].name}
            </Button>
            <Button
               variant="danger"
               onClick={() => handleBan([0, 1])}
               isLoading={createVote.isPending || isFetching}
            >
               Ban both
            </Button>
         </div>
      </div>
   );
}
