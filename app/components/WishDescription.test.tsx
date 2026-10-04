import { afterEach, expect, test } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { WishDescription } from "./WishDescription";

afterEach(() => {
   cleanup();
});

test("renders emphasis, lists and links", () => {
   const { container } = render(
      <WishDescription>
         {"**Bold** and *italic*\n\n- one\n- two\n\n[Shop](https://example.com)"}
      </WishDescription>,
   );

   expect(container.querySelector("strong")?.textContent).toBe("Bold");
   expect(container.querySelector("em")?.textContent).toBe("italic");
   expect(screen.getAllByRole("listitem").map((li) => li.textContent)).toEqual([
      "one",
      "two",
   ]);
   const link = screen.getByRole("link", { name: "Shop" });
   expect(link.getAttribute("href")).toBe("https://example.com");
   expect(link.getAttribute("target")).toBe("_blank");
   expect(link.getAttribute("rel")).toBe("noopener noreferrer nofollow");
});

test("keeps single line breaks", () => {
   const { container } = render(
      <WishDescription>{"Size M\nColour blue"}</WishDescription>,
   );

   expect(container.querySelector("br")).not.toBeNull();
});

test("links bare URLs", () => {
   render(<WishDescription>{"See https://example.com/item"}</WishDescription>);

   expect(screen.getByRole("link").getAttribute("href")).toBe(
      "https://example.com/item",
   );
});

test("shows raw HTML as text and drops images", () => {
   const { container } = render(
      <WishDescription>
         {"<script>alert(1)</script>\n\n![a photo](https://example.com/x.png)"}
      </WishDescription>,
   );

   expect(container.querySelector("script")).toBeNull();
   expect(container.querySelector("img")).toBeNull();
   expect(container.textContent).toContain("a photo");
});
