
import React from 'react';
import { useParams } from 'react-router-dom';
import RundownLoadingStates from './RundownLoadingStates';
import RundownMainInterface from './RundownMainInterface';
import { useNewRundownCreation } from '@/hooks/useNewRundownCreation';

const RundownIndexContent = () => {
  const params = useParams<{ id: string }>();
  const { isCreatingNew, savedRundowns, loading } = useNewRundownCreation();

  const hasParamsId = Boolean(params.id);

  // Check if we should show loading states
  const loadingComponent = (
    <RundownLoadingStates 
      isCreatingNew={isCreatingNew}
      loading={loading}
      hasParamsId={hasParamsId}
    />
  );

  // If loading component returns something (not null), show it
  if (loadingComponent && React.isValidElement(loadingComponent)) {
    return loadingComponent;
  }

  // Render the main rundown interface
  return (
    <RundownMainInterface 
      savedRundowns={savedRundowns}
      loading={loading}
    />
  );
};

export default RundownIndexContent;
