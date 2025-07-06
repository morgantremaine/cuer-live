
import React from 'react';
import RundownIndexContent from '@/components/RundownIndexContent';
import StateTestPanel from '@/components/StateTestPanel';

const Index = () => {
  return (
    <div className="h-screen overflow-hidden">
      <RundownIndexContent />
      {process.env.NODE_ENV === 'development' && <StateTestPanel />}
    </div>
  );
};

export default Index;
