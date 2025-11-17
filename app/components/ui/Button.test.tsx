import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Button } from "./Button";

describe("Button", () => {
  it("should render with children", () => {
    render(<Button>Click me</Button>);
    expect(screen.getByRole("button", { name: /click me/i })).toBeInTheDocument();
  });

  it("should render with primary variant by default", () => {
    render(<Button>Primary Button</Button>);
    const button = screen.getByRole("button");
    expect(button).toHaveClass("bg-linear-[20deg]");
    expect(button).toHaveClass("from-sky-50");
    expect(button).toHaveClass("to-emerald-50");
  });

  it("should render with secondary variant", () => {
    render(<Button variant="secondary">Secondary Button</Button>);
    const button = screen.getByRole("button");
    expect(button).toHaveClass("bg-gray-200");
    expect(button).toHaveClass("text-gray-900");
  });

  it("should render with danger variant", () => {
    render(<Button variant="danger">Danger Button</Button>);
    const button = screen.getByRole("button");
    expect(button).toHaveClass("bg-red-600");
    expect(button).toHaveClass("text-white");
  });

  it("should render with ghost variant", () => {
    render(<Button variant="ghost">Ghost Button</Button>);
    const button = screen.getByRole("button");
    expect(button).toHaveClass("text-gray-700");
    expect(button).toHaveClass("hover:bg-gray-100");
  });

  it("should handle click events", async () => {
    const handleClick = vi.fn();
    const user = userEvent.setup();

    render(<Button onClick={handleClick}>Click me</Button>);
    const button = screen.getByRole("button");

    await user.click(button);
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it("should be disabled when disabled prop is true", () => {
    render(<Button disabled>Disabled Button</Button>);
    const button = screen.getByRole("button");

    expect(button).toBeDisabled();
    expect(button).toHaveClass("opacity-50");
    expect(button).toHaveClass("cursor-not-allowed");
  });

  it("should not call onClick when disabled", async () => {
    const handleClick = vi.fn();
    const user = userEvent.setup();

    render(<Button disabled onClick={handleClick}>Disabled Button</Button>);
    const button = screen.getByRole("button");

    await user.click(button);
    expect(handleClick).not.toHaveBeenCalled();
  });

  it("should show loading spinner when isLoading is true", () => {
    render(<Button isLoading>Loading Button</Button>);
    const button = screen.getByRole("button");

    expect(button).toBeDisabled();
    expect(button).toHaveClass("text-transparent");

    // Check for spinner element
    const spinner = button.querySelector(".animate-spin");
    expect(spinner).toBeInTheDocument();
  });

  it("should not call onClick when loading", async () => {
    const handleClick = vi.fn();
    const user = userEvent.setup();

    render(<Button isLoading onClick={handleClick}>Loading Button</Button>);
    const button = screen.getByRole("button");

    await user.click(button);
    expect(handleClick).not.toHaveBeenCalled();
  });

  it("should render with big size when big prop is true", () => {
    render(<Button big>Big Button</Button>);
    const button = screen.getByRole("button");
    expect(button).toHaveClass("text-lg");
  });

  it("should apply custom className", () => {
    render(<Button className="custom-class">Custom Button</Button>);
    const button = screen.getByRole("button");
    expect(button).toHaveClass("custom-class");
  });

  it("should pass through additional HTML attributes", () => {
    render(
      <Button type="submit" data-testid="test-button">
        Submit
      </Button>
    );
    const button = screen.getByRole("button");
    expect(button).toHaveAttribute("type", "submit");
    expect(button).toHaveAttribute("data-testid", "test-button");
  });

  it("should render with wrapper div with gradient background", () => {
    const { container } = render(<Button>Button</Button>);
    const wrapper = container.querySelector(".bg-linear-to-tr");
    expect(wrapper).toBeInTheDocument();
    expect(wrapper).toHaveClass("from-red-200");
    expect(wrapper).toHaveClass("to-pink-400");
  });

  it("should combine disabled and loading styles correctly", () => {
    render(<Button disabled isLoading>Disabled and Loading</Button>);
    const button = screen.getByRole("button");

    expect(button).toBeDisabled();
    expect(button).toHaveClass("opacity-50");
    expect(button).toHaveClass("cursor-not-allowed");
    expect(button).toHaveClass("text-transparent");
  });

  it("should hide text content when loading but keep it in DOM", () => {
    render(<Button isLoading>Loading Text</Button>);
    const button = screen.getByRole("button");

    // Text should still be in DOM but transparent
    expect(button).toHaveTextContent("Loading Text");
    expect(button).toHaveClass("text-transparent");
  });

  it("should handle multiple clicks rapidly", async () => {
    const handleClick = vi.fn();
    const user = userEvent.setup();

    render(<Button onClick={handleClick}>Click me</Button>);
    const button = screen.getByRole("button");

    await user.click(button);
    await user.click(button);
    await user.click(button);

    expect(handleClick).toHaveBeenCalledTimes(3);
  });

  it("should handle all variant combinations with big prop", () => {
    const variants: Array<"primary" | "secondary" | "danger" | "ghost"> = [
      "primary",
      "secondary",
      "danger",
      "ghost",
    ];

    variants.forEach((variant) => {
      const { unmount } = render(
        <Button variant={variant} big>
          {variant} Big
        </Button>
      );
      const button = screen.getByRole("button");
      expect(button).toHaveClass("text-lg");
      unmount();
    });
  });

  it("should apply focus ring styles", () => {
    render(<Button>Focus Button</Button>);
    const button = screen.getByRole("button");
    expect(button).toHaveClass("focus:outline-none");
    expect(button).toHaveClass("focus:ring-2");
    expect(button).toHaveClass("focus:ring-offset-2");
  });

  it("should have transition styles", () => {
    render(<Button>Transition Button</Button>);
    const button = screen.getByRole("button");
    expect(button).toHaveClass("transition-all");
  });
});
