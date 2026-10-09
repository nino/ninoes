import React from "react";
import { Link, useLocation } from "react-router";
import { SlidingPill } from "~/components/ui/SlidingPill";
import { focusRing, ghostButton } from "~/components/ui/styles";

interface LayoutProps {
   children: React.ReactNode;
   signedIn: boolean;
}

const navItems = [
   { path: "/", label: "Home" },
   { path: "/teams", label: "Teams" },
   { path: "/vote", label: "Vote" },
   { path: "/votes", label: "Votes" },
   { path: "/leaderboard", label: "Leaderboard" },
   { path: "/banned", label: "Banned" },
   { path: "/elo", label: "ELO" },
];

export function Layout({ children, signedIn }: LayoutProps): React.ReactNode {
   const location = useLocation();
   const [isMenuOpen, setIsMenuOpen] = React.useState(false);

   const signOut = signedIn && (
      <form action="/logout" method="post">
         <button type="submit" className={ghostButton}>
            Sign out
         </button>
      </form>
   );

   return (
      <div className="min-h-screen">
         <header className="border-b border-border bg-card">
            <div className="mx-auto flex h-14 max-w-5xl items-center justify-between gap-4 px-4">
               <Link
                  to="/"
                  className={`flex items-center gap-2.5 rounded-md ${focusRing}`}
               >
                  <span
                     className="flex size-8 items-center justify-center rounded-md bg-primary font-title text-primary-fg"
                     aria-hidden="true"
                  >
                     N
                  </span>
                  <span className="flex flex-col leading-tight">
                     <span className="text-sm font-semibold">Ninoes</span>
                     <span className="text-xs text-muted-fg">Names Names Names!</span>
                  </span>
               </Link>

               <div className="hidden items-center gap-2 md:flex">
                  <DesktopNav pathname={location.pathname} />
                  {signOut}
               </div>

               <button
                  className={`${ghostButton} md:hidden`}
                  onClick={() => setIsMenuOpen(!isMenuOpen)}
                  aria-label="Toggle navigation menu"
                  aria-expanded={isMenuOpen}
               >
                  <svg stroke="currentColor" fill="none" viewBox="0 0 24 24">
                     <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d={
                           isMenuOpen
                              ? "M6 18L18 6M6 6l12 12"
                              : "M4 6h16M4 12h16M4 18h16"
                        }
                     />
                  </svg>
               </button>
            </div>

            {isMenuOpen && (
               <div className="flex flex-col gap-1 border-t border-border px-4 py-3 md:hidden">
                  <nav className="flex flex-col gap-1">
                     {navItems.map((item) => (
                        <NavLink
                           key={item.path}
                           item={item}
                           active={location.pathname === item.path}
                           onClick={() => setIsMenuOpen(false)}
                        />
                     ))}
                  </nav>
                  {signOut}
               </div>
            )}
         </header>

         <main className="mx-auto max-w-5xl px-4 py-8 sm:py-12">{children}</main>
      </div>
   );
}

/** Measured position of the active tab, relative to the nav. */
interface PillPosition {
   left: number;
   width: number;
}

function DesktopNav({ pathname }: { pathname: string }): React.ReactNode {
   const navRef = React.useRef<HTMLElement>(null);
   const [pill, setPill] = React.useState<PillPosition | null>(null);
   const [dir, setDir] = React.useState<1 | -1>(1);
   // Bumped on every tab change so the pill's wiggle replays, but not on first render.
   const [switches, setSwitches] = React.useState(0);
   // Off until the pill has been placed once, so it doesn't slide in from the left
   // edge on page load.
   const [animate, setAnimate] = React.useState(false);
   const previousPath = React.useRef(pathname);

   React.useLayoutEffect(() => {
      const from = navItems.findIndex((item) => item.path === previousPath.current);
      const to = navItems.findIndex((item) => item.path === pathname);
      previousPath.current = pathname;
      if (from !== to && from !== -1 && to !== -1) {
         setDir(to > from ? 1 : -1);
         setSwitches((n) => n + 1);
      }

      const nav = navRef.current;
      if (nav == null) return;
      const measure = (): void => {
         const link = nav.querySelector<HTMLElement>('[aria-current="page"]');
         setPill(
            link == null ? null : { left: link.offsetLeft, width: link.offsetWidth },
         );
      };
      measure();
      // Tab widths change once the web font loads.
      const observer = new ResizeObserver(measure);
      observer.observe(nav);
      return () => observer.disconnect();
   }, [pathname]);

   React.useLayoutEffect(() => {
      if (pill == null || animate) return;
      const frame = requestAnimationFrame(() => setAnimate(true));
      return () => cancelAnimationFrame(frame);
   }, [pill, animate]);

   return (
      <nav
         ref={navRef}
         className="relative inline-flex h-9 items-center rounded-lg bg-muted p-[3px]"
      >
         {pill != null && (
            <SlidingPill
               dir={dir}
               wiggleKey={switches}
               className="left-0"
               style={{
                  translate: `${pill.left}px 0`,
                  width: pill.width,
                  transition: animate ? undefined : "none",
               }}
            />
         )}
         {navItems.map((item) => (
            <NavLink
               key={item.path}
               item={item}
               active={pathname === item.path}
               // Until the pill is measured (and during SSR) the tab draws its own
               // highlight.
               highlight={pill == null}
            />
         ))}
      </nav>
   );
}

function NavLink({
   item,
   active,
   highlight = true,
   onClick,
}: {
   item: { path: string; label: string };
   active: boolean;
   highlight?: boolean;
   onClick?: () => void;
}): React.ReactNode {
   return (
      <Link
         to={item.path}
         onClick={onClick}
         aria-current={active ? "page" : undefined}
         className={`relative flex h-9 items-center rounded-md px-3 text-sm font-medium transition-colors md:h-full ${focusRing} ${
            active ? "text-fg" : "text-muted-fg hover:text-fg"
         } ${active && highlight ? "bg-muted md:bg-card md:shadow-xs" : ""}`}
      >
         {item.label}
      </Link>
   );
}
