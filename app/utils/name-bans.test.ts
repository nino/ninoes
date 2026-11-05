import { describe, expect, it } from "bun:test";
import { canBanNames } from "./name-bans";

describe("canBanNames", () => {
   it("lets Nino and Katherine ban", () => {
      expect(canBanNames("ac3d5729-eb82-4983-a532-03dfa7433e11")).toBe(true);
      expect(canBanNames("f7d12942-f6ad-4206-a167-01b9cbd8a01d")).toBe(true);
   });

   it("doesn't let anyone else ban", () => {
      expect(canBanNames("50f502df-21bc-4ac0-9f58-78e1aed75fbe")).toBe(false);
      expect(canBanNames("")).toBe(false);
   });
});
