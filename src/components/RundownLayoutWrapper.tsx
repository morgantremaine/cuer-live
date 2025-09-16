
import React from 'react';
import { useResponsiveLayout } from '@/hooks/use-mobile';

interface RundownLayoutWrapperProps {
  children: React.ReactNode;
}

const RundownLayoutWrapper = ({ children }: RundownLayoutWrapperProps) => {
  const { isMobileOrTablet } = useResponsiveLayout();
  
  return (
    <div className={`${isMobileOrTablet ? 'h-screen' : 'h-screen'} overflow-hidden`}>
      <div className="h-full">
        <div className="bg-white dark:bg-gray-800 h-full overflow-hidden">
          {children}
        </div>
      </div>
    </div>
  );
};

export default RundownLayoutWrapper;
