import { describe, expect, it, vi, beforeEach } from "vitest";

describe("env", () => {
  beforeEach(() => {
    // Clear the module cache to test re-imports
    vi.resetModules();
  });

  it("should parse valid environment variables", async () => {
    vi.stubEnv("VITE_SUPABASE_URL", "https://test.supabase.co");
    vi.stubEnv("VITE_SUPABASE_ANON_KEY", "test-key-123");

    const { env } = await import("./env");

    expect(env.VITE_SUPABASE_URL).toBe("https://test.supabase.co");
    expect(env.VITE_SUPABASE_ANON_KEY).toBe("test-key-123");
  });

  it("should have VITE_SUPABASE_URL property", async () => {
    const { env } = await import("./env");

    expect(env).toHaveProperty("VITE_SUPABASE_URL");
  });

  it("should have VITE_SUPABASE_ANON_KEY property", async () => {
    const { env } = await import("./env");

    expect(env).toHaveProperty("VITE_SUPABASE_ANON_KEY");
  });

  it("should validate required environment variables are strings", async () => {
    vi.stubEnv("VITE_SUPABASE_URL", "https://example.supabase.co");
    vi.stubEnv("VITE_SUPABASE_ANON_KEY", "anon-key");

    const { env } = await import("./env");

    expect(typeof env.VITE_SUPABASE_URL).toBe("string");
    expect(typeof env.VITE_SUPABASE_ANON_KEY).toBe("string");
  });

  it("should use values from import.meta.env", async () => {
    // The test setup already stubs these values
    const { env } = await import("./env");

    // Should have been parsed from import.meta.env
    expect(env.VITE_SUPABASE_URL).toBeDefined();
    expect(env.VITE_SUPABASE_ANON_KEY).toBeDefined();
  });
});
