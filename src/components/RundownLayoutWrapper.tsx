
import React from 'react';

interface RundownLayoutWrapperProps {
  children: React.ReactNode;
}

const RundownLayoutWrapper = ({ children }: RundownLayoutWrapperProps) => {
  return (
    <div className="h-full overflow-hidden">
      <div className="h-full">
        <div className="bg-white dark:bg-gray-800 h-full overflow-hidden">
          {children}
        </div>
      </div>
    </div>
  );
};

export default RundownLayoutWrapper;
