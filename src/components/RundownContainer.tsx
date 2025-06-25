
import React from 'react';
import { useRundownStateCoordination } from '@/hooks/useRundownStateCoordination';
import RundownHeaderPropsAdapter from './RundownHeaderPropsAdapter';
import RundownMainPropsAdapter from './RundownMainPropsAdapter';

const RundownContainer = () => {
  const { coreState, interactions, uiState } = useRundownStateCoordination();

  // DEBUG: Log the state being passed
  console.log('📦 RundownContainer - isVisuallyProcessingTeamUpdate:', coreState.isVisuallyProcessingTeamUpdate);

  if (coreState.isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading rundown...</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen">
      <RundownHeaderPropsAdapter 
        coreState={coreState}
        interactions={interactions}
        uiState={uiState}
      />
      <RundownMainPropsAdapter 
        coreState={coreState}
        interactions={interactions}
        uiState={uiState}
      />
    </div>
  );
};

export default RundownContainer;
