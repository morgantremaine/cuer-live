
import React from 'react';
import RundownActiveUsers from './RundownActiveUsers';

interface RundownLayoutWrapperProps {
  children: React.ReactNode;
  rundownId?: string | null;
  showActiveUsers?: boolean;
}

const RundownLayoutWrapper = ({ 
  children, 
  rundownId = null, 
  showActiveUsers = true 
}: RundownLayoutWrapperProps) => {
  return (
    <div className="flex flex-col h-full bg-gray-900">
      {/* Active Users Bar */}
      {showActiveUsers && <RundownActiveUsers rundownId={rundownId} />}
      
      {/* Main Content */}
      <div className="flex-1 overflow-hidden">
        {children}
      </div>
    </div>
  );
};

export default RundownLayoutWrapper;
