
import React from 'react';
import RundownIndexContent from '@/components/RundownIndexContent';

interface IndexProps {
  isDemoMode?: boolean;
}

const Index = ({ isDemoMode = false }: IndexProps) => {
  return (
    <div className="h-screen overflow-hidden">
      <RundownIndexContent isDemoMode={isDemoMode} />
    </div>
  );
};

export default Index;
