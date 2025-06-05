
import React from 'react';
import RundownIndexContent from '@/components/RundownIndexContent';
import CuerChatButton from '@/components/cuer/CuerChatButton';
import { useRundownGridState } from '@/hooks/useRundownGridState';

const Index = () => {
  const { rundownTitle, rundownStartTime, items } = useRundownGridState();

  return (
    <div className="min-h-screen bg-gray-50">
      <RundownIndexContent />
      
      {/* Add Cuer Chat Button */}
      <CuerChatButton 
        rundownData={{
          title: rundownTitle,
          startTime: rundownStartTime,
          items: items
        }}
      />
    </div>
  );
};

export default Index;
