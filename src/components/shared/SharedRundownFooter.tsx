
import React from 'react';
import { format } from 'date-fns';

const SharedRundownFooter = () => {
  return (
    <>
      {/* Print footer */}
      <div className="mt-4 text-gray-500 text-sm text-center hidden print:block">
        Generated from {window.location.hostname} • {format(new Date(), 'yyyy-MM-dd HH:mm')}
      </div>
    </>
  );
};

export default SharedRundownFooter;
