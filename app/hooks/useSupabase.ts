import { useQuery } from "@tanstack/react-query";
import { supabase } from "../supabaseClient";

export type Name = {
  id: string;
  created_at: string;
  name: string;
};

export type Vote = {
  id: string;
  created_at: string;
  name_id: string;
  user_id: string;
};

export function useNames() {
  return useQuery({
    queryKey: ["names"],
    queryFn: async () => {
      const { data, error } = await supabase.from("Names").select("*");

      if (error) {
        throw error;
      }

      return data as Name[];
    },
  });
}

export function useVotes() {
  return useQuery({
    queryKey: ["votes"],
    queryFn: async () => {
      const { data, error } = await supabase.from("Votes").select("*");

      if (error) {
        throw error;
      }

      return data as Vote[];
    },
  });
}
