import {
  useQuery,
  useMutation,
  type UseQueryResult,
} from "@tanstack/react-query";
import { supabase } from "../supabaseClient";
import type { Name, User, VoteWithExtras, VoteType } from "~/model/types";
import { NameSchema, UserSchema, VoteWithExtrasSchema } from "../model/types";

export function useNames(): UseQueryResult<Name[]> {
  return useQuery({
    queryKey: ["names"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("Names")
        .select("*")
        .limit(2000);

      if (error) {
        throw error;
      }

      return data.map((name) => NameSchema.parse(name));
    },
  });
}

export function useVotes(): UseQueryResult<VoteWithExtras[]> {
  return useQuery({
    queryKey: ["votes"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("Votes")
        .select(`*, name:Names!name_id(name), user:Users!user_id(name)`)
        .limit(2000)
        .returns<VoteWithExtras[]>();

      if (error) {
        throw error;
      }

      return data.map((vote) => VoteWithExtrasSchema.parse(vote));
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
};

export type NameScore = {
  id: string;
  name: string;
  created_at: Date;
  score: number;
  upvotes: number;
  downvotes: number;
};

export function useNameScores(): UseQueryResult<NameScore[]> {
  return useQuery({
    queryKey: ["nameScores"],
    queryFn: async () => {
      const { data, error } = await supabase
        .rpc("get_leaderboard")
        .returns<NameScoreRPCResponse[]>();

      if (error) {
        throw error;
      }

      return data.map((score) => ({
        ...score,
        created_at: new Date(score.created_at),
      }));
    },
  });
}
