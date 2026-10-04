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
import { Skeleton } from "~/components/ui/Skeleton";

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
         <div role="status" className="flex flex-col items-center gap-8 py-8">
            <span className="sr-only">Loading</span>
            <Skeleton className="h-9 w-64" />
            <div className="flex flex-wrap justify-center gap-4">
               <Skeleton className="h-14 w-40" />
               <Skeleton className="h-14 w-40" />
            </div>
            <div className="flex flex-wrap justify-center gap-4">
               <Skeleton className="h-10 w-32" />
               <Skeleton className="h-10 w-32" />
               <Skeleton className="h-10 w-24" />
            </div>
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
            nameIndexes.map((index) =>
               createVote.mutateAsync({
                  nameId: names[index].id,
                  voteType: VoteType.BAN,
               }),
            ),
         );

         showToast("success", "Ban votes recorded successfully!");
      } catch (error) {
         showToast("error", "Failed to record ban votes");
         console.error(error);
      } finally {
         // Banning two names issues two mutations; one can land while the
         // other fails, so resync regardless of the aggregate outcome.
         void refetch();
      }
   };

   return (
      <div className="flex flex-col items-center gap-8 py-8">
         <div className="flex flex-col items-center gap-2 text-center">
            <h1 className="font-title text-3xl">Choose a name</h1>
            <p className="text-sm text-muted-fg">
               (it should be much more difficult now)
            </p>
         </div>
         <div className="flex w-full flex-wrap justify-center gap-4">
            {names.map((name, index) => (
               <Button
                  key={name.id}
                  onClick={() => handleVote(index)}
                  isLoading={vote.isPending || isFetching}
                  big
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
