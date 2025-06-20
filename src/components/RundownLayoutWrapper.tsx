
import React from 'react';

interface RundownLayoutWrapperProps {
  children: React.ReactNode;
}

const RundownLayoutWrapper = ({ children }: RundownLayoutWrapperProps) => {
  return (
    <div className="overflow-hidden">
      <div>
        <div className="bg-white dark:bg-gray-800 overflow-hidden">
          {children}
        </div>
      </div>
    </div>
  );
};

export default RundownLayoutWrapper;
