import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Table } from "./Table";
import type { ColumnDef } from "@tanstack/react-table";

interface TestData {
  id: number;
  name: string;
  age: number;
}

describe("Table", () => {
  const mockData: TestData[] = [
    { id: 1, name: "John Doe", age: 30 },
    { id: 2, name: "Jane Smith", age: 25 },
    { id: 3, name: "Bob Johnson", age: 35 },
  ];

  const columns: Array<ColumnDef<TestData>> = [
    {
      accessorKey: "id",
      header: "ID",
    },
    {
      accessorKey: "name",
      header: "Name",
    },
    {
      accessorKey: "age",
      header: "Age",
    },
  ];

  it("should render table with data", () => {
    render(<Table data={mockData} columns={columns} />);

    // Check headers
    expect(screen.getByText("ID")).toBeInTheDocument();
    expect(screen.getByText("Name")).toBeInTheDocument();
    expect(screen.getByText("Age")).toBeInTheDocument();

    // Check data
    expect(screen.getByText("John Doe")).toBeInTheDocument();
    expect(screen.getByText("Jane Smith")).toBeInTheDocument();
    expect(screen.getByText("Bob Johnson")).toBeInTheDocument();
  });

  it("should render empty table when no data provided", () => {
    render(<Table data={[]} columns={columns} />);

    // Headers should still be present
    expect(screen.getByText("ID")).toBeInTheDocument();
    expect(screen.getByText("Name")).toBeInTheDocument();
    expect(screen.getByText("Age")).toBeInTheDocument();

    // No data rows
    const tbody = document.querySelector("tbody");
    expect(tbody?.children.length).toBe(0);
  });

  it("should handle row click when onRowClick is provided", async () => {
    const handleRowClick = vi.fn();
    const user = userEvent.setup();

    render(<Table data={mockData} columns={columns} onRowClick={handleRowClick} />);

    const johnRow = screen.getByText("John Doe").closest("tr");
    await user.click(johnRow!);

    expect(handleRowClick).toHaveBeenCalledTimes(1);
    expect(handleRowClick).toHaveBeenCalledWith(mockData[0]);
  });

  it("should not make rows clickable when onRowClick is not provided", () => {
    render(<Table data={mockData} columns={columns} />);

    const johnRow = screen.getByText("John Doe").closest("tr");
    expect(johnRow).not.toHaveClass("cursor-pointer");
  });

  it("should add cursor-pointer class when onRowClick is provided", () => {
    const handleRowClick = vi.fn();
    render(<Table data={mockData} columns={columns} onRowClick={handleRowClick} />);

    const johnRow = screen.getByText("John Doe").closest("tr");
    expect(johnRow).toHaveClass("cursor-pointer");
  });

  it("should handle sorting when setSorting is provided", async () => {
    const setSorting = vi.fn();
    const user = userEvent.setup();

    render(
      <Table
        data={mockData}
        columns={columns}
        sorting={[]}
        setSorting={setSorting}
      />
    );

    const nameHeader = screen.getByText("Name");
    await user.click(nameHeader);

    expect(setSorting).toHaveBeenCalled();
  });

  it("should display ascending sort indicator", () => {
    render(
      <Table
        data={mockData}
        columns={columns}
        sorting={[{ id: "name", desc: false }]}
        setSorting={vi.fn()}
      />
    );

    const nameHeader = screen.getByText(/Name/);
    expect(nameHeader.textContent).toContain("🔼");
  });

  it("should display descending sort indicator", () => {
    render(
      <Table
        data={mockData}
        columns={columns}
        sorting={[{ id: "name", desc: true }]}
        setSorting={vi.fn()}
      />
    );

    const nameHeader = screen.getByText(/Name/);
    expect(nameHeader.textContent).toContain("🔽");
  });

  it("should not display sort indicator when column is not sorted", () => {
    render(
      <Table
        data={mockData}
        columns={columns}
        sorting={[]}
        setSorting={vi.fn()}
      />
    );

    const nameHeader = screen.getByText("Name");
    expect(nameHeader.textContent).not.toContain("🔼");
    expect(nameHeader.textContent).not.toContain("🔽");
  });

  it("should render with custom cell content", () => {
    const customColumns: Array<ColumnDef<TestData>> = [
      {
        accessorKey: "name",
        header: "Name",
        cell: ({ getValue }) => <strong>{getValue() as string}</strong>,
      },
    ];

    render(<Table data={mockData} columns={customColumns} />);

    const strongElement = screen.getByText("John Doe");
    expect(strongElement.tagName).toBe("STRONG");
  });

  it("should handle pagination state", () => {
    const setPagination = vi.fn();
    const pagination = { pageIndex: 0, pageSize: 10 };

    render(
      <Table
        data={mockData}
        columns={columns}
        pagination={pagination}
        setPagination={setPagination}
      />
    );

    // Table should render with pagination state
    expect(screen.getByText("John Doe")).toBeInTheDocument();
  });

  it("should render all rows in the data", () => {
    render(<Table data={mockData} columns={columns} />);

    const tbody = document.querySelector("tbody");
    expect(tbody?.children.length).toBe(mockData.length);
  });

  it("should have proper table structure", () => {
    const { container } = render(<Table data={mockData} columns={columns} />);

    const table = container.querySelector("table");
    const thead = container.querySelector("thead");
    const tbody = container.querySelector("tbody");

    expect(table).toBeInTheDocument();
    expect(thead).toBeInTheDocument();
    expect(tbody).toBeInTheDocument();
  });

  it("should have overflow-x-auto wrapper", () => {
    const { container } = render(<Table data={mockData} columns={columns} />);

    const wrapper = container.querySelector(".overflow-x-auto");
    expect(wrapper).toBeInTheDocument();
  });

  it("should have proper header styling", () => {
    render(<Table data={mockData} columns={columns} />);

    const idHeader = screen.getByText("ID");
    expect(idHeader).toHaveClass("px-2");
    expect(idHeader).toHaveClass("py-1");
    expect(idHeader).toHaveClass("text-left");
    expect(idHeader).toHaveClass("uppercase");
    expect(idHeader).toHaveClass("cursor-pointer");
  });

  it("should have proper cell styling", () => {
    render(<Table data={mockData} columns={columns} />);

    const johnCell = screen.getByText("John Doe").closest("td");
    expect(johnCell).toHaveClass("px-2");
    expect(johnCell).toHaveClass("py-1");
    expect(johnCell).toHaveClass("whitespace-nowrap");
    expect(johnCell).toHaveClass("text-sm");
  });

  it("should handle multiple row clicks", async () => {
    const handleRowClick = vi.fn();
    const user = userEvent.setup();

    render(<Table data={mockData} columns={columns} onRowClick={handleRowClick} />);

    const johnRow = screen.getByText("John Doe").closest("tr");
    const janeRow = screen.getByText("Jane Smith").closest("tr");

    await user.click(johnRow!);
    await user.click(janeRow!);

    expect(handleRowClick).toHaveBeenCalledTimes(2);
    expect(handleRowClick).toHaveBeenNthCalledWith(1, mockData[0]);
    expect(handleRowClick).toHaveBeenNthCalledWith(2, mockData[1]);
  });

  it("should render with number values", () => {
    render(<Table data={mockData} columns={columns} />);

    expect(screen.getByText("30")).toBeInTheDocument();
    expect(screen.getByText("25")).toBeInTheDocument();
    expect(screen.getByText("35")).toBeInTheDocument();
  });

  it("should handle single row data", () => {
    const singleRow = [mockData[0]];
    render(<Table data={singleRow} columns={columns} />);

    const tbody = document.querySelector("tbody");
    expect(tbody?.children.length).toBe(1);
    expect(screen.getByText("John Doe")).toBeInTheDocument();
  });

  it("should render correct number of columns", () => {
    render(<Table data={mockData} columns={columns} />);

    const headerRow = document.querySelector("thead tr");
    expect(headerRow?.children.length).toBe(columns.length);

    const firstBodyRow = document.querySelector("tbody tr");
    expect(firstBodyRow?.children.length).toBe(columns.length);
  });
});
