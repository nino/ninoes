// @vitest-environment jsdom
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import type { ColumnDef } from "@tanstack/react-table";
import { Table } from "./Table";

type Row = { name: string; elo: number };

const columns: Array<ColumnDef<Row>> = [
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

const BODY_HEIGHT = 323;

beforeEach(() => {
   // jsdom does no layout, so measured heights are always 0. Pretend the
   // table body is BODY_HEIGHT pixels tall.
   vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockReturnValue({
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
   cleanup();
   vi.restoreAllMocks();
});

test("holds the previous body height while the next page loads", () => {
   const { rerender } = render(
      <Table data={pageOne} columns={columns} isLoading={false} />,
   );
   expect(screen.getByText("Name 1")).toBeDefined();

   // Page flip: no rows while the next page is being fetched.
   rerender(<Table data={[]} columns={columns} isLoading={true} />);

   const spinner = screen.getByRole("status");
   const placeholder = spinner.parentElement;
   expect(placeholder?.style.height).toBe(`${BODY_HEIGHT}px`);
   expect(screen.queryByText("Name 1")).toBeNull();

   // Next page arrived: rows are back, spinner gone.
   rerender(<Table data={pageTwo} columns={columns} isLoading={false} />);
   expect(screen.getByText("Name 11")).toBeDefined();
   expect(screen.queryByRole("status")).toBeNull();
});

test("falls back to a minimum height when loading with nothing measured yet", () => {
   render(<Table data={[]} columns={columns} isLoading={true} />);

   const spinner = screen.getByRole("status");
   const placeholder = spinner.parentElement;
   expect(placeholder?.style.height).toBe("");
   expect(placeholder?.style.minHeight).toBe("80px");
});

test("does not show the placeholder when rows are present", () => {
   render(<Table data={pageOne} columns={columns} isLoading={true} />);
   expect(screen.getByText("Name 1")).toBeDefined();
   expect(screen.queryByRole("status")).toBeNull();
});
