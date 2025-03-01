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

export const VoteWithExtrasSchema = VoteSchema.extend({
  name: z.object({
    name: z.string().min(1),
  }),
  user: z.object({
    name: z.string().min(1),
  }),
});
export type VoteWithExtras = z.infer<typeof VoteWithExtrasSchema>;

export const UserSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1),
  created_at: z.coerce.date(),
});
export type User = z.infer<typeof UserSchema>;

export const TeamSchema = z.object({
  id: z.string(),
  name: z.string().min(1),
  creator: z.string().uuid(),
  created_at: z.coerce.date(),
});
export type Team = z.infer<typeof TeamSchema>;

export const TeamMemberShipSchema = z.object({
  id: z.string(),
  team_id: z.string(),
  user_id: z.string(),
});
export type TeamMemberShip = z.infer<typeof TeamMemberShipSchema>;

export const TeamMembershipWithTeamSchema = TeamMemberShipSchema.extend({
  team: TeamSchema,
});
export type TeamMembershipWithTeam = z.infer<
  typeof TeamMembershipWithTeamSchema
>;
