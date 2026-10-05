import { afterEach, expect, test } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { createMemoryRouter, RouterProvider } from "react-router";
import { usePageSize } from "./usePageSize";

afterEach(() => {
   cleanup();
});

function Probe(): React.ReactNode {
   const [pageSize, setPageSize] = usePageSize(10);
   return (
      <>
         <div data-testid="size">{pageSize}</div>
         <button onClick={() => setPageSize(25)}>25</button>
         <button onClick={() => setPageSize(10)}>10</button>
      </>
   );
}

function renderAt(url: string): ReturnType<typeof createMemoryRouter> {
   const router = createMemoryRouter([{ path: "/elo", element: <Probe /> }], {
      initialEntries: [url],
   });
   render(<RouterProvider router={router} />);
   return router;
}

test("reads the page size from the URL", () => {
   renderAt("/elo?pageSize=50");
   expect(screen.getByTestId("size").textContent).toBe("50");
});

test("ignores page sizes that aren't offered", () => {
   renderAt("/elo?pageSize=7");
   expect(screen.getByTestId("size").textContent).toBe("10");
});

test("writes the choice to the URL and drops it again for the default", () => {
   const router = renderAt("/elo?other=1");

   fireEvent.click(screen.getByRole("button", { name: "25" }));
   expect(screen.getByTestId("size").textContent).toBe("25");
   expect(router.state.location.search).toBe("?other=1&pageSize=25");

   fireEvent.click(screen.getByRole("button", { name: "10" }));
   expect(router.state.location.search).toBe("?other=1");
});
