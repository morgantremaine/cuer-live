import React, { useState, useEffect } from 'react';
import { Plus, Settings, Copy, Clipboard, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import RundownHeader from './RundownHeader';
import RundownRow from './RundownRow';
import RundownFooter from './RundownFooter';
import ColumnManager from './ColumnManager';
import ResizableColumnHeader from './ResizableColumnHeader';
import ThemeToggle from './ThemeToggle';
import { useRundownItems } from '@/hooks/useRundownItems';
import { useColumnsManager } from '@/hooks/useColumnsManager';
import { useResizableColumns } from '@/hooks/useResizableColumns';
import { useCellNavigation } from '@/hooks/useCellNavigation';
import { useDragAndDrop } from '@/hooks/useDragAndDrop';
import { useTimeCalculations } from '@/hooks/useTimeCalculations';
import { useColorPicker } from '@/hooks/useColorPicker';
import { useMultiRowSelection } from '@/hooks/useMultiRowSelection';
import { useClipboard } from '@/hooks/useClipboard';

const RundownGrid = () => {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [timezone, setTimezone] = useState('America/New_York');
  const [showColumnManager, setShowColumnManager] = useState(false);

  const {
    items,
    setItems,
    updateItem,
    addRow,
    addHeader,
    deleteRow,
    deleteMultipleRows,
    addMultipleRows,
    getRowNumber,
    toggleFloatRow,
    calculateTotalRuntime,
    calculateHeaderDuration
  } = useRundownItems();

  const {
    columns,
    visibleColumns,
    handleAddColumn,
    handleReorderColumns,
    handleDeleteColumn,
    handleToggleColumnVisibility
  } = useColumnsManager();

  const {
    columnWidths,
    updateColumnWidth,
    getColumnWidth
  } = useResizableColumns(visibleColumns);

  const {
    selectedCell,
    cellRefs,
    handleCellClick,
    handleKeyDown
  } = useCellNavigation(visibleColumns, items);

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

  const {
    selectedRows,
    toggleRowSelection,
    clearSelection
  } = useMultiRowSelection();

  const {
    clipboardItems,
    copyItems,
    hasClipboardData
  } = useClipboard();

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const handleDeleteColumnWithCleanup = (columnId: string) => {
    handleDeleteColumn(columnId);
    setItems(prev => prev.map(item => {
      if (item.customFields) {
        const { [columnId]: removed, ...rest } = item.customFields;
        return { ...item, customFields: rest };
      }
      return item;
    }));
  };

  const handleCopySelectedRows = () => {
    const selectedItems = items.filter(item => selectedRows.has(item.id));
    copyItems(selectedItems);
    clearSelection();
  };

  const handlePasteRows = () => {
    if (hasClipboardData()) {
      addMultipleRows(clipboardItems, calculateEndTime);
    }
  };

  const handleDeleteSelectedRows = () => {
    deleteMultipleRows(Array.from(selectedRows));
    clearSelection();
  };

  const handleRowSelection = (itemId: string, index: number, isShiftClick: boolean, isCtrlClick: boolean) => {
    toggleRowSelection(itemId, index, isShiftClick, isCtrlClick, items);
  };

  const selectedCount = selectedRows.size;

  return (
    <div className="p-6 bg-gray-50 dark:bg-gray-900 min-h-screen transition-colors">
      <div className="max-w-7xl mx-auto">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg overflow-hidden">
          <RundownHeader 
            currentTime={currentTime} 
            timezone={timezone}
            onTimezoneChange={setTimezone}
            totalRuntime={calculateTotalRuntime()}
          />
          
          <div className="p-4 border-b bg-gray-50 dark:bg-gray-700 flex justify-between items-center">
            <div className="flex space-x-2">
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

            {selectedCount > 0 && (
              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-600 dark:text-gray-300">
                  {selectedCount} selected
                </span>
                <Button onClick={handleCopySelectedRows} variant="outline" size="sm">
                  <Copy className="h-4 w-4" />
                </Button>
                {hasClipboardData() && (
                  <Button onClick={handlePasteRows} variant="outline" size="sm">
                    <Clipboard className="h-4 w-4" />
                  </Button>
                )}
                <Button onClick={handleDeleteSelectedRows} variant="outline" size="sm">
                  <Trash2 className="h-4 w-4" />
                </Button>
                <Button onClick={clearSelection} variant="ghost" size="sm">
                  Clear
                </Button>
              </div>
            )}
            <ThemeToggle />
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-700 dark:bg-gray-800 border-b-2 border-gray-200 dark:border-gray-600">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-white" style={{ width: '60px' }}>#</th>
                  {visibleColumns.map((column) => (
                    <ResizableColumnHeader
                      key={column.id}
                      column={column}
                      width={getColumnWidth(column)}
                      onWidthChange={updateColumnWidth}
                    >
                      {column.name}
                    </ResizableColumnHeader>
                  ))}
                  <th className="px-4 py-3 text-left text-sm font-semibold text-white" style={{ width: '120px' }}>Actions</th>
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
                    columns={visibleColumns}
                    isSelected={selectedRows.has(item.id)}
                    headerDuration={item.isHeader ? calculateHeaderDuration(index) : ''}
                    onUpdateItem={updateItem}
                    onCellClick={handleCellClick}
                    onKeyDown={handleKeyDown}
                    onToggleColorPicker={handleToggleColorPicker}
                    onColorSelect={(id, color) => handleColorSelect(id, color, updateItem)}
                    onDeleteRow={deleteRow}
                    onToggleFloat={toggleFloatRow}
                    onRowSelect={handleRowSelection}
                    onDragStart={handleDragStart}
                    onDragOver={handleDragOver}
                    onDrop={handleDrop}
                    isDragging={draggedItemIndex === index}
                    getColumnWidth={getColumnWidth}
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
          onToggleColumnVisibility={handleToggleColumnVisibility}
          onClose={() => setShowColumnManager(false)}
        />
      )}
    </div>
  );
};

export default RundownGrid;
