
import React, { useState } from 'react';
import ResizableColumnHeader from './ResizableColumnHeader';
import { Column } from '@/hooks/useColumnsManager';

interface RundownTableHeaderProps {
  visibleColumns: Column[];
  getColumnWidth: (column: Column) => string;
  updateColumnWidth: (columnId: string, width: number) => void;
  onUpdateColumnName?: (columnId: string, newName: string) => void;
}

const RundownTableHeader = ({
  visibleColumns,
  getColumnWidth,
  updateColumnWidth,
  onUpdateColumnName
}: RundownTableHeaderProps) => {
  const [editingColumnId, setEditingColumnId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');

  const handleHeaderClick = (column: Column) => {
    if (column.isCustom) {
      setEditingColumnId(column.id);
      setEditingName(column.name);
    }
  };

  const handleNameSubmit = (columnId: string) => {
    if (onUpdateColumnName) {
      onUpdateColumnName(columnId, editingName);
    }
    setEditingColumnId(null);
  };

  const handleKeyDown = (e: React.KeyboardEvent, columnId: string) => {
    if (e.key === 'Enter') {
      handleNameSubmit(columnId);
    } else if (e.key === 'Escape') {
      setEditingColumnId(null);
    }
  };

  return (
    <thead className="bg-gray-700 dark:bg-gray-800 border-b-2 border-gray-200 dark:border-gray-600">
      <tr>
        <th className="px-4 py-3 text-left text-sm font-semibold text-white border-r border-gray-500" style={{ width: '60px' }}>
          #
        </th>
        {visibleColumns.map((column, index) => (
          <ResizableColumnHeader
            key={column.id}
            column={column}
            width={getColumnWidth(column)}
            onWidthChange={updateColumnWidth}
            showLeftSeparator={index > 0}
          >
            {column.isCustom && editingColumnId === column.id ? (
              <input
                type="text"
                value={editingName}
                onChange={(e) => setEditingName(e.target.value)}
                onBlur={() => handleNameSubmit(column.id)}
                onKeyDown={(e) => handleKeyDown(e, column.id)}
                className="bg-transparent text-white border-none outline-none w-full"
                autoFocus
                placeholder="Column name"
              />
            ) : (
              <span 
                onClick={() => handleHeaderClick(column)}
                className={`${column.isCustom ? 'cursor-pointer hover:bg-gray-600 px-2 py-1 rounded' : ''} ${
                  column.name === '' ? 'text-gray-400 italic' : ''
                }`}
              >
                {column.name || 'Untitled Column'}
              </span>
            )}
          </ResizableColumnHeader>
        ))}
        <th className="px-4 py-3 text-left text-sm font-semibold text-white border-l border-gray-500" style={{ width: '120px' }}>
          Actions
        </th>
      </tr>
    </thead>
  );
};

export default RundownTableHeader;
