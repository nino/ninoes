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
      <div className="min-h-screen bg-gray-50 dark:bg-gray-800">
         <nav className="bg-white dark:bg-gray-700 shadow-sm">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
               <div className="flex justify-between h-16">
                  <div className="flex items-center">
                     {/* Desktop Navigation */}
                     <div className="hidden sm:flex">
                        {navItems.map((item) => (
                           <Link
                              key={item.path}
                              to={item.path}
                              className={`
                        inline-flex items-center px-4 py-2 text-sm font-medium
                        ${
                           location.pathname === item.path
                              ? "text-blue-600 dark:text-blue-200 border-b-2 border-blue-600"
                              : "text-gray-500 dark:text-gray-200 hover:text-gray-700 dark:hover:text-gray-50 hover:border-gray-300"
                        }
                      `}
                           >
                              {item.label}
                           </Link>
                        ))}
                     </div>

                     {/* Mobile Menu Button */}
                     <button
                        className="sm:hidden inline-flex items-center justify-center p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500"
                        onClick={() => setIsMenuOpen(!isMenuOpen)}
                     >
                        <svg
                           className="h-6 w-6"
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
               </div>

               {/* Mobile Navigation Menu */}
               {isMenuOpen && (
                  <div className="sm:hidden">
                     <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3">
                        {navItems.map((item) => (
                           <Link
                              key={item.path}
                              to={item.path}
                              className={`
                        block px-3 py-2 text-base font-medium rounded-md
                        ${
                           location.pathname === item.path
                              ? "text-blue-600 dark:text-blue-200 bg-blue-50 dark:bg-blue-900/20"
                              : "text-gray-500 dark:text-gray-200 hover:text-gray-700 dark:hover:text-gray-50 hover:bg-gray-50 dark:hover:bg-gray-600"
                        }
                      `}
                              onClick={() => setIsMenuOpen(false)}
                           >
                              {item.label}
                           </Link>
                        ))}
                     </div>
                  </div>
               )}
            </div>
         </nav>

         <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
            {children}
         </main>
      </div>
   );
}
