
import React, { useState } from 'react';
import RundownIndexContent from '@/components/RundownIndexContent';

const Index = () => {
  const [autoScroll, setAutoScroll] = useState(() => {
    // Get auto-scroll preference from localStorage, default to true
    const saved = localStorage.getItem('rundownAutoScroll');
    return saved !== null ? JSON.parse(saved) : true;
  });

  // Handle auto-scroll toggle
  const handleToggleAutoScroll = (enabled: boolean) => {
    console.log('🔄 Main rundown auto-scroll toggled:', enabled);
    setAutoScroll(enabled);
    localStorage.setItem('rundownAutoScroll', JSON.stringify(enabled));
  };

  return (
    <div className="h-screen overflow-hidden">
      <RundownIndexContent 
        autoScroll={autoScroll}
        onToggleAutoScroll={handleToggleAutoScroll}
      />
    </div>
  );
};

export default Index;
