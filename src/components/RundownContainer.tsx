
import React from 'react';
import RundownLayoutWrapper from './RundownLayoutWrapper';
import RundownHeaderPropsAdapter from './RundownHeaderPropsAdapter';
import RundownMainPropsAdapter from './RundownMainPropsAdapter';
import { RundownContainerProps } from '@/types/rundownContainer';

const RundownContainer = (props: RundownContainerProps) => {
  console.log('RundownContainer: handleRenameColumn available:', !!props.handleRenameColumn);
  console.log('RundownContainer: All column-related props:', {
    handleAddColumn: !!props.handleAddColumn,
    handleReorderColumns: !!props.handleReorderColumns,
    handleDeleteColumnWithCleanup: !!props.handleDeleteColumnWithCleanup,
    handleRenameColumn: !!props.handleRenameColumn,
    handleToggleColumnVisibility: !!props.handleToggleColumnVisibility,
    handleLoadLayout: !!props.handleLoadLayout
  });
  
  return (
    <RundownLayoutWrapper>
      <RundownHeaderPropsAdapter props={props} />
      <RundownMainPropsAdapter props={props} />
    </RundownLayoutWrapper>
  );
};

export default RundownContainer;
