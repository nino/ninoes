import React from "react";

export function Spinner(): React.ReactNode {
   return (
      <div className="flex justify-center py-4">
         <div className="aqua-spinner" role="status" aria-label="Loading" />
      </div>
   );
}
