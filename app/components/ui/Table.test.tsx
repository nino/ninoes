import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { Table, type TableColumnDef } from "./Table";

type Row = { name: string; elo: number };

const columns: Array<TableColumnDef<Row>> = [
   { accessorKey: "elo", header: "ELO" },
   { accessorKey: "name", header: "Name" },
];

const pageOne: Array<Row> = Array.from({ length: 10 }, (_, i) => ({
   name: `Name ${i + 1}`,
   elo: 1500 - i,
}));

const pageTwo: Array<Row> = Array.from({ length: 10 }, (_, i) => ({
   name: `Name ${i + 11}`,
   elo: 1400 - i,
}));

const BODY_HEIGHT = 320;

beforeEach(() => {
   // jsdom does no layout, so measured heights are always 0. Pretend the
   // table body is BODY_HEIGHT pixels tall. (The method lives on
   // Element.prototype in jsdom, so spy there.)
   vi.spyOn(Element.prototype, "getBoundingClientRect").mockReturnValue({
      height: BODY_HEIGHT,
      width: 600,
      x: 0,
      y: 0,
      top: 0,
      left: 0,
      right: 600,
      bottom: BODY_HEIGHT,
      toJSON: (): unknown => ({}),
   });
});

afterEach(() => {
   vi.restoreAllMocks();
});

test("holds the previous body height while the next page loads", () => {
   const { rerender } = render(
      <Table data={pageOne} columns={columns} isLoading={false} />,
   );
   expect(screen.queryByText("Name 1")).not.toBeNull();

   // Page flip: no rows while the next page is being fetched.
   rerender(<Table data={[]} columns={columns} isLoading={true} />);

   const placeholder = screen.getByTestId("table-loading-placeholder");
   expect(placeholder.style.height).toBe(`${BODY_HEIGHT}px`);
   expect(screen.queryByRole("status")).not.toBeNull();
   expect(screen.queryByText("Name 1")).toBeNull();

   // Next page arrived: rows are back, spinner gone.
   rerender(<Table data={pageTwo} columns={columns} isLoading={false} />);
   expect(screen.queryByText("Name 11")).not.toBeNull();
   expect(screen.queryByRole("status")).toBeNull();
});

test("scales the placeholder to the page size after a short last page", () => {
   const pagination = { pageIndex: 3, pageSize: 10 };
   const shortLastPage = pageOne.slice(0, 4);
   const { rerender } = render(
      <Table
         data={shortLastPage}
         columns={columns}
         pagination={pagination}
         isLoading={false}
      />,
   );

   // Going back to a full page: the placeholder should anticipate pageSize
   // rows, not reproduce the short page's height.
   rerender(
      <Table
         data={[]}
         columns={columns}
         pagination={{ pageIndex: 2, pageSize: 10 }}
         isLoading={true}
      />,
   );

   const placeholder = screen.getByTestId("table-loading-placeholder");
   expect(placeholder.style.height).toBe(`${(BODY_HEIGHT / 4) * 10}px`);
});

test("falls back to a minimum height when loading with nothing measured yet", () => {
   render(<Table data={[]} columns={columns} isLoading={true} />);

   const placeholder = screen.getByTestId("table-loading-placeholder");
   expect(placeholder.style.height).toBe("");
   expect(placeholder.style.minHeight).toBe("80px");
});

test("does not show the placeholder when rows are present", () => {
   render(<Table data={pageOne} columns={columns} isLoading={true} />);
   expect(screen.queryByText("Name 1")).not.toBeNull();
   expect(screen.queryByRole("status")).toBeNull();
});
