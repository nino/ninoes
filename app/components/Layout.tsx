import React from "react";
import { Link, useLocation } from "react-router";

interface LayoutProps {
   children: React.ReactNode;
}

export function Layout({ children }: LayoutProps): React.ReactNode {
   const location = useLocation();
   const [isMenuOpen, setIsMenuOpen] = React.useState(false);

   const navItems = [
      { path: "/", label: "Home" },
      { path: "/teams", label: "Teams" },
      { path: "/vote", label: "Vote" },
      { path: "/votes", label: "Votes" },
      { path: "/leaderboard", label: "Leaderboard" },
      { path: "/elo", label: "ELO" },
   ];

   return (
      <div className="min-h-screen px-3 py-6 sm:px-6 sm:py-10">
         <div className="aqua-window mx-auto max-w-7xl">
            {/* Titlebar with traffic lights */}
            <div className="aqua-titlebar">
               <div className="aqua-lights" aria-hidden="true">
                  <span className="aqua-light aqua-light--close" />
                  <span className="aqua-light aqua-light--min" />
                  <span className="aqua-light aqua-light--max" />
               </div>
               <span className="aqua-title">Ninoes — Names Names Names!</span>

               {/* Mobile menu button, right-aligned in the titlebar */}
               <button
                  className="aqua-btn ml-auto px-2 py-1 sm:hidden"
                  onClick={() => setIsMenuOpen(!isMenuOpen)}
                  aria-label="Toggle navigation menu"
                  aria-expanded={isMenuOpen}
               >
                  <svg
                     className="h-4 w-4"
                     stroke="currentColor"
                     fill="none"
                     viewBox="0 0 24 24"
                  >
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

            {/* Toolbar nav (desktop) */}
            <nav className="aqua-toolbar hidden sm:flex">
               {navItems.map((item) => (
                  <Link
                     key={item.path}
                     to={item.path}
                     className={`aqua-tab ${
                        location.pathname === item.path ? "aqua-tab--active" : ""
                     }`}
                  >
                     {item.label}
                  </Link>
               ))}
            </nav>

            {/* Toolbar nav (mobile) */}
            {isMenuOpen && (
               <nav className="aqua-toolbar flex-wrap sm:hidden">
                  {navItems.map((item) => (
                     <Link
                        key={item.path}
                        to={item.path}
                        className={`aqua-tab ${
                           location.pathname === item.path ? "aqua-tab--active" : ""
                        }`}
                        onClick={() => setIsMenuOpen(false)}
                     >
                        {item.label}
                     </Link>
                  ))}
               </nav>
            )}

            <main className="aqua-body">{children}</main>
         </div>
      </div>
   );
}
