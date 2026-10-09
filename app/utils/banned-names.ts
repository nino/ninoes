import type { VoteWithExtras } from "~/model/types";

export interface BannedName {
   nameId: string;
   name: string;
   /** Users who banned the name, earliest first, without repeats. */
   bannedBy: Array<string>;
   lastBannedAt: Date;
}

/** Collapses ban votes into one row per name. */
export function groupBans(votes: Array<VoteWithExtras>): Array<BannedName> {
   const byName = new Map<string, BannedName>();
   const sorted = [...votes].sort(
      (a, b) => a.created_at.getTime() - b.created_at.getTime(),
   );
   for (const vote of sorted) {
      const entry = byName.get(vote.name_id);
      if (entry == null) {
         byName.set(vote.name_id, {
            nameId: vote.name_id,
            name: vote.name.name,
            bannedBy: [vote.user.name],
            lastBannedAt: vote.created_at,
         });
         continue;
      }
      if (!entry.bannedBy.includes(vote.user.name)) {
         entry.bannedBy.push(vote.user.name);
      }
      entry.lastBannedAt = vote.created_at;
   }
   return [...byName.values()].sort(
      (a, b) => b.lastBannedAt.getTime() - a.lastBannedAt.getTime(),
   );
}
