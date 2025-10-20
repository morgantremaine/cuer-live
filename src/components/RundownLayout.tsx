import React, { useEffect } from 'react';
import { useParams, useLocation } from 'react-router-dom';
import RundownLayoutRouter from '@/components/RundownLayoutRouter';
import { sleepDetector } from '@/services/sleepDetector';

const RundownLayout = () => {
  const { id } = useParams<{ id: string }>();
  const location = useLocation();
  
  useEffect(() => {
    console.log('🔄 RundownLayout mounted for rundown:', id, 'at path:', location.pathname);
    sleepDetector.start();
    return () => {
      console.log('🧹 RundownLayout unmounting for rundown:', id);
      sleepDetector.stop();
    };
  }, [id, location.pathname]);
  
  // This component stays mounted while the nested routes change
  // The rundown ID is available in context for all child components
  return (
    <div className="h-screen overflow-hidden">
      <RundownLayoutRouter />
    </div>
  );
};

export default RundownLayout;