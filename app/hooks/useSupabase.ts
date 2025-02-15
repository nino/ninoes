import { useQuery, type UseQueryResult } from "@tanstack/react-query";
import { supabase } from "../supabaseClient";
import type { Name, Vote, User, VoteWithExtras } from "~/model/types";
import {
  NameSchema,
  VoteSchema,
  UserSchema,
  VoteWithExtrasSchema,
} from "../model/types";

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

export function useVotes(): UseQueryResult<VoteWithExtras[]> {
  return useQuery({
    queryKey: ["votes"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("Votes")
        .select(`*, name:Names!name_id(name), user:Users!user_id(name)`)
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
