
import React from 'react';
import RundownIndexContent from '@/components/RundownIndexContent';
import { CellUpdateProvider } from '@/contexts/CellUpdateContext';

const Index = () => {
  return (
    <CellUpdateProvider>
      <div className="h-screen overflow-hidden">
        <RundownIndexContent />
      </div>
    </CellUpdateProvider>
  );
};

export default Index;
