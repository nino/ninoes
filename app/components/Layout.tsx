import React from "react";
import { Link, useLocation } from "react-router";
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
                  <nav className="inline-flex h-9 items-center rounded-lg bg-muted p-[3px]">
                     {navItems.map((item) => (
                        <NavLink
                           key={item.path}
                           item={item}
                           active={location.pathname === item.path}
                        />
                     ))}
                  </nav>
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

function NavLink({
   item,
   active,
   onClick,
}: {
   item: { path: string; label: string };
   active: boolean;
   onClick?: () => void;
}): React.ReactNode {
   return (
      <Link
         to={item.path}
         onClick={onClick}
         aria-current={active ? "page" : undefined}
         className={`flex h-9 items-center rounded-md px-3 text-sm font-medium transition-colors md:h-full ${focusRing} ${
            active
               ? "bg-muted text-fg md:bg-card md:shadow-xs"
               : "text-muted-fg hover:text-fg"
         }`}
      >
         {item.label}
      </Link>
   );
}
