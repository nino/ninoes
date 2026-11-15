import { KATHERINE_USER_ID, NINO_USER_ID } from "./users";

// Nino and Katherine. A ban takes a name out of the vote for everyone, so only
// they can ban. The database enforces the same list; see
// app/supabase/migrations/2026-11-05-owner-only-bans.sql.
export const BAN_USER_IDS: ReadonlyArray<string> = [NINO_USER_ID, KATHERINE_USER_ID];

export function canBanNames(userId: string): boolean {
   return BAN_USER_IDS.includes(userId);
}
