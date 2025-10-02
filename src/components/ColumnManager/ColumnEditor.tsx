
import React, { useState } from 'react';
import { Plus, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ColumnEditorProps {
  onAddColumn: (name: string, isCollapsible?: boolean) => void;
}

const ColumnEditor = ({ onAddColumn }: ColumnEditorProps) => {
  const [newColumnName, setNewColumnName] = useState('');
  const [showAddColumn, setShowAddColumn] = useState(false);
  const [isCollapsible, setIsCollapsible] = useState(false);

  const handleAddColumn = () => {
    if (newColumnName.trim()) {
      console.log('🎨 ColumnEditor: Adding column with isCollapsible =', isCollapsible);
      onAddColumn(newColumnName.trim(), isCollapsible);
      setNewColumnName('');
      setShowAddColumn(false);
      setIsCollapsible(false);
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex space-x-2">
        <Button 
          onClick={() => { 
            setShowAddColumn(!showAddColumn); 
            setIsCollapsible(false); 
          }} 
          variant="outline" 
          size="sm"
          className="flex items-center space-x-1"
        >
          <Plus className="h-3 w-3" />
          <span>Add New Column</span>
        </Button>
        <Button 
          onClick={() => { 
            setShowAddColumn(!showAddColumn); 
            setIsCollapsible(true); 
          }} 
          variant="outline" 
          size="sm"
          className="flex items-center space-x-1"
        >
          <ChevronDown className="h-3 w-3" />
          <span>Add Collapsible Column</span>
        </Button>
      </div>

      {showAddColumn && (
        <div className="space-y-2 mt-2">
          {isCollapsible && (
            <div className="flex items-center space-x-2 text-sm text-blue-600 dark:text-blue-400">
              <ChevronDown className="h-4 w-4" />
              <span>This column will be collapsible</span>
            </div>
          )}
          <div className="flex space-x-2">
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
        </div>
      )}
    </div>
  );
};

export default ColumnEditor;
