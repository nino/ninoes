import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { Spinner } from "./Spinner";

describe("Spinner", () => {
  it("should render the spinner component", () => {
    render(<Spinner />);
    expect(screen.getByText("Loading!")).toBeInTheDocument();
  });

  it("should have animate-spin class", () => {
    const { container } = render(<Spinner />);
    const spinnerElement = container.querySelector(".animate-spin");
    expect(spinnerElement).toBeInTheDocument();
  });

  it("should have text-center class on container", () => {
    const { container } = render(<Spinner />);
    const containerElement = container.querySelector(".text-center");
    expect(containerElement).toBeInTheDocument();
  });

  it("should display Loading! text", () => {
    render(<Spinner />);
    const loadingText = screen.getByText("Loading!");
    expect(loadingText).toBeVisible();
  });

  it("should render consistently", () => {
    const { container: container1 } = render(<Spinner />);
    const { container: container2 } = render(<Spinner />);

    expect(container1.innerHTML).toBe(container2.innerHTML);
  });
});
