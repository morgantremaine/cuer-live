
import React from 'react';
import RundownLayoutWrapper from './RundownLayoutWrapper';
import RundownMainPropsAdapter from './RundownMainPropsAdapter';
import { RundownContainerProps } from '@/types/rundownContainer';
import { CellUpdateProvider } from '@/contexts/CellUpdateContext';
import { BroadcastProvider } from '@/contexts/BroadcastContext';
import { useAuth } from '@/hooks/useAuth';

const RundownContainer = (props: RundownContainerProps) => {
  const { user } = useAuth();
  const { rundownId } = props;
  
  if (!rundownId || !user?.id) {
    console.warn('⚠️ RundownContainer: Missing required data', { rundownId, userId: user?.id });
    return (
      <CellUpdateProvider>
        <RundownLayoutWrapper>
          <RundownMainPropsAdapter props={props} />
        </RundownLayoutWrapper>
      </CellUpdateProvider>
    );
  }

  return (
    <CellUpdateProvider>
      <BroadcastProvider rundownId={rundownId} userId={user.id}>
        <RundownLayoutWrapper>
          <RundownMainPropsAdapter props={props} />
        </RundownLayoutWrapper>
      </BroadcastProvider>
    </CellUpdateProvider>
  );
};

export default RundownContainer;
