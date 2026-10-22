import { afterEach, expect, test } from "bun:test";
import { cleanup, render, screen } from "@testing-library/react";
import { GenderScale } from "./GenderScale";
import { NameGender } from "~/model/types";

afterEach(() => {
   cleanup();
});

test("raises the step for the name's gender and keeps the label", () => {
   const { container } = render(<GenderScale gender={NameGender.MOSTLY_FEMALE} />);

   expect(screen.getByText("Mostly female")).toBeTruthy();
   const steps = Array.from(container.querySelectorAll("[aria-hidden] > span"));
   expect(steps.map((step) => step.hasAttribute("data-active"))).toEqual([
      false,
      false,
      false,
      true,
      false,
   ]);
});

test("shows a dash when the gender is unknown", () => {
   render(<GenderScale gender={null} />);

   expect(screen.getByText("—")).toBeTruthy();
});
