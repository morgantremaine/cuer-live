
import { useState } from 'react';

export interface Column {
  id: string;
  name: string;
  key: string;
  width: string;
  isCustom: boolean;
  isEditable: boolean;
}

export const useColumnsManager = () => {
  const [columns, setColumns] = useState<Column[]>([
    { id: 'segmentName', name: 'Segment Name', key: 'segmentName', width: 'min-w-48', isCustom: false, isEditable: true },
    { id: 'duration', name: 'Duration', key: 'duration', width: 'w-24', isCustom: false, isEditable: true },
    { id: 'startTime', name: 'Start Time', key: 'startTime', width: 'w-24', isCustom: false, isEditable: true },
    { id: 'endTime', name: 'End Time', key: 'endTime', width: 'w-24', isCustom: false, isEditable: false },
    { id: 'notes', name: 'Notes', key: 'notes', width: 'min-w-64', isCustom: false, isEditable: true }
  ]);

  const handleAddColumn = (name: string) => {
    const newColumn: Column = {
      id: `custom_${Date.now()}`,
      name,
      key: `custom_${Date.now()}`,
      width: 'min-w-32',
      isCustom: true,
      isEditable: true
    };
    setColumns(prev => [...prev, newColumn]);
  };

  const handleReorderColumns = (newColumns: Column[]) => {
    setColumns(newColumns);
  };

  const handleDeleteColumn = (columnId: string) => {
    setColumns(prev => prev.filter(col => col.id !== columnId));
  };

  return {
    columns,
    handleAddColumn,
    handleReorderColumns,
    handleDeleteColumn
  };
};
