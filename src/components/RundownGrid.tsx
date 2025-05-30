
import React, { useState, useEffect } from 'react';
import { Plus, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import RundownHeader from './RundownHeader';
import RundownRow from './RundownRow';
import RundownFooter from './RundownFooter';
import ColumnManager from './ColumnManager';
import { useRundownItems } from '@/hooks/useRundownItems';
import { useColumnsManager } from '@/hooks/useColumnsManager';
import { useCellNavigation } from '@/hooks/useCellNavigation';
import { useDragAndDrop } from '@/hooks/useDragAndDrop';
import { useTimeCalculations } from '@/hooks/useTimeCalculations';
import { useColorPicker } from '@/hooks/useColorPicker';

const RundownGrid = () => {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [showColumnManager, setShowColumnManager] = useState(false);

  const {
    items,
    setItems,
    updateItem,
    addRow,
    addHeader,
    deleteRow,
    getRowNumber
  } = useRundownItems();

  const {
    columns,
    handleAddColumn,
    handleReorderColumns,
    handleDeleteColumn
  } = useColumnsManager();

  const {
    selectedCell,
    cellRefs,
    handleCellClick,
    handleKeyDown
  } = useCellNavigation(columns, items);

  const {
    draggedItemIndex,
    handleDragStart,
    handleDragOver,
    handleDrop
  } = useDragAndDrop(items, setItems);

  const {
    calculateEndTime,
    getRowStatus
  } = useTimeCalculations(items, updateItem);

  const {
    showColorPicker,
    handleToggleColorPicker,
    handleColorSelect
  } = useColorPicker();

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const handleDeleteColumnWithCleanup = (columnId: string) => {
    handleDeleteColumn(columnId);
    // Remove the custom field data from all items
    setItems(prev => prev.map(item => {
      if (item.customFields) {
        const { [columnId]: removed, ...rest } = item.customFields;
        return { ...item, customFields: rest };
      }
      return item;
    }));
  };

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
          <RundownHeader currentTime={currentTime} />
          
          <div className="p-4 border-b bg-gray-50 flex space-x-2">
            <Button onClick={() => addRow(calculateEndTime)} className="flex items-center space-x-2">
              <Plus className="h-4 w-4" />
              <span>Add Segment</span>
            </Button>
            <Button onClick={addHeader} variant="outline" className="flex items-center space-x-2">
              <Plus className="h-4 w-4" />
              <span>Add Header</span>
            </Button>
            <Button onClick={() => setShowColumnManager(true)} variant="outline" className="flex items-center space-x-2">
              <Settings className="h-4 w-4" />
              <span>Manage Columns</span>
            </Button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-700 border-b-2 border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-white w-8">#</th>
                  {columns.map((column) => (
                    <th key={column.id} className={`px-4 py-3 text-left text-sm font-semibold text-white ${column.width}`}>
                      {column.name}
                    </th>
                  ))}
                  <th className="px-4 py-3 text-left text-sm font-semibold text-white w-24">Actions</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item, index) => (
                  <RundownRow
                    key={item.id}
                    item={item}
                    index={index}
                    rowNumber={getRowNumber(index)}
                    status={getRowStatus(item, currentTime)}
                    showColorPicker={showColorPicker}
                    cellRefs={cellRefs}
                    columns={columns}
                    onUpdateItem={updateItem}
                    onCellClick={handleCellClick}
                    onKeyDown={handleKeyDown}
                    onToggleColorPicker={handleToggleColorPicker}
                    onColorSelect={(id, color) => handleColorSelect(id, color, updateItem)}
                    onDeleteRow={deleteRow}
                    onDragStart={handleDragStart}
                    onDragOver={handleDragOver}
                    onDrop={handleDrop}
                    isDragging={draggedItemIndex === index}
                  />
                ))}
              </tbody>
            </table>
          </div>
          
          <RundownFooter totalSegments={items.filter(item => !item.isHeader).length} />
        </div>
      </div>

      {showColumnManager && (
        <ColumnManager
          columns={columns}
          onAddColumn={handleAddColumn}
          onReorderColumns={handleReorderColumns}
          onDeleteColumn={handleDeleteColumnWithCleanup}
          onClose={() => setShowColumnManager(false)}
        />
      )}
    </div>
  );
};

export default RundownGrid;
