
import React from 'react';
import AddListDialog from './AddListDialog';

interface BlueprintEmptyStateProps {
  availableColumns: { name: string; value: string }[];
  onAddList: (name: string, sourceColumn: string) => void;
}

const BlueprintEmptyState = ({ availableColumns, onAddList }: BlueprintEmptyStateProps) => {
  return (
    <div className="text-center py-16 px-8">
      <div className="max-w-md mx-auto">
        <div className="mb-6">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center border border-primary/20">
            <svg className="w-8 h-8 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
          </div>
          <h3 className="text-xl font-semibold text-foreground mb-3">No Lists Created</h3>
          <p className="text-muted-foreground mb-6 leading-relaxed">
            Create your first asset list to organize and track your rundown elements efficiently
          </p>
        </div>
        <AddListDialog
          availableColumns={availableColumns}
          onAddList={onAddList}
        />
      </div>
    </div>
  );
};

export default BlueprintEmptyState;
