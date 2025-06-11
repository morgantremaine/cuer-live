
import React from 'react';
import RundownTable from './RundownTable';
import RundownTableHeader from './RundownTableHeader';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { CalculatedRundownItem } from '@/utils/rundownCalculations';
import { Column } from '@/hooks/useColumnsManager';

interface RundownContentProps {
  items: CalculatedRundownItem[];
  visibleColumns: Column[];
  currentTime: Date;
  showColorPicker: string | null;
  cellRefs: React.MutableRefObject<{ [key: string]: HTMLInputElement | HTMLTextAreaElement }>;
  selectedRows: Set<string>;
  draggedItemIndex: number | null;
  isDraggingMultiple: boolean;
  dropTargetIndex: number | null;
  currentSegmentId: string | null;
  hasClipboardData?: boolean;
  selectedRowId?: string | null;
  getColumnWidth: (column: Column) => string;
  updateColumnWidth: (columnId: string, width: number) => void;
  getRowNumber: (index: number) => string;
  getRowStatus: (item: CalculatedRundownItem, currentTime: Date) => 'upcoming' | 'current' | 'completed';
  calculateHeaderDuration: (index: number) => string;
  onUpdateItem: (id: string, field: string, value: string) => void;
  onCellClick: (itemId: string, field: string) => void;
  onKeyDown: (e: React.KeyboardEvent, itemId: string, field: string) => void;
  onToggleColorPicker: (itemId: string) => void;
  onColorSelect: (id: string, color: string) => void;
  onDeleteRow: (id: string) => void;
  onToggleFloat: (id: string) => void;
  onRowSelect: (itemId: string, index: number, isShiftClick: boolean, isCtrlClick: boolean) => void;
  onDragStart: (e: React.DragEvent, index: number) => void;
  onDragOver: (e: React.DragEvent, index?: number) => void;
  onDragLeave: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent, index: number) => void;
  onCopySelectedRows: () => void;
  onDeleteSelectedRows: () => void;
  onPasteRows?: () => void;
  onClearSelection?: () => void;
  onAddRow?: () => void;
  onAddHeader?: () => void;
}

const RundownContent = ({
  items,
  visibleColumns,
  currentTime,
  showColorPicker,
  cellRefs,
  selectedRows,
  draggedItemIndex,
  isDraggingMultiple,
  dropTargetIndex,
  currentSegmentId,
  hasClipboardData = false,
  selectedRowId = null,
  getColumnWidth,
  updateColumnWidth,
  getRowNumber,
  getRowStatus,
  calculateHeaderDuration,
  onUpdateItem,
  onCellClick,
  onKeyDown,
  onToggleColorPicker,
  onColorSelect,
  onDeleteRow,
  onToggleFloat,
  onRowSelect,
  onDragStart,
  onDragOver,
  onDragLeave,
  onDrop,
  onCopySelectedRows,
  onDeleteSelectedRows,
  onPasteRows,
  onClearSelection,
  onAddRow,
  onAddHeader
}: RundownContentProps) => {

  return (
    <div className="relative bg-background">
      {/* Scrollable Content with Header Inside */}
      <ScrollArea className="w-full h-[calc(100vh-200px)] bg-background">
        <div className="min-w-max bg-background">
          {/* Single Table with Sticky Header */}
          <table className="w-full border-collapse border border-border">
            {/* Sticky Header */}
            <thead className="sticky top-0 z-20 bg-blue-600 dark:bg-blue-700">
              <tr>
                <th className="px-2 py-3 text-left text-sm font-semibold text-white border-r border-blue-500 bg-blue-600 w-12 min-w-12">
                  #
                </th>
                {visibleColumns.map((column, index) => {
                  const columnWidth = getColumnWidth(column);
                  
                  return (
                    <th 
                      key={column.id}
                      className="px-1 py-2 text-left text-sm font-semibold text-white relative select-none border-r border-blue-500 bg-blue-600"
                      style={{ width: columnWidth, minWidth: columnWidth }}
                    >
                      {index > 0 && (
                        <div className="absolute left-0 top-0 bottom-0 w-px bg-blue-500" />
                      )}
                      
                      <div className="truncate pr-2">
                        {column.name || column.key}
                      </div>
                      
                      <div 
                        className="absolute right-0 top-0 bottom-0 w-2 cursor-col-resize hover:bg-blue-400 transition-colors z-10"
                        onMouseDown={(e) => {
                          e.preventDefault();
                          
                          const startX = e.clientX;
                          const startWidth = parseInt(columnWidth);
                          
                          document.body.style.cursor = 'col-resize';
                          document.body.style.userSelect = 'none';

                          const handleMouseMove = (e: MouseEvent) => {
                            const deltaX = e.clientX - startX;
                            const newWidth = Math.max(50, startWidth + deltaX);
                            updateColumnWidth(column.id, newWidth);
                          };

                          const handleMouseUp = () => {
                            document.body.style.cursor = '';
                            document.body.style.userSelect = '';
                            document.removeEventListener('mousemove', handleMouseMove);
                            document.removeEventListener('mouseup', handleMouseUp);
                          };

                          document.addEventListener('mousemove', handleMouseMove);
                          document.addEventListener('mouseup', handleMouseUp);
                        }}
                      />
                    </th>
                  );
                })}
              </tr>
            </thead>

            {/* Table Body */}
            <tbody className="bg-background">
              {items.map((item, index) => {
                const rowNumber = getRowNumber(index);
                const status = getRowStatus(item, currentTime);
                const headerDuration = item.type === 'header' ? calculateHeaderDuration(index) : '';
                const isMultiSelected = selectedRows.has(item.id);
                const isSingleSelected = selectedRowId === item.id;
                const isActuallySelected = isMultiSelected || isSingleSelected;
                const isDragging = draggedItemIndex === index;
                const isCurrentlyPlaying = item.id === currentSegmentId;

                return (
                  <React.Fragment key={item.id}>
                    {/* Show drop indicator line ABOVE this row if it's the drop target */}
                    {dropTargetIndex === index && (
                      <tr>
                        <td colSpan={visibleColumns.length + 1} className="p-0">
                          <div className="h-0.5 bg-gray-400 w-full relative z-50"></div>
                        </td>
                      </tr>
                    )}
                    
                    {/* Show green line ABOVE the current segment */}
                    {isCurrentlyPlaying && (
                      <tr>
                        <td colSpan={visibleColumns.length + 1} className="p-0">
                          <div className="h-1 bg-green-500 w-full"></div>
                        </td>
                      </tr>
                    )}
                    
                    <tr 
                      className={`border-b border-border transition-colors cursor-pointer ${
                        isDragging ? 'opacity-50' : ''
                      } ${
                        isActuallySelected ? 'bg-blue-50 dark:bg-blue-900/50' : ''
                      }`}
                      style={{
                        backgroundColor: item.color && item.color !== '#FFFFFF' && item.color !== '#ffffff' ? item.color : undefined
                      }}
                      draggable
                      onDragStart={(e) => onDragStart(e, index)}
                      onDragOver={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        onDragOver(e, index);
                      }}
                      onDrop={(e) => onDrop(e, index)}
                      onClick={(e) => {
                        if (!e.ctrlKey && !e.metaKey && !e.shiftKey) {
                          onRowSelect(item.id, index, false, false);
                        }
                      }}
                    >
                      <td 
                        className="px-2 py-1 text-sm font-mono align-middle border border-border w-12 min-w-12"
                        style={{ backgroundColor: item.color && item.color !== '#FFFFFF' && item.color !== '#ffffff' ? item.color : undefined }}
                      >
                        <div className="flex items-center space-x-1">
                          {isCurrentlyPlaying && item.type !== 'header' && (
                            <span className="h-4 w-4 text-blue-500 fill-blue-500 scale-125">▶</span>
                          )}
                          <span>{rowNumber}</span>
                        </div>
                      </td>
                      {visibleColumns.map((column) => {
                        const columnWidth = getColumnWidth(column);
                        
                        return (
                          <td
                            key={column.id}
                            className="align-middle border border-border"
                            style={{ 
                              width: columnWidth, 
                              minWidth: columnWidth,
                              backgroundColor: item.color && item.color !== '#FFFFFF' && item.color !== '#ffffff' ? item.color : undefined
                            }}
                          >
                            {column.key === 'segmentName' && item.type === 'header' ? (
                              <input
                                ref={el => el && (cellRefs.current[`${item.id}-segmentName`] = el)}
                                type="text"
                                value={item.name || ''}
                                onChange={(e) => onUpdateItem(item.id, 'name', e.target.value)}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onCellClick(item.id, 'name');
                                }}
                                onKeyDown={(e) => onKeyDown(e, item.id, 'name')}
                                className="w-full border border-border text-foreground focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring rounded px-2 py-1 text-base font-bold"
                                style={{ 
                                  backgroundColor: item.color && item.color !== '#FFFFFF' && item.color !== '#ffffff' ? item.color : 'var(--background)'
                                }}
                              />
                            ) : column.key === 'duration' && item.type === 'header' ? (
                              <span className="text-sm text-muted-foreground font-mono px-2 py-1">
                                ({headerDuration})
                              </span>
                            ) : item.type === 'header' ? (
                              <div className="px-2 py-1 text-sm text-muted-foreground">
                                {/* Empty cell - headers don't use these columns */}
                              </div>
                            ) : (
                              <div className="px-2 py-1">
                                {column.key === 'segmentName' ? item.name || '' :
                                 column.key === 'duration' ? item.duration || '' :
                                 column.key === 'startTime' ? item.calculatedStartTime || '' :
                                 column.key === 'endTime' ? item.calculatedEndTime || '' :
                                 column.key === 'talent' ? item.talent || '' :
                                 column.key === 'script' ? item.script || '' :
                                 column.key === 'gfx' ? item.gfx || '' :
                                 column.key === 'video' ? item.video || '' :
                                 column.key === 'notes' ? item.notes || '' :
                                 item.customFields?.[column.key.replace('customFields.', '')] || ''}
                              </div>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                    
                    {/* Show drop indicator line AFTER the last row if it's the drop target */}
                    {dropTargetIndex === items.length && index === items.length - 1 && (
                      <tr>
                        <td colSpan={visibleColumns.length + 1} className="p-0">
                          <div className="h-0.5 bg-gray-400 w-full relative z-50"></div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
          
          {items.length === 0 && (
            <div className="p-4 text-center text-muted-foreground bg-background border border-border rounded">
              No items to display
            </div>
          )}
        </div>
        <ScrollBar orientation="horizontal" />
        <ScrollBar orientation="vertical" />
      </ScrollArea>
    </div>
  );
};

export default RundownContent;
