// Nino and Katherine. A ban takes a name out of the vote for everyone, so only
// they can ban. The database enforces the same list; see
// app/supabase/migrations/2026-11-05-owner-only-bans.sql.
export const BAN_USER_IDS: ReadonlyArray<string> = [
   "ac3d5729-eb82-4983-a532-03dfa7433e11",
   "f7d12942-f6ad-4206-a167-01b9cbd8a01d",
];

export function canBanNames(userId: string): boolean {
   return BAN_USER_IDS.includes(userId);
}
