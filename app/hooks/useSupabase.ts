import {
  useQuery,
  useMutation,
  type UseQueryResult,
  useQueryClient,
} from "@tanstack/react-query";
import { supabase } from "../supabaseClient";
import type {
  Name,
  User,
  VoteWithExtras,
  VoteType,
  Team,
  TeamMembershipWithTeam,
} from "~/model/types";
import {
  NameSchema,
  UserSchema,
  VoteWithExtrasSchema,
  TeamSchema,
  TeamMembershipWithTeamSchema,
} from "../model/types";
import { useSession } from "./useSession";

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
}: {
  page: number;
  pageSize: number;
  orderBy: string;
  orderDirection: "asc" | "desc";
}): UseQueryResult<{
  data: Array<VoteWithExtras>;
  total: number;
}> {
  return useQuery({
    queryKey: ["votes", page, pageSize, orderBy],
    queryFn: async () => {
      const { data, error, count } = await supabase
        .from("Votes")
        .select(`*, name:Names!name_id(name), user:Users!user_id(name)`, {
          count: "exact",
        })
        .range(page * pageSize, (page + 1) * pageSize - 1)
        .order(orderBy === "undefined" ? "created_at" : orderBy, {
          ascending: orderDirection === "asc",
        })
        .returns<Array<VoteWithExtras>>();

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
      const { data, error } = await supabase.rpc("get_two_names");

      if (error) {
        throw error;
      }

      return data.map((name: unknown) => NameSchema.parse(name));
    },
  });
}

type CreateVoteParams = {
  nameId: string;
  userId: string;
  voteType: VoteType;
};

export function useCreateVote() {
  return useMutation({
    mutationFn: async ({ nameId, userId, voteType }: CreateVoteParams) => {
      const { error } = await supabase.from("Votes").insert({
        name_id: nameId,
        user_id: userId,
        vote_type: voteType,
      });

      if (error) {
        throw error;
      }
    },
  });
}

type NameScoreRPCResponse = {
  id: string;
  name: string;
  created_at: string;
  score: number;
  upvotes: number;
  downvotes: number;
  controversial: number;
  total: number;
};

export type NameScore = {
  id: string;
  name: string;
  created_at: Date;
  score: number;
  upvotes: number;
  downvotes: number;
  controversial: number;
  total: number;
};

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
      const { data, error } = await supabase
        .rpc("get_leaderboard", {
          p_limit: limit,
          p_offset: offset,
          p_order_by: orderBy,
          p_order_direction: orderDirection,
        })
        .returns<Array<NameScoreRPCResponse>>();

      if (error) {
        throw error;
      }

      return {
        data: data.map((score) => ({
          ...score,
          created_at: new Date(score.created_at),
        })),
        total: data?.[0]?.total ?? 0,
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

export function useCreateTeam() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ name, creator }: CreateTeamParams) => {
      const { error } = await supabase.from("teams").insert({ name, creator });

      if (error) {
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["teams"] });
    },
  });
}

export function useDeleteTeam() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (teamId: string) => {
      const { error } = await supabase.from("teams").delete().eq("id", teamId);

      if (error) {
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["teams"] });
    },
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
          TeamMembershipWithTeamSchema.parse(membership)
        ),
        total: count ?? 0,
      };
    },
  });
}

export function useJoinTeam() {
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["teamMemberships"] });
    },
  });
}

export function useLeaveTeam() {
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["teamMemberships"] });
    },
  });
}
