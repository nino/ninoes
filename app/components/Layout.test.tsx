import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { BrowserRouter } from "react-router";
import { Layout } from "./Layout";

// Helper to render Layout with router
function renderLayout(children: React.ReactNode, initialPath = "/") {
  window.history.pushState({}, "", initialPath);
  return render(
    <BrowserRouter>
      <Layout>{children}</Layout>
    </BrowserRouter>
  );
}

describe("Layout", () => {
  it("should render children content", () => {
    renderLayout(<div>Test Content</div>);
    expect(screen.getByText("Test Content")).toBeInTheDocument();
  });

  it("should render all navigation items", () => {
    renderLayout(<div>Content</div>);

    expect(screen.getAllByText("Home").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Teams").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Vote").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Votes").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Leaderboard").length).toBeGreaterThan(0);
    expect(screen.getAllByText("ELO").length).toBeGreaterThan(0);
  });

  it("should have correct navigation links", () => {
    renderLayout(<div>Content</div>);

    const homeLinks = screen.getAllByRole("link", { name: /home/i });
    expect(homeLinks[0]).toHaveAttribute("href", "/");

    const teamsLinks = screen.getAllByRole("link", { name: /teams/i });
    expect(teamsLinks[0]).toHaveAttribute("href", "/teams");

    const voteLinks = screen.getAllByRole("link", { name: /^vote$/i });
    expect(voteLinks[0]).toHaveAttribute("href", "/vote");

    const votesLinks = screen.getAllByRole("link", { name: /votes/i });
    expect(votesLinks[0]).toHaveAttribute("href", "/votes");

    const leaderboardLinks = screen.getAllByRole("link", { name: /leaderboard/i });
    expect(leaderboardLinks[0]).toHaveAttribute("href", "/leaderboard");

    const eloLinks = screen.getAllByRole("link", { name: /elo/i });
    expect(eloLinks[0]).toHaveAttribute("href", "/elo");
  });

  it("should toggle mobile menu when button is clicked", async () => {
    const user = userEvent.setup();
    renderLayout(<div>Content</div>);

    const menuButton = screen.getByRole("button");

    // Mobile menu should not be visible initially
    const mobileNavBefore = document.querySelector(".sm\\:hidden > div");
    expect(mobileNavBefore).not.toBeInTheDocument();

    // Click to open menu
    await user.click(menuButton);

    // Mobile menu should be visible
    const mobileNavAfter = document.querySelector(".sm\\:hidden > div");
    expect(mobileNavAfter).toBeInTheDocument();

    // Click to close menu
    await user.click(menuButton);

    // Mobile menu should be hidden again
    const mobileNavClosed = document.querySelector(".sm\\:hidden > div");
    expect(mobileNavClosed).not.toBeInTheDocument();
  });

  it("should close mobile menu when a link is clicked", async () => {
    const user = userEvent.setup();
    renderLayout(<div>Content</div>);

    const menuButton = screen.getByRole("button");

    // Open mobile menu
    await user.click(menuButton);
    expect(document.querySelector(".sm\\:hidden > div")).toBeInTheDocument();

    // Click a link in mobile menu
    const allLinks = screen.getAllByRole("link", { name: /home/i });
    const mobileHomeLink = allLinks.find((link) =>
      link.className.includes("block")
    );

    if (mobileHomeLink) {
      await user.click(mobileHomeLink);
    }

    // Menu should be closed
    expect(document.querySelector(".sm\\:hidden > div")).not.toBeInTheDocument();
  });

  it("should have hamburger icon when menu is closed", () => {
    renderLayout(<div>Content</div>);

    const menuButton = screen.getByRole("button");
    const svg = menuButton.querySelector("svg");
    const path = svg?.querySelector("path");

    expect(path?.getAttribute("d")).toBe("M4 6h16M4 12h16M4 18h16");
  });

  it("should have close icon when menu is open", async () => {
    const user = userEvent.setup();
    renderLayout(<div>Content</div>);

    const menuButton = screen.getByRole("button");
    await user.click(menuButton);

    const svg = menuButton.querySelector("svg");
    const path = svg?.querySelector("path");

    expect(path?.getAttribute("d")).toBe("M6 18L18 6M6 6l12 12");
  });

  it("should render desktop navigation with hidden on mobile", () => {
    const { container } = renderLayout(<div>Content</div>);

    const desktopNav = container.querySelector(".hidden.sm\\:flex");
    expect(desktopNav).toBeInTheDocument();
  });

  it("should render mobile menu button hidden on desktop", () => {
    renderLayout(<div>Content</div>);

    const menuButton = screen.getByRole("button");
    expect(menuButton).toHaveClass("sm:hidden");
  });

  it("should have proper main content wrapper classes", () => {
    const { container } = renderLayout(<div data-testid="content">Content</div>);

    const main = container.querySelector("main");
    expect(main).toHaveClass("max-w-7xl");
    expect(main).toHaveClass("mx-auto");
    expect(main).toHaveClass("py-6");
  });

  it("should have proper navigation styling", () => {
    const { container } = renderLayout(<div>Content</div>);

    const nav = container.querySelector("nav");
    expect(nav).toHaveClass("bg-white");
    expect(nav).toHaveClass("shadow-sm");
  });

  it("should render with dark mode classes", () => {
    const { container } = renderLayout(<div>Content</div>);

    const rootDiv = container.querySelector(".min-h-screen");
    expect(rootDiv).toHaveClass("dark:bg-gray-800");

    const nav = container.querySelector("nav");
    expect(nav).toHaveClass("dark:bg-gray-700");
  });

  it("should render all 6 navigation items", () => {
    renderLayout(<div>Content</div>);

    const allLinks = screen.getAllByRole("link");
    // Should have 6 items in desktop (mobile menu is initially hidden)
    expect(allLinks.length).toBe(6);
  });

  it("should handle rapid menu toggling", async () => {
    const user = userEvent.setup();
    renderLayout(<div>Content</div>);

    const menuButton = screen.getByRole("button");

    await user.click(menuButton);
    await user.click(menuButton);
    await user.click(menuButton);

    // Menu should be open after odd number of clicks
    expect(document.querySelector(".sm\\:hidden > div")).toBeInTheDocument();
  });

  it("should maintain menu state independently of children changes", () => {
    const { rerender } = renderLayout(<div>Initial Content</div>);

    rerender(
      <BrowserRouter>
        <Layout>
          <div>Updated Content</div>
        </Layout>
      </BrowserRouter>
    );

    expect(screen.getByText("Updated Content")).toBeInTheDocument();
    expect(document.querySelector(".sm\\:hidden > div")).not.toBeInTheDocument();
  });
});
