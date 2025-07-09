
import React from 'react';
import AddListDialog from './AddListDialog';

interface BlueprintEmptyStateProps {
  availableColumns: { name: string; value: string }[];
  onAddList: (name: string, sourceColumn: string) => void;
}

const BlueprintEmptyState = ({ availableColumns, onAddList }: BlueprintEmptyStateProps) => {
  return (
    <div className="text-center py-12">
      <h3 className="text-lg font-medium mb-2">No Lists Created</h3>
      <p className="text-muted-foreground mb-4">Create your first asset list to get started</p>
      <AddListDialog
        availableColumns={availableColumns}
        onAddList={onAddList}
      />
    </div>
  );
};

export default BlueprintEmptyState;
