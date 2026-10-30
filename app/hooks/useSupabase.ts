import {
   keepPreviousData,
   useIsFetching,
   useMutation,
   type UseMutationResult,
   useQuery,
   useQueryClient,
   type UseQueryResult,
} from "@tanstack/react-query";
import { supabase } from "../supabaseClient";
import type {
   BlogDailyViews,
   BlogTopPage,
   BlogTopReferrer,
   Enum,
   Name,
   EloLeaderboardRow,
   EloScope,
   EloScoreWithName,
   Team,
   TeamMembershipWithTeam,
   User,
   VoteType,
   VoteWithExtras,
   Wish,
} from "~/model/types";
import {
   BlogDailyViewsSchema,
   BlogTopPageSchema,
   BlogTopReferrerSchema,
   EloLeaderboardRowSchema,
   EloScoreWithNameSchema,
   NameGender,
   NameSchema,
   TeamMembershipWithTeamSchema,
   TeamSchema,
   UserSchema,
   VoteWithExtrasSchema,
   WishSchema,
} from "../model/types";
import { useSession } from "./useSession";
import { z } from "zod";
import { BLOG_TOP_ROWS, type BlogStatsRange } from "~/utils/blog-stats";

export function useNames({
   page,
   pageSize,
   orderBy,
   orderDirection,
   genders = [],
}: {
   page: number;
   pageSize: number;
   orderBy: string;
   orderDirection: "asc" | "desc";
   genders?: Array<Enum<typeof NameGender>>;
}): UseQueryResult<Array<Name>> {
   return useQuery({
      queryKey: ["names", page, pageSize, orderBy, genders],
      queryFn: async () => {
         let q = supabase.from("Names").select("*");

         if (genders.length > 0) {
            q = q.in("gender", genders);
         }

         const { data, error } = await q
            .range(page * pageSize, (page + 1) * pageSize - 1)
            .order(orderBy, { ascending: orderDirection === "asc" });

         if (error) {
            throw error;
         }

         return data.map((name) => NameSchema.parse(name));
      },
   });
}

export function useVotes({
   page,
   pageSize,
   orderBy,
   orderDirection,
   voteTypes = [],
}: {
   page: number;
   pageSize: number;
   orderBy: string;
   orderDirection: "asc" | "desc";
   voteTypes?: Array<Enum<typeof VoteType>>;
}): UseQueryResult<{ data: Array<VoteWithExtras>; total: number | null }> {
   return useQuery({
      queryKey: ["votes", page, pageSize, orderBy, voteTypes],
      queryFn: async () => {
         let q = supabase
            .from("Votes")
            .select(`*, name:Names!name_id(name), user:Users!user_id(name)`, {
               count: "exact",
            });

         if (voteTypes.length > 0) {
            q = q.in("vote_type", voteTypes);
         }

         q = q
            .range(page * pageSize, (page + 1) * pageSize - 1)
            .order(orderBy === "undefined" ? "created_at" : orderBy, {
               ascending: orderDirection === "asc",
            });

         const { data, error, count } = await q;

         if (error) {
            throw error;
         }

         return {
            data: data.map((vote) => VoteWithExtrasSchema.parse(vote)),
            total: count,
         };
      },
   });
}

export function useUser(userId: string): UseQueryResult<User> {
   return useQuery({
      queryKey: ["user", userId],
      queryFn: async () => {
         const { data, error } = await supabase
            .from("Users")
            .select("*")
            .eq("id", userId);

         if (error) {
            throw error;
         }

         return UserSchema.parse(data[0]);
      },
   });
}

export function useRandomNames(): UseQueryResult<Array<Name>> {
   const teamsQuery = useTeams({ page: 0, pageSize: 10 });
   const teamId = teamsQuery.data?.data[0]?.id;
   return useQuery({
      queryKey: ["randomNames"],
      queryFn: async () => {
         if (teamId == null) throw new Error("unreachable");
         const { data, error } = await supabase.rpc("get_two_names_beta", {
            team_id: teamId,
         });

         const result = z.array(NameSchema).parse(data);

         if (error != null) {
            throw error;
         }

         return result;
      },
      enabled: teamId != null,
   });
}

type HeadToHeadVoteParams = { winnerId: string; loserId: string };

/**
 * Records that the user picked one name over another. The database derives
 * every Elo rating from these votes, so this doesn't deal with teams at all.
 */
export function useHeadToHeadVote(): UseMutationResult<
   void,
   Error,
   HeadToHeadVoteParams
> {
   const queryClient = useQueryClient();
   const { session, supabase: authSupabase } = useSession();

   return useMutation({
      mutationFn: async ({ winnerId, loserId }) => {
         if (!session) throw new Error("no auth");
         const { error } = await authSupabase.rpc("vote", {
            p_winner_id: winnerId,
            p_loser_id: loserId,
         });
         if (error) throw error;
      },
      onSuccess: () =>
         Promise.all([
            queryClient.invalidateQueries({ queryKey: ["votes"] }),
            queryClient.invalidateQueries({ queryKey: ["eloLeaderboard"] }),
         ]),
   });
}

type CreateVoteParams = { nameId: string; voteType: Enum<typeof VoteType> };

export function useCreateVote(): UseMutationResult<void, Error, CreateVoteParams> {
   const queryClient = useQueryClient();
   const { session, supabase: authSupabase } = useSession();

   return useMutation({
      mutationFn: async ({ nameId, voteType }: CreateVoteParams) => {
         if (!session) {
            throw new Error("User not authenticated");
         }

         const { error } = await authSupabase
            .from("Votes")
            .insert({ name_id: nameId, user_id: session.user.id, vote_type: voteType });

         if (error) {
            throw error;
         }
      },
      onSuccess: () =>
         Promise.all([
            queryClient.invalidateQueries({ queryKey: ["votes"] }),
            queryClient.invalidateQueries({ queryKey: ["nameScores"] }),
         ]),
   });
}

const NameScoreRPCResponseSchema = z.object({
   id: z.string(),
   name: z.string(),
   created_at: z.string(),
   gender: z.enum(NameGender).nullish(),
   score: z.number(),
   total_votes: z.number(),
   upvotes: z.number(),
   downvotes: z.number(),
   controversial: z.number(),
   total: z.number(),
});

const _NameScoreSchema = z.object({
   id: z.string(),
   name: z.string(),
   created_at: z.date(),
   gender: z.enum(NameGender).nullish(),
   score: z.number(),
   total_votes: z.number(),
   upvotes: z.number(),
   downvotes: z.number(),
   controversial: z.number(),
   total: z.number(),
});

export type NameScoreRPCResponse = z.infer<typeof NameScoreRPCResponseSchema>;
export type NameScore = z.infer<typeof _NameScoreSchema>;

export function useNameScores({
   limit = 50,
   offset = 0,
   orderBy = "score",
   orderDirection = "desc",
   genders = [],
}: {
   limit?: number;
   offset?: number;
   orderBy?: string;
   orderDirection?: "asc" | "desc";
   genders?: Array<Enum<typeof NameGender>>;
} = {}): UseQueryResult<{ data: Array<NameScore>; total: number }> {
   return useQuery({
      queryKey: ["nameScores", limit, offset, orderBy, orderDirection, genders],
      queryFn: async () => {
         const { data, error } = await supabase.rpc("get_leaderboard", {
            p_limit: limit,
            p_offset: offset,
            p_order_by: orderBy,
            p_order_direction: orderDirection,
            ...(genders.length > 0 ? { p_genders: genders } : {}),
         });

         const result = z.array(NameScoreRPCResponseSchema).parse(data);

         if (error) {
            throw error;
         }

         return {
            data: result.map((score) => ({
               ...score,
               created_at: new Date(score.created_at),
            })),
            total: result[0]?.total ?? 0,
         };
      },
   });
}

export function useTeams({
   page,
   pageSize,
   orderBy = "created_at",
   orderDirection = "desc",
}: {
   page: number;
   pageSize: number;
   orderBy?: string;
   orderDirection?: "asc" | "desc";
}): UseQueryResult<{ data: Array<Team>; total: number }> {
   return useQuery({
      queryKey: ["teams", page, pageSize, orderBy, orderDirection],
      queryFn: async () => {
         const { data, error, count } = await supabase
            .from("teams")
            .select("*", { count: "exact" })
            .range(page * pageSize, (page + 1) * pageSize - 1)
            .order(orderBy, { ascending: orderDirection === "asc" });

         if (error) {
            throw error;
         }

         return { data: data.map((team) => TeamSchema.parse(team)), total: count ?? 0 };
      },
   });
}

type CreateTeamParams = { name: string; creator: string };

export function useCreateTeam(): UseMutationResult<void, Error, CreateTeamParams> {
   const queryClient = useQueryClient();

   return useMutation({
      mutationFn: async ({ name, creator }: CreateTeamParams) => {
         const { error } = await supabase.from("teams").insert({ name, creator });

         if (error) {
            throw error;
         }
      },
      onSuccess: () => queryClient.invalidateQueries({ queryKey: ["teams"] }),
   });
}

export function useDeleteTeam(): UseMutationResult<void, Error, string> {
   const queryClient = useQueryClient();

   return useMutation({
      mutationFn: async (teamId: string) => {
         const { error } = await supabase.from("teams").delete().eq("id", teamId);

         if (error) {
            throw error;
         }
      },
      onSuccess: () => queryClient.invalidateQueries({ queryKey: ["teams"] }),
   });
}

export function useTeamMemberships({
   page,
   pageSize,
   orderBy = "created_at",
   orderDirection = "desc",
}: {
   page: number;
   pageSize: number;
   orderBy?: string;
   orderDirection?: "asc" | "desc";
}): UseQueryResult<{ data: Array<TeamMembershipWithTeam>; total: number }> {
   const { session } = useSession();

   return useQuery({
      queryKey: [
         "teamMemberships",
         session?.user.id,
         page,
         pageSize,
         orderBy,
         orderDirection,
      ],
      queryFn: async () => {
         if (!session) {
            throw new Error("User not authenticated");
         }

         const { data, error, count } = await supabase
            .from("TeamMemberships")
            .select("*, team:teams(*)", { count: "exact" })
            .eq("user_id", session.user.id)
            .range(page * pageSize, (page + 1) * pageSize - 1)
            .order(orderBy, { ascending: orderDirection === "asc" });

         if (error) {
            throw error;
         }

         return {
            data: data.map((membership) =>
               TeamMembershipWithTeamSchema.parse(membership),
            ),
            total: count ?? 0,
         };
      },
   });
}

export function useJoinTeam(): UseMutationResult<void, Error, { teamId: string }> {
   const queryClient = useQueryClient();
   const { session } = useSession();

   return useMutation({
      mutationFn: async ({ teamId }: { teamId: string }) => {
         if (!session) {
            throw new Error("User not authenticated");
         }

         const { error } = await supabase
            .from("TeamMemberships")
            .insert({ team_id: teamId, user_id: session.user.id });

         if (error) {
            throw error;
         }
      },
      onSuccess: () => queryClient.invalidateQueries({ queryKey: ["teamMemberships"] }),
   });
}

export function useLeaveTeam(): UseMutationResult<void, Error, string> {
   const queryClient = useQueryClient();

   return useMutation({
      mutationFn: async (membershipId: string) => {
         const { error } = await supabase
            .from("TeamMemberships")
            .delete()
            .eq("id", membershipId);

         if (error) {
            throw error;
         }
      },
      onSuccess: () => queryClient.invalidateQueries({ queryKey: ["teamMemberships"] }),
   });
}

export function useDeleteVote(): UseMutationResult<void, Error, string> {
   const queryClient = useQueryClient();

   return useMutation({
      mutationFn: async (voteId: string) => {
         const { error } = await supabase.from("Votes").delete().eq("id", voteId);

         if (error) {
            throw error;
         }
      },
      onSuccess: async () => {
         await queryClient.invalidateQueries({ queryKey: ["votes"] });
      },
      onError: (error) => {
         console.error(error);
      },
   });
}

/** The Elo leaderboards the signed-in user can see. */
export function useEloLeaderboards(): UseQueryResult<Array<EloLeaderboardRow>> {
   const { session, supabase: authSupabase } = useSession();

   return useQuery({
      queryKey: ["eloLeaderboards", session?.user.id],
      enabled: session != null,
      queryFn: async () => {
         const { data, error } = await authSupabase.rpc("my_elo_leaderboards");
         if (error) throw error;
         return z.array(EloLeaderboardRowSchema).parse(data);
      },
   });
}

export function useEloLeaderboard({
   scope,
   page = 0,
   pageSize = 10,
   orderBy = "elo",
   orderDirection = "desc",
   genders = [],
}: {
   scope: EloScope | null;
   page?: number;
   pageSize?: number;
   orderBy?: string;
   orderDirection?: "asc" | "desc";
   genders?: Array<Enum<typeof NameGender>>;
}): UseQueryResult<{ data: Array<EloScoreWithName>; total: number | null }> {
   const { session, supabase: authSupabase } = useSession();

   return useQuery({
      queryKey: [
         "eloLeaderboard",
         scope,
         page,
         pageSize,
         orderBy,
         orderDirection,
         genders,
      ],
      enabled: scope != null && session != null,
      placeholderData: keepPreviousData,
      queryFn: async () => {
         if (scope == null) throw new Error("unreachable");

         // !inner join so gender filters on Names also filter the elo rows
         let q =
            scope.kind === "team"
               ? authSupabase
                    .from("team_elo")
                    .select("*, name:Names!inner(*)", { count: "exact" })
                    .eq("team_id", scope.teamId)
               : authSupabase
                    .from("user_elo")
                    .select("*, name:Names!inner(*)", { count: "exact" })
                    .eq("user_id", scope.userId);

         if (genders.length > 0) {
            q = q.in("name.gender", genders);
         }

         const { data, error, count } = await q
            .order(orderBy, { ascending: orderDirection === "asc" })
            .order("name_id")
            .range(page * pageSize, (page + 1) * pageSize - 1);
         if (error) throw error;
         return {
            data: data.map((row) => EloScoreWithNameSchema.parse(row)),
            total: count,
         };
      },
   });
}

// Wishlist. Unauthenticated: everything goes through the anon client.

const wishColumns =
   "id, created_at, title, description, price, link, language, translated_title, translated_description";

export function useWishes({
   spoilerFree,
}: {
   spoilerFree: boolean;
}): UseQueryResult<Array<Wish>> {
   return useQuery({
      queryKey: ["wishes", spoilerFree],
      queryFn: async () => {
         // In no-spoilers mode contributions aren't fetched at all.
         const { data, error } = await supabase
            .from("wishes")
            .select(
               spoilerFree
                  ? wishColumns
                  : `${wishColumns}, contributions:wish_contributions(id, created_at, name, amount, complete)`,
            )
            .order("created_at", { ascending: true })
            .order("id");
         if (error) throw error;
         return data.map((row) => {
            const wish = WishSchema.parse(row);
            wish.contributions?.sort(
               (a, b) => a.created_at.getTime() - b.created_at.getTime(),
            );
            return wish;
         });
      },
   });
}

export type WishInput = {
   title: string;
   description: string | null;
   price: number | null;
   link: string | null;
};

export function useAddWish(): UseMutationResult<Wish, Error, WishInput> {
   const queryClient = useQueryClient();
   return useMutation({
      mutationFn: async (wish: WishInput) => {
         const { data, error } = await supabase
            .from("wishes")
            .insert(wish)
            .select(wishColumns)
            .single();
         if (error) throw error;
         return WishSchema.parse(data);
      },
      onSuccess: () => queryClient.invalidateQueries({ queryKey: ["wishes"] }),
   });
}

export function useUpdateWish(): UseMutationResult<
   void,
   Error,
   { id: string; wish: WishInput }
> {
   const queryClient = useQueryClient();
   return useMutation({
      mutationFn: async ({ id, wish }) => {
         const { error } = await supabase
            .from("wishes")
            .update({ ...wish, updated_at: new Date().toISOString() })
            .eq("id", id);
         if (error) throw error;
      },
      onSuccess: () => queryClient.invalidateQueries({ queryKey: ["wishes"] }),
   });
}

export function useDeleteWish(): UseMutationResult<void, Error, string> {
   const queryClient = useQueryClient();
   return useMutation({
      mutationFn: async (id: string) => {
         const { error } = await supabase.from("wishes").delete().eq("id", id);
         if (error) throw error;
      },
      onSuccess: () => queryClient.invalidateQueries({ queryKey: ["wishes"] }),
   });
}

/**
 * Adds or replaces `name`'s contribution to a wish: the whole gift when
 * `complete`, otherwise a share with an optional amount. Resolves to the
 * database's verdict; anything but "ok" means nothing changed.
 */
export function useContribute(): UseMutationResult<
   "ok" | "invalid" | "missing" | "taken" | "shared",
   Error,
   { id: string; name: string; amount: number | null; complete: boolean }
> {
   const queryClient = useQueryClient();
   return useMutation({
      mutationFn: async ({ id, name, amount, complete }) => {
         const { data, error } = await supabase.rpc("contribute_to_wish", {
            p_wish_id: id,
            p_name: name,
            p_amount: amount,
            p_complete: complete,
         });
         if (error) throw error;
         return z.enum(["ok", "invalid", "missing", "taken", "shared"]).parse(data);
      },
      onSettled: () => queryClient.invalidateQueries({ queryKey: ["wishes"] }),
   });
}

/** Removes `name`'s contribution. Resolves to false if there was none. */
export function useWithdrawContribution(): UseMutationResult<
   boolean,
   Error,
   { id: string; name: string }
> {
   const queryClient = useQueryClient();
   return useMutation({
      mutationFn: async ({ id, name }) => {
         const { data, error } = await supabase.rpc("withdraw_wish_contribution", {
            p_wish_id: id,
            p_name: name,
         });
         if (error) throw error;
         return z.boolean().parse(data);
      },
      onSettled: () => queryClient.invalidateQueries({ queryKey: ["wishes"] }),
   });
}

/**
 * Asks the server to translate the given untranslated wishes. Keyed on their
 * ids, so a run that fails or gets nowhere isn't repeated until the set of
 * pending wishes changes, and a wish that can't be translated doesn't cause
 * a request loop. Only one run happens at a time; a set that changes mid-run
 * is picked up once it finishes.
 */
export function useTranslateWishes(
   pendingIds: Array<string>,
): UseQueryResult<{ translated: number; failed: number }> {
   const queryClient = useQueryClient();
   const running = useIsFetching({ queryKey: ["translate-wishes"] });
   return useQuery({
      queryKey: ["translate-wishes", pendingIds],
      enabled: pendingIds.length > 0 && running === 0,
      staleTime: Infinity,
      // Dropped as soon as the set moves on, so the same wish being edited
      // again later is translated again rather than answered from cache.
      gcTime: 0,
      retry: false,
      refetchOnWindowFocus: false,
      queryFn: async () => {
         const response = await fetch("/wishlist/translate", { method: "POST" });
         if (!response.ok) throw new Error(`Translation failed: ${response.status}`);
         const result = z
            .object({ translated: z.number(), failed: z.number() })
            .parse(await response.json());
         if (result.translated > 0) {
            await queryClient.invalidateQueries({ queryKey: ["wishes"] });
         }
         return result;
      },
   });
}

// ninoan.com's page views, from the blog_* report functions. They only return rows
// to Nino's account; anyone else gets empty results. Because the results depend on
// who's signed in, the query keys include the user: the query cache outlives
// signing out. Switching ranges keeps the previous range on screen until the new
// one arrives.

export function useBlogDailyViews(
   userId: string,
   { fromDay, toDay }: BlogStatsRange,
): UseQueryResult<Array<BlogDailyViews>> {
   return useQuery({
      queryKey: ["blogDailyViews", userId, fromDay, toDay],
      placeholderData: keepPreviousData,
      queryFn: async () => {
         const { data, error } = await supabase.rpc("blog_daily_views", {
            from_day: fromDay,
            to_day: toDay,
         });
         if (error) {
            throw error;
         }
         return z.array(BlogDailyViewsSchema).parse(data);
      },
   });
}

export function useBlogTopPages(
   userId: string,
   { fromDay, toDay }: BlogStatsRange,
): UseQueryResult<Array<BlogTopPage>> {
   return useQuery({
      queryKey: ["blogTopPages", userId, fromDay, toDay],
      placeholderData: keepPreviousData,
      queryFn: async () => {
         const { data, error } = await supabase.rpc("blog_top_pages", {
            from_day: fromDay,
            to_day: toDay,
            max_rows: BLOG_TOP_ROWS,
         });
         if (error) {
            throw error;
         }
         return z.array(BlogTopPageSchema).parse(data);
      },
   });
}

export function useBlogTopReferrers(
   userId: string,
   { fromDay, toDay }: BlogStatsRange,
): UseQueryResult<Array<BlogTopReferrer>> {
   return useQuery({
      queryKey: ["blogTopReferrers", userId, fromDay, toDay],
      placeholderData: keepPreviousData,
      queryFn: async () => {
         const { data, error } = await supabase.rpc("blog_top_referrers", {
            from_day: fromDay,
            to_day: toDay,
            max_rows: BLOG_TOP_ROWS,
         });
         if (error) {
            throw error;
         }
         return z.array(BlogTopReferrerSchema).parse(data);
      },
   });
}
