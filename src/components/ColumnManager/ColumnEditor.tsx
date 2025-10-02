
import React, { useState } from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ColumnEditorProps {
  onAddColumn: (name: string) => void;
}

const ColumnEditor = ({ onAddColumn }: ColumnEditorProps) => {
  const [newColumnName, setNewColumnName] = useState('');
  const [showAddColumn, setShowAddColumn] = useState(false);

  const handleAddColumn = () => {
    if (newColumnName.trim()) {
      onAddColumn(newColumnName.trim());
      setNewColumnName('');
      setShowAddColumn(false);
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex space-x-2">
        <Button 
          onClick={() => setShowAddColumn(!showAddColumn)} 
          variant="outline" 
          size="sm"
          className="flex items-center space-x-1"
        >
          <Plus className="h-3 w-3" />
          <span>Add New Column</span>
        </Button>
      </div>

      {showAddColumn && (
        <div className="flex space-x-2 mt-2">
          <input
            type="text"
            value={newColumnName}
            onChange={(e) => setNewColumnName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAddColumn()}
            placeholder="Column name"
            className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
          />
          <Button onClick={handleAddColumn} size="sm">
            Add
          </Button>
        </div>
      )}
    </div>
  );
};

export default ColumnEditor;
