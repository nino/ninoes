import { describe, expect, it } from "vitest";
import {
  VoteType,
  NameSchema,
  VoteSchema,
  VoteWithExtrasSchema,
  UserSchema,
  TeamSchema,
  TeamMemberShipSchema,
  TeamMembershipWithTeamSchema,
  TeamEloSchema,
  TeamEloWithNameSchema,
} from "./types";

describe("types", () => {
  describe("VoteType", () => {
    it("should have UP constant", () => {
      expect(VoteType.UP).toBe("up");
    });

    it("should have DOWN constant", () => {
      expect(VoteType.DOWN).toBe("down");
    });

    it("should have BAN constant", () => {
      expect(VoteType.BAN).toBe("ban");
    });
  });

  describe("NameSchema", () => {
    it("should validate a valid name object", () => {
      const validName = {
        id: "123e4567-e89b-12d3-a456-426614174000",
        name: "Test Name",
        created_at: new Date(),
      };

      const result = NameSchema.safeParse(validName);
      expect(result.success).toBe(true);
    });

    it("should coerce string date to Date object", () => {
      const nameWithStringDate = {
        id: "123e4567-e89b-12d3-a456-426614174000",
        name: "Test Name",
        created_at: "2024-01-01T00:00:00.000Z",
      };

      const result = NameSchema.safeParse(nameWithStringDate);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.created_at).toBeInstanceOf(Date);
      }
    });

    it("should reject invalid UUID", () => {
      const invalidName = {
        id: "invalid-uuid",
        name: "Test Name",
        created_at: new Date(),
      };

      const result = NameSchema.safeParse(invalidName);
      expect(result.success).toBe(false);
    });

    it("should reject empty name", () => {
      const invalidName = {
        id: "123e4567-e89b-12d3-a456-426614174000",
        name: "",
        created_at: new Date(),
      };

      const result = NameSchema.safeParse(invalidName);
      expect(result.success).toBe(false);
    });

    it("should reject missing fields", () => {
      const result = NameSchema.safeParse({});
      expect(result.success).toBe(false);
    });
  });

  describe("VoteSchema", () => {
    it("should validate a valid vote object", () => {
      const validVote = {
        id: "123e4567-e89b-12d3-a456-426614174000",
        name_id: "123e4567-e89b-12d3-a456-426614174001",
        user_id: "123e4567-e89b-12d3-a456-426614174002",
        created_at: new Date(),
        vote_type: VoteType.UP,
      };

      const result = VoteSchema.safeParse(validVote);
      expect(result.success).toBe(true);
    });

    it("should accept all valid vote types", () => {
      const baseVote = {
        id: "123e4567-e89b-12d3-a456-426614174000",
        name_id: "123e4567-e89b-12d3-a456-426614174001",
        user_id: "123e4567-e89b-12d3-a456-426614174002",
        created_at: new Date(),
      };

      expect(VoteSchema.safeParse({ ...baseVote, vote_type: "up" }).success).toBe(true);
      expect(VoteSchema.safeParse({ ...baseVote, vote_type: "down" }).success).toBe(true);
      expect(VoteSchema.safeParse({ ...baseVote, vote_type: "ban" }).success).toBe(true);
    });

    it("should reject invalid vote type", () => {
      const invalidVote = {
        id: "123e4567-e89b-12d3-a456-426614174000",
        name_id: "123e4567-e89b-12d3-a456-426614174001",
        user_id: "123e4567-e89b-12d3-a456-426614174002",
        created_at: new Date(),
        vote_type: "invalid",
      };

      const result = VoteSchema.safeParse(invalidVote);
      expect(result.success).toBe(false);
    });
  });

  describe("VoteWithExtrasSchema", () => {
    it("should validate vote with name and user extras", () => {
      const validVoteWithExtras = {
        id: "123e4567-e89b-12d3-a456-426614174000",
        name_id: "123e4567-e89b-12d3-a456-426614174001",
        user_id: "123e4567-e89b-12d3-a456-426614174002",
        created_at: new Date(),
        vote_type: VoteType.UP,
        name: { name: "Test Name" },
        user: { name: "Test User" },
      };

      const result = VoteWithExtrasSchema.safeParse(validVoteWithExtras);
      expect(result.success).toBe(true);
    });

    it("should reject empty name in extras", () => {
      const invalidVote = {
        id: "123e4567-e89b-12d3-a456-426614174000",
        name_id: "123e4567-e89b-12d3-a456-426614174001",
        user_id: "123e4567-e89b-12d3-a456-426614174002",
        created_at: new Date(),
        vote_type: VoteType.UP,
        name: { name: "" },
        user: { name: "Test User" },
      };

      const result = VoteWithExtrasSchema.safeParse(invalidVote);
      expect(result.success).toBe(false);
    });
  });

  describe("UserSchema", () => {
    it("should validate a valid user object", () => {
      const validUser = {
        id: "123e4567-e89b-12d3-a456-426614174000",
        name: "Test User",
        created_at: new Date(),
      };

      const result = UserSchema.safeParse(validUser);
      expect(result.success).toBe(true);
    });

    it("should reject empty user name", () => {
      const invalidUser = {
        id: "123e4567-e89b-12d3-a456-426614174000",
        name: "",
        created_at: new Date(),
      };

      const result = UserSchema.safeParse(invalidUser);
      expect(result.success).toBe(false);
    });
  });

  describe("TeamSchema", () => {
    it("should validate a valid team object", () => {
      const validTeam = {
        id: "team-123",
        name: "Test Team",
        creator: "123e4567-e89b-12d3-a456-426614174000",
        created_at: new Date(),
      };

      const result = TeamSchema.safeParse(validTeam);
      expect(result.success).toBe(true);
    });

    it("should accept string id (not UUID)", () => {
      const team = {
        id: "any-string-id",
        name: "Test Team",
        creator: "123e4567-e89b-12d3-a456-426614174000",
        created_at: new Date(),
      };

      const result = TeamSchema.safeParse(team);
      expect(result.success).toBe(true);
    });

    it("should reject empty team name", () => {
      const invalidTeam = {
        id: "team-123",
        name: "",
        creator: "123e4567-e89b-12d3-a456-426614174000",
        created_at: new Date(),
      };

      const result = TeamSchema.safeParse(invalidTeam);
      expect(result.success).toBe(false);
    });
  });

  describe("TeamMemberShipSchema", () => {
    it("should validate a valid membership object", () => {
      const validMembership = {
        id: "membership-123",
        team_id: "team-123",
        user_id: "user-123",
      };

      const result = TeamMemberShipSchema.safeParse(validMembership);
      expect(result.success).toBe(true);
    });

    it("should accept string ids", () => {
      const membership = {
        id: "any-id",
        team_id: "any-team",
        user_id: "any-user",
      };

      const result = TeamMemberShipSchema.safeParse(membership);
      expect(result.success).toBe(true);
    });
  });

  describe("TeamMembershipWithTeamSchema", () => {
    it("should validate membership with team object", () => {
      const validMembershipWithTeam = {
        id: "membership-123",
        team_id: "team-123",
        user_id: "user-123",
        team: {
          id: "team-123",
          name: "Test Team",
          creator: "123e4567-e89b-12d3-a456-426614174000",
          created_at: new Date(),
        },
      };

      const result = TeamMembershipWithTeamSchema.safeParse(validMembershipWithTeam);
      expect(result.success).toBe(true);
    });

    it("should reject invalid team object", () => {
      const invalidMembership = {
        id: "membership-123",
        team_id: "team-123",
        user_id: "user-123",
        team: {
          id: "team-123",
          name: "", // Empty name
          creator: "123e4567-e89b-12d3-a456-426614174000",
          created_at: new Date(),
        },
      };

      const result = TeamMembershipWithTeamSchema.safeParse(invalidMembership);
      expect(result.success).toBe(false);
    });
  });

  describe("TeamEloSchema", () => {
    it("should validate a valid team elo object", () => {
      const validTeamElo = {
        name_id: "name-123",
        elo: 1200,
        team_id: "team-123",
      };

      const result = TeamEloSchema.safeParse(validTeamElo);
      expect(result.success).toBe(true);
    });

    it("should accept different elo values", () => {
      const eloValues = [0, 800, 1200, 2000, 3000];

      eloValues.forEach((elo) => {
        const teamElo = {
          name_id: "name-123",
          elo,
          team_id: "team-123",
        };
        expect(TeamEloSchema.safeParse(teamElo).success).toBe(true);
      });
    });

    it("should reject non-number elo", () => {
      const invalidTeamElo = {
        name_id: "name-123",
        elo: "1200",
        team_id: "team-123",
      };

      const result = TeamEloSchema.safeParse(invalidTeamElo);
      expect(result.success).toBe(false);
    });
  });

  describe("TeamEloWithNameSchema", () => {
    it("should validate team elo with name object", () => {
      const validTeamEloWithName = {
        name_id: "name-123",
        elo: 1200,
        team_id: "team-123",
        name: {
          id: "123e4567-e89b-12d3-a456-426614174000",
          name: "Test Name",
          created_at: new Date(),
        },
      };

      const result = TeamEloWithNameSchema.safeParse(validTeamEloWithName);
      expect(result.success).toBe(true);
    });

    it("should reject invalid name object", () => {
      const invalidTeamElo = {
        name_id: "name-123",
        elo: 1200,
        team_id: "team-123",
        name: {
          id: "invalid-uuid",
          name: "Test Name",
          created_at: new Date(),
        },
      };

      const result = TeamEloWithNameSchema.safeParse(invalidTeamElo);
      expect(result.success).toBe(false);
    });
  });
});
