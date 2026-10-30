import { z } from "zod";

export type Enum<T> = T[keyof T];

export const VoteType = { UP: "up", DOWN: "down", BAN: "ban" } as const;

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
   name: z.object({ name: z.string().min(1) }),
   user: z.object({ name: z.string().min(1) }),
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

// A name's Elo rating on one leaderboard: a user's own, or a team's. Derived
// from votes by database triggers; the app only reads them.
export const EloScoreSchema = z.object({
   name_id: z.uuid(),
   elo: z.number(),
   wins: z.number().int().nonnegative(),
   losses: z.number().int().nonnegative(),
});
export type EloScore = z.infer<typeof EloScoreSchema>;

export const EloScoreWithNameSchema = EloScoreSchema.extend({ name: NameSchema });
export type EloScoreWithName = z.infer<typeof EloScoreWithNameSchema>;

/** Whose votes an Elo leaderboard is built from. */
export type EloScope =
   | { kind: "team"; teamId: string }
   | { kind: "user"; userId: string };

// Rows from my_elo_leaderboards(): the signed-in user (team null), each of their
// teams (user null), and each member of each team (both set).
export const EloLeaderboardRowSchema = z.object({
   team_id: z.uuid().nullable(),
   team_name: z.string().nullable(),
   user_id: z.uuid().nullable(),
   user_name: z.string().nullable(),
});
export type EloLeaderboardRow = z.infer<typeof EloLeaderboardRowSchema>;

export const ContributionSchema = z.object({
   id: z.uuid(),
   created_at: z.coerce.date(),
   name: z.string().min(1),
   amount: z.coerce.number().nullable(),
   // true: "I'll give this", the whole gift; false: chipping in.
   complete: z.boolean(),
});
export type Contribution = z.infer<typeof ContributionSchema>;

export const WishSchema = z.object({
   id: z.uuid(),
   created_at: z.coerce.date(),
   title: z.string().min(1),
   description: z.string().nullable(),
   // numeric columns arrive as numbers or strings depending on size.
   price: z.coerce.number().nullable(),
   link: z.string().nullable(),
   // Detected source language; null until the translate action has run.
   language: z.enum(["en", "de"]).nullable(),
   translated_title: z.string().nullable(),
   translated_description: z.string().nullable(),
   // Left out of the select entirely in no-spoilers mode.
   contributions: z.array(ContributionSchema).optional(),
});
export type Wish = z.infer<typeof WishSchema>;

// Rows from the blog_* report functions over analytics.page_views (see
// app/supabase/migrations/2026-10-17-blog-page-views.sql). Days are UTC dates.
// visitor_days counts a visitor once per day they visited, since the visitor
// hash only lasts a day.
export const BlogDailyViewsSchema = z.object({
   day: z.iso.date(),
   views: z.number().int().nonnegative(),
   visitors: z.number().int().nonnegative(),
});
export type BlogDailyViews = z.infer<typeof BlogDailyViewsSchema>;

export const BlogTopPageSchema = z.object({
   path: z.string(),
   views: z.number().int().nonnegative(),
   visitor_days: z.number().int().nonnegative(),
});
export type BlogTopPage = z.infer<typeof BlogTopPageSchema>;

export const BlogTopReferrerSchema = z.object({
   referrer_host: z.string(),
   views: z.number().int().nonnegative(),
   visitor_days: z.number().int().nonnegative(),
});
export type BlogTopReferrer = z.infer<typeof BlogTopReferrerSchema>;
