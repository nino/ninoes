import { z } from "zod";

export type Enum<T> = T[keyof T];

export const VOTE_TYPE = {
  UP: "up",
  DOWN: "down",
  BAN: "ban",
} as const;
export type VoteType = Enum<typeof VOTE_TYPE>;

export const NameSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1),
  created_at: z.coerce.date(),
});
export type Name = z.infer<typeof NameSchema>;

export const VoteSchema = z.object({
  id: z.string().uuid(),
  name_id: z.string().uuid(),
  user_id: z.string().uuid(),
  created_at: z.coerce.date(),
  vote_type: z.nativeEnum(VOTE_TYPE),
});
export type Vote = z.infer<typeof VoteSchema>;
