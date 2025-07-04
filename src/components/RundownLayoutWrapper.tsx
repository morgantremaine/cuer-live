
import React from 'react';

interface RundownLayoutWrapperProps {
  children: React.ReactNode;
}

const RundownLayoutWrapper = ({ children }: RundownLayoutWrapperProps) => {
  return (
    <div className="h-screen overflow-hidden touch-none">
      <div className="h-full">
        <div className="bg-white dark:bg-gray-800 h-full overflow-hidden touch-pan-y">
          {children}
        </div>
      </div>
    </div>
  );
};

export default RundownLayoutWrapper;
