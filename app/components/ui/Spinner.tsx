import React from "react";

export function Spinner(): React.ReactNode {
   return (
      <div className="text-center">
         <div className="animate-spin">Loading!</div>
      </div>
   );
}
