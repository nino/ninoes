import { type ReactNode } from "react";
import { Link, useLocation } from "react-router";

interface LayoutProps {
   children: ReactNode;
}

export function Layout({ children }: LayoutProps): ReactNode {
   const location = useLocation();

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
                  <div className="flex">
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
               </div>
            </div>
         </nav>

         <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
            {children}
         </main>
      </div>
   );
}
