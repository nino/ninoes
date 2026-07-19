import { z } from "zod";

export type Enum<T> = T[keyof T];

export const VoteType = {
   UP: "up",
   DOWN: "down",
   BAN: "ban",
} as const;

export const NameGender = {
   ALWAYS_MALE: "always_male",
   MOSTLY_MALE: "mostly_male",
   NEUTRAL: "neutral",
   MOSTLY_FEMALE: "mostly_female",
   ALWAYS_FEMALE: "always_female",
} as const;

// Nullish because the column is being rolled out and backfilled incrementally.
export const NameSchema = z.object({
   id: z.uuid(),
   name: z.string().min(1),
   created_at: z.coerce.date(),
   gender: z.enum(NameGender).nullish(),
});
export type Name = z.infer<typeof NameSchema>;

export const VoteSchema = z.object({
   id: z.uuid(),
   name_id: z.uuid(),
   user_id: z.uuid(),
   created_at: z.coerce.date(),
   vote_type: z.enum(VoteType),
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
   id: z.uuid(),
   name: z.string().min(1),
   created_at: z.coerce.date(),
});
export type User = z.infer<typeof UserSchema>;

export const TeamSchema = z.object({
   id: z.string(),
   name: z.string().min(1),
   creator: z.uuid(),
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
export type TeamMembershipWithTeam = z.infer<typeof TeamMembershipWithTeamSchema>;

export const TeamEloSchema = z.object({
   name_id: z.string(),
   elo: z.number(),
   team_id: z.string(),
});
export type TeamElo = z.infer<typeof TeamEloSchema>;

export const TeamEloWithNameSchema = TeamEloSchema.extend({ name: NameSchema });
export type TeamEloWithName = z.infer<typeof TeamEloWithNameSchema>;
