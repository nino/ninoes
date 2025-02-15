import { useQuery, type UseQueryResult } from "@tanstack/react-query";
import { supabase } from "../supabaseClient";
import type { Name, Vote, User } from "~/model/types";
import { NameSchema, VoteSchema, UserSchema } from "../model/types";

export function useNames(): UseQueryResult<Name[]> {
  return useQuery({
    queryKey: ["names"],
    queryFn: async () => {
      const { data, error } = await supabase.from("Names").select("*");

      if (error) {
        throw error;
      }

      return data.map((name) => NameSchema.parse(name));
    },
  });
}

export function useVotes(): UseQueryResult<Vote[]> {
  return useQuery({
    queryKey: ["votes"],
    queryFn: async () => {
      const { data, error } = await supabase.from("Votes").select("*");

      if (error) {
        throw error;
      }

      return data.map((vote) => VoteSchema.parse(vote));
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
        .eq("user_id", userId);

      if (error) {
        throw error;
      }

      return UserSchema.parse(data[0]);
    },
  });
}
