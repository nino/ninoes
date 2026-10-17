import { afterEach } from "bun:test";
import { cleanup } from "@testing-library/react";

// Testing Library only cleans up between tests by itself when afterEach is a
// global, which it isn't in preloaded files.
afterEach(() => {
   cleanup();
});
