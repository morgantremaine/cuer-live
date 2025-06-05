
import React from 'react';
import { useParams } from 'react-router-dom';
import RundownLoadingStates from './RundownLoadingStates';
import RundownMainInterface from './RundownMainInterface';
import { useNewRundownCreation } from '@/hooks/useNewRundownCreation';

const RundownIndexContent = () => {
  const params = useParams<{ id: string }>();
  const { isCreatingNew, savedRundowns, loading } = useNewRundownCreation();

  const hasParamsId = Boolean(params.id);

  // Check if we should show loading states by calling the component
  const shouldShowLoading = (!hasParamsId && (isCreatingNew || loading)) || 
                           (!hasParamsId && !isCreatingNew && !loading);

  // If we should show loading states, render the loading component
  if (shouldShowLoading) {
    return (
      <RundownLoadingStates 
        isCreatingNew={isCreatingNew}
        loading={loading}
        hasParamsId={hasParamsId}
      />
    );
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
