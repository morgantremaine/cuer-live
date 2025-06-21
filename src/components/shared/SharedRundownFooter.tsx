
import React from 'react';
import { format } from 'date-fns';

const SharedRundownFooter = () => {
  return (
    <>
      {/* Print footer - now hidden */}
      <div className="mt-4 text-gray-500 text-sm text-center hidden">
        Generated from {window.location.hostname} • {format(new Date(), 'yyyy-MM-dd HH:mm')}
      </div>
    </>
  );
};

export default SharedRundownFooter;
