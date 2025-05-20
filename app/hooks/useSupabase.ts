import {
  useQuery,
  useMutation,
  type UseQueryResult,
  useQueryClient,
  type UseMutationResult,
} from "@tanstack/react-query";
import { supabase } from "../supabaseClient";
import type {
  Name,
  User,
  VoteWithExtras,
  VoteType,
  Team,
  TeamMembershipWithTeam,
  TeamElo,
  TeamEloWithName,
} from "~/model/types";
import {
  NameSchema,
  UserSchema,
  VoteWithExtrasSchema,
  TeamSchema,
  TeamMembershipWithTeamSchema,
  TeamEloSchema,
} from "../model/types";
import { useSession } from "./useSession";
import { z } from "zod";
import { App } from "antd";
import { BASE_ELO, updateEloRatings } from "~/utils/elo";

export function useNames({
  page,
  pageSize,
  orderBy,
  orderDirection,
}: {
  page: number;
  pageSize: number;
  orderBy: string;
  orderDirection: "asc" | "desc";
}): UseQueryResult<Array<Name>> {
  return useQuery({
    queryKey: ["names", page, pageSize, orderBy],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("Names")
        .select("*")
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
  voteTypes?: Array<VoteType>;
}): UseQueryResult<{
  data: Array<VoteWithExtras>;
  total: number | null;
}> {
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
  return useQuery({
    queryKey: ["randomNames"],
    queryFn: async () => {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      const { data, error } = await supabase.rpc("get_two_names");

      const result = z.array(NameSchema).parse(data);

      if (error != null) {
        throw error;
      }

      return result;
    },
  });
}

type CreateVoteNewParams = {
  winnerId: string;
  loserId: string;
  teamId?: string;
};

export function useCreateVoteNew(): UseMutationResult<
  void,
  Error,
  CreateVoteNewParams
> {
  const { session, supabase: authSupabase } = useSession();

  return useMutation({
    mutationFn: async ({ winnerId, loserId, teamId }) => {
      if (!session) throw new Error("no auth");
      const { error } = await authSupabase.rpc("vote", {
        p_winner_id: winnerId,
        p_loser_id: loserId,
        p_team_id: teamId,
      });
      if (error) throw error;
    },
  });
}

type CreateVoteParams = {
  nameId: string;
  voteType: VoteType;
};

export function useCreateVote(): UseMutationResult<
  void,
  Error,
  CreateVoteParams
> {
  const queryClient = useQueryClient();
  const { session, supabase: authSupabase } = useSession();

  return useMutation({
    mutationFn: async ({ nameId, voteType }: CreateVoteParams) => {
      if (!session) {
        throw new Error("User not authenticated");
      }

      const { error } = await authSupabase.from("Votes").insert({
        name_id: nameId,
        user_id: session.user.id,
        vote_type: voteType,
      });

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
}: {
  limit?: number;
  offset?: number;
  orderBy?:
    | "score"
    | "name"
    | "created_at"
    | "total_votes"
    | "upvotes"
    | "downvotes"
    | "controversial";
  orderDirection?: "asc" | "desc";
} = {}): UseQueryResult<{
  data: Array<NameScore>;
  total: number;
}> {
  return useQuery({
    queryKey: ["nameScores", limit, offset, orderBy, orderDirection],
    queryFn: async () => {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      const { data, error } = await supabase.rpc("get_leaderboard", {
        p_limit: limit,
        p_offset: offset,
        p_order_by: orderBy,
        p_order_direction: orderDirection,
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
}): UseQueryResult<{
  data: Array<Team>;
  total: number;
}> {
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

      return {
        data: data.map((team) => TeamSchema.parse(team)),
        total: count ?? 0,
      };
    },
  });
}

type CreateTeamParams = {
  name: string;
  creator: string;
};

export function useCreateTeam(): UseMutationResult<
  void,
  Error,
  CreateTeamParams
> {
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
}): UseQueryResult<{
  data: Array<TeamMembershipWithTeam>;
  total: number;
}> {
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

export function useJoinTeam(): UseMutationResult<
  void,
  Error,
  { teamId: string }
> {
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
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["teamMemberships"] }),
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
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["teamMemberships"] }),
  });
}

export function useDeleteVote(): UseMutationResult<void, Error, string> {
  const queryClient = useQueryClient();
  const { message } = App.useApp();

  return useMutation({
    mutationFn: async (voteId: string) => {
      const { error } = await supabase.from("Votes").delete().eq("id", voteId);

      if (error) {
        throw error;
      }
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["votes"] });
      message.success("Vote deleted successfully");
    },
    onError: (error) => {
      console.error(error);
      message.error("Failed to delete vote");
    },
  });
}

// export function useTeamElo(
//   teamId: string | null,
//   nameId: string | null
// ): UseQueryResult<TeamElo | null> {
//   return useQuery({
//     queryKey: ["teamElo", teamId, nameId],
//     queryFn: () => null,
//   });
// }

type EloFightParams = { win: string; lose: string; teamId: string };

export function useEloFight(): UseMutationResult<void, Error, EloFightParams> {
  const queryClient = useQueryClient();
  const { session, supabase: authSupabase } = useSession();

  return useMutation({
    mutationFn: async ({ win, lose, teamId }: EloFightParams) => {
      if (!session) {
        throw new Error("User not authenticated");
      }

      const { data, error: fetchError } = await authSupabase
        .from("team_elo")
        .select("*")
        .eq("team_id", teamId)
        .in("name_id", [win, lose]);

      console.log({ data });

      if (fetchError) {
        throw fetchError;
      }

      const winnerElo = TeamEloSchema.parse(
        data.find((item: TeamElo) => item.name_id === win) ?? {
          name_id: win,
          elo: BASE_ELO,
          team_id: teamId,
        },
      );
      const loserElo = TeamEloSchema.parse(
        data.find((item: TeamElo) => item.name_id === win) ?? {
          name_id: lose,
          elo: BASE_ELO,
          team_id: teamId,
        },
      );
      console.log({ win, lose, winnerElo, loserElo });

      const [winnerNewElo, loserNewElo] = updateEloRatings(
        winnerElo.elo,
        loserElo.elo,
      );

      console.log({ winnerNewElo, loserNewElo });

      await authSupabase.from("team_elo").upsert([
        { ...winnerElo, elo: winnerNewElo },
        { ...loserElo, elo: loserNewElo },
      ]);
    },
    onSuccess: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: ["votes"] }),
        queryClient.invalidateQueries({ queryKey: ["nameScores"] }),
        queryClient.invalidateQueries({ queryKey: ["teamElo"] }),
      ]),
  });
}

export function useEloLeaderboard({
  teamId = null,
  page = 0,
  pageSize = 10,
  orderBy = "elo",
  orderDirection = "desc",
}: {
  teamId?: string | null;
  page?: number;
  pageSize?: number;
  orderBy?: "elo" | "name";
  orderDirection?: "asc" | "desc";
} = {}): UseQueryResult<{
  data: Array<TeamEloWithName>;
  total: number | null;
} | null> {
  const { session, supabase: authSupabase } = useSession();

  return useQuery({
    queryKey: [
      "useEloLeaderboard",
      teamId,
      page,
      pageSize,
      orderBy,
      orderDirection,
    ],
    queryFn: async () => {
      if (teamId == null) return null;
      if (!session) {
        throw new Error("User not authenticated");
      }

      const {
        data,
        error: fetchError,
        count,
      } = await authSupabase
        .from("team_elo")
        .select("*, name:Names(*)", { count: "exact" })
        .eq("team_id", teamId)
        .range(page * pageSize, (page + 1) * pageSize - 1)
        .order(orderBy, { ascending: orderDirection === "asc" });
      if (fetchError) throw fetchError;
      console.log({ data, count });
      return { data, total: count };
    },
  });
}
