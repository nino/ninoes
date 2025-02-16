import {
  useQuery,
  useMutation,
  type UseQueryResult,
} from "@tanstack/react-query";
import { supabase } from "../supabaseClient";
import type { Name, User, VoteWithExtras, VoteType } from "~/model/types";
import { NameSchema, UserSchema, VoteWithExtrasSchema } from "../model/types";

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
}): UseQueryResult<Name[]> {
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
  data: VoteWithExtras[];
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
        .returns<VoteWithExtras[]>();

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

export function useRandomNames(): UseQueryResult<Name[]> {
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
  data: NameScore[];
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
        .returns<NameScoreRPCResponse[]>();

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
