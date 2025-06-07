
import React from 'react';

interface RundownLayoutWrapperProps {
  children: React.ReactNode;
}

const RundownLayoutWrapper = ({ children }: RundownLayoutWrapperProps) => {
  return (
    <div className="bg-gray-50 dark:bg-gray-900 min-h-screen transition-colors">
      <div className="max-w-none mx-auto">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg overflow-hidden">
          {children}
        </div>
      </div>
    </div>
  );
};

export default RundownLayoutWrapper;
