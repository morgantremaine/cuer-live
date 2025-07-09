import React from 'react';
import { useParams } from 'react-router-dom';
import RundownLayoutRouter from '@/components/RundownLayoutRouter';

const RundownLayout = () => {
  const { id } = useParams<{ id: string }>();
  
  // This component stays mounted while the nested routes change
  // The rundown ID is available in context for all child components
  return (
    <div className="h-screen overflow-hidden">
      <RundownLayoutRouter />
    </div>
  );
};

export default RundownLayout;