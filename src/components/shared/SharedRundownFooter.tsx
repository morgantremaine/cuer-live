
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
      <div className="mt-4 flex justify-end items-center print:hidden">
        <button
          onClick={() => window.print()}
          className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded text-gray-800 text-sm flex items-center"
        >
          <span className="mr-1">📄</span> Print View
        </button>
      </div>
    </>
  );
};

export default SharedRundownFooter;
