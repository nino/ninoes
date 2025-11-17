import { describe, expect, it } from "vitest";
import { BASE_ELO, updateEloRatings } from "./elo";

describe("elo", () => {
  describe("BASE_ELO", () => {
    it("should have a default starting ELO of 1200", () => {
      expect(BASE_ELO).toBe(1200);
    });
  });

  describe("updateEloRatings", () => {
    it("should return new ratings when winner has higher rating", () => {
      const winner = 1400;
      const loser = 1200;
      const [newWinnerElo, newLoserElo] = updateEloRatings(winner, loser);

      // Winner should gain fewer points when favored
      expect(newWinnerElo).toBeGreaterThan(winner);
      expect(newWinnerElo).toBeLessThan(winner + 32);

      // Loser should lose more points when they're the underdog
      expect(newLoserElo).toBeLessThan(loser);
      expect(newLoserElo).toBeGreaterThan(loser - 32);
    });

    it("should return new ratings when winner has lower rating (upset)", () => {
      const winner = 1200;
      const loser = 1400;
      const [newWinnerElo, newLoserElo] = updateEloRatings(winner, loser);

      // Winner should gain more points for an upset victory
      expect(newWinnerElo).toBeGreaterThan(winner);
      expect(newWinnerElo - winner).toBeGreaterThan(16); // Should gain significant points

      // Loser should lose more points when they were favored
      expect(newLoserElo).toBeLessThan(loser);
      expect(loser - newLoserElo).toBeGreaterThan(16); // Should lose significant points
    });

    it("should return equal rating changes for equally rated players", () => {
      const winner = 1200;
      const loser = 1200;
      const [newWinnerElo, newLoserElo] = updateEloRatings(winner, loser);

      // With equal ratings, winner gains 16 and loser loses 16 (K_FACTOR/2)
      expect(newWinnerElo).toBe(1216);
      expect(newLoserElo).toBe(1184);

      // Rating changes should be symmetric
      expect(newWinnerElo - winner).toBe(-(newLoserElo - loser));
    });

    it("should round the results to integers", () => {
      const winner = 1201;
      const loser = 1199;
      const [newWinnerElo, newLoserElo] = updateEloRatings(winner, loser);

      expect(Number.isInteger(newWinnerElo)).toBe(true);
      expect(Number.isInteger(newLoserElo)).toBe(true);
    });

    it("should handle large rating differences", () => {
      const winner = 1800;
      const loser = 800;
      const [newWinnerElo, newLoserElo] = updateEloRatings(winner, loser);

      // Winner should gain almost nothing when heavily favored
      expect(newWinnerElo - winner).toBeLessThan(1);
      expect(newWinnerElo).toBeGreaterThanOrEqual(winner);

      // Loser should lose almost nothing when heavily outmatched
      expect(loser - newLoserElo).toBeLessThan(1);
      expect(newLoserElo).toBeLessThanOrEqual(loser);
    });

    it("should handle very low ratings", () => {
      const winner = 100;
      const loser = 50;
      const [newWinnerElo, newLoserElo] = updateEloRatings(winner, loser);

      expect(newWinnerElo).toBeGreaterThan(winner);
      expect(newLoserElo).toBeLessThan(loser);
      expect(Number.isInteger(newWinnerElo)).toBe(true);
      expect(Number.isInteger(newLoserElo)).toBe(true);
    });

    it("should handle very high ratings", () => {
      const winner = 2800;
      const loser = 2750;
      const [newWinnerElo, newLoserElo] = updateEloRatings(winner, loser);

      expect(newWinnerElo).toBeGreaterThan(winner);
      expect(newLoserElo).toBeLessThan(loser);
      expect(Number.isInteger(newWinnerElo)).toBe(true);
      expect(Number.isInteger(newLoserElo)).toBe(true);
    });

    it("should maintain rating conservation (total change should balance)", () => {
      const winner = 1300;
      const loser = 1100;
      const [newWinnerElo, newLoserElo] = updateEloRatings(winner, loser);

      const winnerGain = newWinnerElo - winner;
      const loserLoss = loser - newLoserElo;

      // The system should be approximately zero-sum (with rounding)
      expect(Math.abs(winnerGain - loserLoss)).toBeLessThanOrEqual(1);
    });

    it("should produce consistent results with multiple calls", () => {
      const winner = 1500;
      const loser = 1450;

      const [result1a, result1b] = updateEloRatings(winner, loser);
      const [result2a, result2b] = updateEloRatings(winner, loser);

      expect(result1a).toBe(result2a);
      expect(result1b).toBe(result2b);
    });

    it("should handle edge case of zero ratings", () => {
      const winner = 0;
      const loser = 0;
      const [newWinnerElo, newLoserElo] = updateEloRatings(winner, loser);

      // Should still calculate valid ratings even from 0
      expect(newWinnerElo).toBe(16);
      expect(newLoserElo).toBe(-16);
    });

    it("should handle negative ratings", () => {
      const winner = -100;
      const loser = -200;
      const [newWinnerElo, newLoserElo] = updateEloRatings(winner, loser);

      expect(newWinnerElo).toBeGreaterThan(winner);
      expect(newLoserElo).toBeLessThan(loser);
      expect(Number.isInteger(newWinnerElo)).toBe(true);
      expect(Number.isInteger(newLoserElo)).toBe(true);
    });
  });
});
