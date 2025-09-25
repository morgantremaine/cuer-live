
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
        <div className="w-24 h-24 bg-gradient-to-br from-slate-700/50 to-slate-800/50 rounded-2xl flex items-center justify-center mb-6 mx-auto border border-slate-600/50 shadow-lg">
          <div className="w-12 h-12 border-3 border-slate-500 border-dashed rounded-xl flex items-center justify-center">
            <div className="w-6 h-6 bg-gradient-to-br from-blue-400/50 to-purple-400/50 rounded-lg"></div>
          </div>
        </div>
        <h3 className="text-xl font-semibold text-white mb-3">No Lists Created</h3>
        <p className="text-slate-400 mb-8 leading-relaxed">Create your first asset list to organize and track rundown items efficiently</p>
        <AddListDialog
          availableColumns={availableColumns}
          onAddList={onAddList}
        />
      </div>
    </div>
  );
};

export default BlueprintEmptyState;
