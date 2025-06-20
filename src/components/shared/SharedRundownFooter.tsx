
import React from 'react';
import { format } from 'date-fns';

const SharedRundownFooter = () => {
  return (
    <>
      {/* Print footer */}
      <div className="mt-4 text-gray-500 text-sm text-center hidden print:block">
        Generated from {window.location.hostname} • {format(new Date(), 'yyyy-MM-dd HH:mm')}
      </div>
      
      {/* Screen-only footer with print button */}
      <div className="mt-4 flex justify-between items-center print:hidden">
        <div className="text-sm text-muted-foreground">
          This is a read-only view of the rundown. Updates appear live.
        </div>
        <button
          onClick={() => window.print()}
          className="px-4 py-2 bg-secondary hover:bg-secondary/80 rounded text-secondary-foreground text-sm flex items-center transition-colors"
        >
          <span className="mr-1">📄</span> Print View
        </button>
      </div>
    </>
  );
};

export default SharedRundownFooter;
