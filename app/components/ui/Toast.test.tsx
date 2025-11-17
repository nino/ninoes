import { describe, expect, it, vi, beforeEach } from "vitest";
import { renderHook } from "@testing-library/react";
import { useToast } from "./Toast";
import { toast } from "sonner";

vi.mock("sonner", () => ({
  toast: Object.assign(vi.fn(), {
    success: vi.fn(),
    error: vi.fn(),
  }),
}));

describe("useToast", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return showToast function", () => {
    const { result } = renderHook(() => useToast());
    expect(result.current.showToast).toBeDefined();
    expect(typeof result.current.showToast).toBe("function");
  });

  it("should call toast.success when type is success", () => {
    const { result } = renderHook(() => useToast());
    result.current.showToast("success", "Success message");

    expect(toast.success).toHaveBeenCalledTimes(1);
    expect(toast.success).toHaveBeenCalledWith("Success message");
  });

  it("should call toast.error when type is error", () => {
    const { result } = renderHook(() => useToast());
    result.current.showToast("error", "Error message");

    expect(toast.error).toHaveBeenCalledTimes(1);
    expect(toast.error).toHaveBeenCalledWith("Error message");
  });

  it("should call toast when type is info", () => {
    const { result } = renderHook(() => useToast());
    result.current.showToast("info", "Info message");

    expect(toast).toHaveBeenCalledTimes(1);
    expect(toast).toHaveBeenCalledWith("Info message");
  });

  it("should handle multiple toast calls", () => {
    const { result } = renderHook(() => useToast());

    result.current.showToast("success", "First message");
    result.current.showToast("error", "Second message");
    result.current.showToast("info", "Third message");

    expect(toast.success).toHaveBeenCalledTimes(1);
    expect(toast.error).toHaveBeenCalledTimes(1);
    expect(toast).toHaveBeenCalledTimes(1);
  });

  it("should handle empty messages", () => {
    const { result } = renderHook(() => useToast());

    result.current.showToast("success", "");
    expect(toast.success).toHaveBeenCalledWith("");
  });

  it("should handle long messages", () => {
    const { result } = renderHook(() => useToast());
    const longMessage = "This is a very long message ".repeat(10);

    result.current.showToast("info", longMessage);
    expect(toast).toHaveBeenCalledWith(longMessage);
  });

  it("should handle special characters in messages", () => {
    const { result } = renderHook(() => useToast());
    const specialMessage = "Message with <html> & special characters!";

    result.current.showToast("success", specialMessage);
    expect(toast.success).toHaveBeenCalledWith(specialMessage);
  });

  it("should be callable multiple times from the same hook instance", () => {
    const { result } = renderHook(() => useToast());

    result.current.showToast("success", "Message 1");
    result.current.showToast("success", "Message 2");
    result.current.showToast("success", "Message 3");

    expect(toast.success).toHaveBeenCalledTimes(3);
  });

  it("should maintain consistent behavior across re-renders", () => {
    const { result, rerender } = renderHook(() => useToast());

    result.current.showToast("success", "Before rerender");
    rerender();
    result.current.showToast("success", "After rerender");

    expect(toast.success).toHaveBeenCalledTimes(2);
  });
});
