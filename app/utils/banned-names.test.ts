import { describe, expect, it } from "vitest";
import type { VoteWithExtras } from "~/model/types";
import { groupBans } from "./banned-names";

function ban(nameId: string, name: string, user: string, at: string): VoteWithExtras {
   return {
      id: crypto.randomUUID(),
      name_id: nameId,
      user_id: crypto.randomUUID(),
      created_at: new Date(at),
      vote_type: "ban",
      name: { name },
      user: { name: user },
   };
}

describe("groupBans", () => {
   it("returns nothing for no votes", () => {
      expect(groupBans([])).toEqual([]);
   });

   it("collapses bans of the same name and lists each user once", () => {
      const rows = groupBans([
         ban("a", "Kevin", "Nino", "2026-03-01"),
         ban("a", "Kevin", "Sam", "2026-01-01"),
         ban("a", "Kevin", "Nino", "2026-02-01"),
      ]);
      expect(rows).toHaveLength(1);
      expect(rows[0].bannedBy).toEqual(["Sam", "Nino"]);
      expect(rows[0].lastBannedAt).toEqual(new Date("2026-03-01"));
   });

   it("puts the most recently banned name first", () => {
      const rows = groupBans([
         ban("a", "Kevin", "Nino", "2026-01-01"),
         ban("b", "Chantal", "Nino", "2026-05-01"),
      ]);
      expect(rows.map((row) => row.name)).toEqual(["Chantal", "Kevin"]);
   });
});
