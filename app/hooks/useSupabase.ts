import { useQuery, type UseQueryResult } from "@tanstack/react-query";
import { supabase } from "../supabaseClient";
import type { Name, Vote } from "~/model/types";
import { NameSchema, VoteSchema } from "../model/types";

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
