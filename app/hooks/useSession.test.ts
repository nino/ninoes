import { describe, expect, it, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { useSession } from "./useSession";
import { createBrowserClient } from "@supabase/ssr";

vi.mock("@supabase/ssr", () => ({
  createBrowserClient: vi.fn(),
}));

describe("useSession", () => {
  const mockUnsubscribe = vi.fn();
  const mockOnAuthStateChange = vi.fn(() => ({
    data: { subscription: { unsubscribe: mockUnsubscribe } },
  }));
  const mockGetSession = vi.fn();

  const mockSupabaseClient = {
    auth: {
      getSession: mockGetSession,
      onAuthStateChange: mockOnAuthStateChange,
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(createBrowserClient).mockReturnValue(mockSupabaseClient as any);
  });

  it("should initialize with loading state", () => {
    mockGetSession.mockResolvedValue({ data: { session: null }, error: null });

    const { result } = renderHook(() => useSession());

    expect(result.current.isLoading).toBe(true);
    expect(result.current.session).toBe(null);
    expect(result.current.supabase).toBeDefined();
  });

  it("should fetch session on mount", async () => {
    const mockSession = {
      user: { id: "123", email: "test@example.com" },
      access_token: "token",
    };

    mockGetSession.mockResolvedValue({
      data: { session: mockSession },
      error: null,
    });

    const { result } = renderHook(() => useSession());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.session).toEqual(mockSession);
    expect(mockGetSession).toHaveBeenCalledTimes(1);
  });

  it("should handle session error gracefully", async () => {
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const mockError = new Error("Failed to get session");

    mockGetSession.mockRejectedValue(mockError);

    const { result } = renderHook(() => useSession());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.session).toBe(null);
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      "Error getting session:",
      mockError
    );

    consoleErrorSpy.mockRestore();
  });

  it("should set up auth state change listener", () => {
    mockGetSession.mockResolvedValue({ data: { session: null }, error: null });

    renderHook(() => useSession());

    expect(mockOnAuthStateChange).toHaveBeenCalledTimes(1);
    expect(mockOnAuthStateChange).toHaveBeenCalledWith(expect.any(Function));
  });

  it("should update session when auth state changes", async () => {
    mockGetSession.mockResolvedValue({ data: { session: null }, error: null });

    const { result } = renderHook(() => useSession());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // Get the callback function passed to onAuthStateChange
    const authChangeCallback = mockOnAuthStateChange.mock.calls[0][0];

    // Simulate auth state change
    const newSession = {
      user: { id: "456", email: "new@example.com" },
      access_token: "new-token",
    };

    authChangeCallback("SIGNED_IN", newSession);

    await waitFor(() => {
      expect(result.current.session).toEqual(newSession);
    });
  });

  it("should unsubscribe on unmount", async () => {
    mockGetSession.mockResolvedValue({ data: { session: null }, error: null });

    const { unmount } = renderHook(() => useSession());

    await waitFor(() => {
      expect(mockOnAuthStateChange).toHaveBeenCalledTimes(1);
    });

    unmount();

    expect(mockUnsubscribe).toHaveBeenCalledTimes(1);
  });

  it("should create supabase client with correct env vars", () => {
    mockGetSession.mockResolvedValue({ data: { session: null }, error: null });

    renderHook(() => useSession());

    expect(createBrowserClient).toHaveBeenCalledWith(
      "https://test.supabase.co",
      "test-anon-key"
    );
  });

  it("should return memoized value", async () => {
    mockGetSession.mockResolvedValue({ data: { session: null }, error: null });

    const { result, rerender } = renderHook(() => useSession());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    const firstResult = result.current;

    rerender();

    // Should be the same object reference when values haven't changed
    expect(result.current).toBe(firstResult);
  });

  it("should handle null session", async () => {
    mockGetSession.mockResolvedValue({ data: { session: null }, error: null });

    const { result } = renderHook(() => useSession());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.session).toBe(null);
  });

  it("should set isLoading to false after auth state change", async () => {
    mockGetSession.mockResolvedValue({ data: { session: null }, error: null });

    const { result } = renderHook(() => useSession());

    const authChangeCallback = mockOnAuthStateChange.mock.calls[0][0];

    authChangeCallback("SIGNED_OUT", null);

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });
  });

  it("should only create supabase client once", () => {
    mockGetSession.mockResolvedValue({ data: { session: null }, error: null });

    const { rerender } = renderHook(() => useSession());

    expect(createBrowserClient).toHaveBeenCalledTimes(1);

    rerender();
    rerender();
    rerender();

    expect(createBrowserClient).toHaveBeenCalledTimes(1);
  });
});
