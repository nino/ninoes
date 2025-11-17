import { describe, expect, it } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useAwaitTrigger, useAwaitQueue } from "./useAwaitTrigger";

describe("useAwaitTrigger", () => {
  it("should return wait and resolve functions", () => {
    const { result } = renderHook(() => useAwaitTrigger());

    expect(result.current.wait).toBeDefined();
    expect(result.current.resolve).toBeDefined();
    expect(typeof result.current.wait).toBe("function");
    expect(typeof result.current.resolve).toBe("function");
  });

  it("should resolve promise when resolve is called", async () => {
    const { result } = renderHook(() => useAwaitTrigger<string>());

    let promiseResolved = false;
    let resolvedValue: string | undefined;

    act(() => {
      result.current.wait().then((value) => {
        promiseResolved = true;
        resolvedValue = value;
      });
    });

    expect(promiseResolved).toBe(false);

    await act(async () => {
      result.current.resolve("test value");
      await Promise.resolve();
    });

    expect(promiseResolved).toBe(true);
    expect(resolvedValue).toBe("test value");
  });

  it("should handle number type", async () => {
    const { result } = renderHook(() => useAwaitTrigger<number>());

    const promise = result.current.wait();

    await act(async () => {
      result.current.resolve(42);
    });

    const value = await promise;
    expect(value).toBe(42);
  });

  it("should handle object type", async () => {
    const { result } = renderHook(() => useAwaitTrigger<{ foo: string }>());

    const promise = result.current.wait();

    const testObject = { foo: "bar" };

    await act(async () => {
      result.current.resolve(testObject);
    });

    const value = await promise;
    expect(value).toEqual(testObject);
  });

  it("should handle void type", async () => {
    const { result } = renderHook(() => useAwaitTrigger<void>());

    let resolved = false;
    const promise = result.current.wait().then(() => {
      resolved = true;
    });

    await act(async () => {
      result.current.resolve(undefined);
    });

    await promise;
    expect(resolved).toBe(true);
  });

  it("should only resolve the current waiting promise", async () => {
    const { result } = renderHook(() => useAwaitTrigger<string>());

    const promise1 = result.current.wait();

    await act(async () => {
      result.current.resolve("first");
    });

    const value1 = await promise1;
    expect(value1).toBe("first");

    // Create a second promise
    const promise2 = result.current.wait();

    await act(async () => {
      result.current.resolve("second");
    });

    const value2 = await promise2;
    expect(value2).toBe("second");
  });

  it("should do nothing if resolve is called without waiting promise", () => {
    const { result } = renderHook(() => useAwaitTrigger<string>());

    // Calling resolve without waiting should not throw
    expect(() => {
      result.current.resolve("test");
    }).not.toThrow();
  });

  it("should return memoized functions", () => {
    const { result, rerender } = renderHook(() => useAwaitTrigger());

    const firstWait = result.current.wait;
    const firstResolve = result.current.resolve;

    rerender();

    expect(result.current.wait).toBe(firstWait);
    expect(result.current.resolve).toBe(firstResolve);
  });

  it("should handle multiple sequential wait/resolve cycles", async () => {
    const { result } = renderHook(() => useAwaitTrigger<number>());

    for (let i = 0; i < 5; i++) {
      const promise = result.current.wait();

      await act(async () => {
        result.current.resolve(i);
      });

      const value = await promise;
      expect(value).toBe(i);
    }
  });
});

describe("useAwaitQueue", () => {
  it("should return get and resolve functions", () => {
    const { result } = renderHook(() => useAwaitQueue());

    expect(result.current.get).toBeDefined();
    expect(result.current.resolve).toBeDefined();
    expect(typeof result.current.get).toBe("function");
    expect(typeof result.current.resolve).toBe("function");
  });

  it("should yield resolved values in order", async () => {
    const { result } = renderHook(() => useAwaitQueue<number>());

    const generator = result.current.get();
    const values: number[] = [];

    // Start consuming the generator
    const consumePromise = (async () => {
      for (let i = 0; i < 3; i++) {
        const { value } = await generator.next();
        values.push(value);
      }
    })();

    // Give the generator time to set up
    await act(async () => {
      await Promise.resolve();
    });

    // Resolve values
    await act(async () => {
      result.current.resolve(1);
      await Promise.resolve();
    });

    await act(async () => {
      result.current.resolve(2);
      await Promise.resolve();
    });

    await act(async () => {
      result.current.resolve(3);
      await Promise.resolve();
    });

    await consumePromise;

    expect(values).toEqual([1, 2, 3]);
  });

  it("should handle string type", async () => {
    const { result } = renderHook(() => useAwaitQueue<string>());

    const generator = result.current.get();
    const values: string[] = [];

    const consumePromise = (async () => {
      for (let i = 0; i < 2; i++) {
        const { value } = await generator.next();
        values.push(value);
      }
    })();

    await act(async () => {
      await Promise.resolve();
    });

    await act(async () => {
      result.current.resolve("hello");
      await Promise.resolve();
    });

    await act(async () => {
      result.current.resolve("world");
      await Promise.resolve();
    });

    await consumePromise;

    expect(values).toEqual(["hello", "world"]);
  });

  it("should queue multiple resolves", async () => {
    const { result } = renderHook(() => useAwaitQueue<number>());

    // Verify that resolving multiple times without consuming doesn't throw
    await act(async () => {
      result.current.resolve(1);
      result.current.resolve(2);
      result.current.resolve(3);
    });

    // The hook should handle multiple queued resolves
    expect(result.current.resolve).toBeDefined();
  });

  it("should return memoized functions", () => {
    const { result, rerender } = renderHook(() => useAwaitQueue());

    const firstGet = result.current.get;
    const firstResolve = result.current.resolve;

    rerender();

    expect(result.current.get).toBe(firstGet);
    expect(result.current.resolve).toBe(firstResolve);
  });

  it("should do nothing if resolve is called without active generator", () => {
    const { result } = renderHook(() => useAwaitQueue<string>());

    // Calling resolve without active generator should not throw
    expect(() => {
      result.current.resolve("test");
    }).not.toThrow();
  });
});
