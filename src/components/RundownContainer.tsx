
import React from 'react';
import { useRundownStateCoordination } from '@/hooks/useRundownStateCoordination';
import RundownLayoutWrapper from './RundownLayoutWrapper';
import RundownHeaderSection from './RundownHeaderSection';
import RundownMainContent from './RundownMainContent';

const RundownContainer = () => {
  const { coreState, interactions, uiState } = useRundownStateCoordination();

  return (
    <RundownLayoutWrapper rundownId={coreState.rundownId} showActiveUsers={true}>
      <div className="flex flex-col h-full">
        <RundownHeaderSection 
          coreState={coreState}
          interactions={interactions}
          uiState={uiState}
        />
        <RundownMainContent 
          coreState={coreState}
          interactions={interactions}
          uiState={uiState}
        />
      </div>
    </RundownLayoutWrapper>
  );
};

export default RundownContainer;
