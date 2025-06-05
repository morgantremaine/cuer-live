
import React from 'react';
import { useParams } from 'react-router-dom';
import RundownLoadingStates from './RundownLoadingStates';
import RundownMainInterface from './RundownMainInterface';
import { useNewRundownCreation } from '@/hooks/useNewRundownCreation';

const RundownIndexContent = () => {
  const params = useParams<{ id: string }>();
  const { isCreatingNew, savedRundowns, loading } = useNewRundownCreation();

  const hasParamsId = Boolean(params.id);

  // Handle loading states first
  const loadingComponent = (
    <RundownLoadingStates 
      isCreatingNew={isCreatingNew}
      loading={loading}
      hasParamsId={hasParamsId}
    />
  );

  if (loadingComponent) {
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
