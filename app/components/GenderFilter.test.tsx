import { afterEach, expect, test, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { GenderFilter } from "./GenderFilter";
import { NameGender } from "~/model/types";

afterEach(() => {
   cleanup();
});

test("selecting a gender adds it to the current selection", () => {
   const onChange = vi.fn();
   render(<GenderFilter value={[NameGender.NEUTRAL]} onChange={onChange} />);

   fireEvent.click(screen.getByRole("button", { name: "Mostly female" }));

   expect(onChange).toHaveBeenCalledWith([NameGender.NEUTRAL, NameGender.MOSTLY_FEMALE]);
});

test("selecting an already selected gender removes it", () => {
   const onChange = vi.fn();
   render(
      <GenderFilter
         value={[NameGender.NEUTRAL, NameGender.ALWAYS_MALE]}
         onChange={onChange}
      />,
   );

   fireEvent.click(screen.getByRole("button", { name: "Neutral" }));

   expect(onChange).toHaveBeenCalledWith([NameGender.ALWAYS_MALE]);
});

test("All clears the selection", () => {
   const onChange = vi.fn();
   render(<GenderFilter value={[NameGender.NEUTRAL]} onChange={onChange} />);

   fireEvent.click(screen.getByRole("button", { name: "All" }));

   expect(onChange).toHaveBeenCalledWith([]);
});
