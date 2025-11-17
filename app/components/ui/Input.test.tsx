import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Input } from "./Input";

describe("Input", () => {
  it("should render an input element", () => {
    render(<Input />);
    const input = screen.getByRole("textbox");
    expect(input).toBeInTheDocument();
  });

  it("should render with a label when provided", () => {
    render(<Input label="Email Address" />);
    expect(screen.getByText("Email Address")).toBeInTheDocument();
    const input = screen.getByRole("textbox");
    expect(input).toBeInTheDocument();
  });

  it("should not render a label when not provided", () => {
    const { container } = render(<Input />);
    const label = container.querySelector("label");
    expect(label).not.toBeInTheDocument();
  });

  it("should display error message when error prop is provided", () => {
    render(<Input error="This field is required" />);
    expect(screen.getByText("This field is required")).toBeInTheDocument();
  });

  it("should apply error border styles when error prop is provided", () => {
    render(<Input error="Error message" />);
    const input = screen.getByRole("textbox");
    expect(input).toHaveClass("border-red-500");
  });

  it("should apply default border styles when no error", () => {
    render(<Input />);
    const input = screen.getByRole("textbox");
    expect(input).toHaveClass("border-gray-300");
  });

  it("should accept user input", async () => {
    const user = userEvent.setup();
    render(<Input />);
    const input = screen.getByRole("textbox");

    await user.type(input, "Hello World");
    expect(input).toHaveValue("Hello World");
  });

  it("should call onChange handler when value changes", async () => {
    const handleChange = vi.fn();
    const user = userEvent.setup();

    render(<Input onChange={handleChange} />);
    const input = screen.getByRole("textbox");

    await user.type(input, "Test");
    expect(handleChange).toHaveBeenCalled();
  });

  it("should apply custom className", () => {
    render(<Input className="custom-input" />);
    const input = screen.getByRole("textbox");
    expect(input).toHaveClass("custom-input");
  });

  it("should pass through HTML input attributes", () => {
    render(
      <Input
        type="email"
        placeholder="Enter email"
        required
        disabled
        maxLength={50}
      />
    );
    const input = screen.getByRole("textbox");

    expect(input).toHaveAttribute("type", "email");
    expect(input).toHaveAttribute("placeholder", "Enter email");
    expect(input).toBeRequired();
    expect(input).toBeDisabled();
    expect(input).toHaveAttribute("maxLength", "50");
  });

  it("should render with both label and error", () => {
    render(<Input label="Username" error="Username is taken" />);

    expect(screen.getByText("Username")).toBeInTheDocument();
    expect(screen.getByText("Username is taken")).toBeInTheDocument();
  });

  it("should have focus styles", () => {
    render(<Input />);
    const input = screen.getByRole("textbox");

    expect(input).toHaveClass("focus:outline-none");
    expect(input).toHaveClass("focus:ring-2");
    expect(input).toHaveClass("focus:ring-blue-500");
    expect(input).toHaveClass("focus:border-blue-500");
  });

  it("should have base styling classes", () => {
    render(<Input />);
    const input = screen.getByRole("textbox");

    expect(input).toHaveClass("w-full");
    expect(input).toHaveClass("px-3");
    expect(input).toHaveClass("py-2");
    expect(input).toHaveClass("border");
    expect(input).toHaveClass("rounded-md");
    expect(input).toHaveClass("shadow-sm");
  });

  it("should render password input type", () => {
    const { container } = render(<Input type="password" />);
    const input = container.querySelector('input[type="password"]');
    expect(input).toBeInTheDocument();
    expect(input).toHaveAttribute("type", "password");
  });

  it("should handle value prop (controlled component)", () => {
    const { rerender } = render(<Input value="Initial" onChange={() => {}} />);
    const input = screen.getByRole("textbox");

    expect(input).toHaveValue("Initial");

    rerender(<Input value="Updated" onChange={() => {}} />);
    expect(input).toHaveValue("Updated");
  });

  it("should handle defaultValue prop (uncontrolled component)", () => {
    render(<Input defaultValue="Default Value" />);
    const input = screen.getByRole("textbox");
    expect(input).toHaveValue("Default Value");
  });

  it("should render with name attribute", () => {
    render(<Input name="email" />);
    const input = screen.getByRole("textbox");
    expect(input).toHaveAttribute("name", "email");
  });

  it("should render with id attribute", () => {
    render(<Input id="email-input" />);
    const input = screen.getByRole("textbox");
    expect(input).toHaveAttribute("id", "email-input");
  });

  it("should handle onBlur event", async () => {
    const handleBlur = vi.fn();
    const user = userEvent.setup();

    render(<Input onBlur={handleBlur} />);
    const input = screen.getByRole("textbox");

    await user.click(input);
    await user.tab();

    expect(handleBlur).toHaveBeenCalledTimes(1);
  });

  it("should handle onFocus event", async () => {
    const handleFocus = vi.fn();
    const user = userEvent.setup();

    render(<Input onFocus={handleFocus} />);
    const input = screen.getByRole("textbox");

    await user.click(input);
    expect(handleFocus).toHaveBeenCalledTimes(1);
  });

  it("should have correct error text styling", () => {
    render(<Input error="Error message" />);
    const errorText = screen.getByText("Error message");

    expect(errorText).toHaveClass("mt-1");
    expect(errorText).toHaveClass("text-sm");
    expect(errorText).toHaveClass("text-red-600");
  });

  it("should have correct label styling", () => {
    render(<Input label="Test Label" />);
    const label = screen.getByText("Test Label");

    expect(label).toHaveClass("block");
    expect(label).toHaveClass("text-sm");
    expect(label).toHaveClass("font-medium");
    expect(label).toHaveClass("text-gray-700");
    expect(label).toHaveClass("mb-1");
  });

  it("should handle number input type", async () => {
    const user = userEvent.setup();
    render(<Input type="number" />);
    const input = screen.getByRole("spinbutton");

    await user.type(input, "123");
    expect(input).toHaveValue(123);
  });

  it("should handle clear input", async () => {
    const user = userEvent.setup();
    render(<Input defaultValue="Clear me" />);
    const input = screen.getByRole("textbox");

    expect(input).toHaveValue("Clear me");
    await user.clear(input);
    expect(input).toHaveValue("");
  });
});
