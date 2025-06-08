
import React from 'react';
import RundownContainer from '@/components/RundownContainer';
import CuerChatButton from '@/components/cuer/CuerChatButton';
import RealtimeConnectionProvider from '@/components/RealtimeConnectionProvider';
import { useRundownStateCoordination } from '@/hooks/useRundownStateCoordination';

const RundownIndexContent = () => {
  const {
    coreState,
    interactions,
    uiState
  } = useRundownStateCoordination();

  // Prepare rundown data for Cuer AI
  const rundownData = {
    id: coreState.rundownId,
    title: coreState.rundownTitle,
    startTime: coreState.rundownStartTime,
    timezone: coreState.timezone,
    items: coreState.items,
    columns: coreState.columns,
    totalRuntime: coreState.calculateTotalRuntime()
  };

  return (
    <RealtimeConnectionProvider
      isConnected={coreState.isConnected || false}
      isProcessingUpdate={coreState.isProcessingRealtimeUpdate || false}
    >
      <RundownContainer />
      
      <CuerChatButton rundownData={rundownData} />
    </RealtimeConnectionProvider>
  );
};

export default RundownIndexContent;
