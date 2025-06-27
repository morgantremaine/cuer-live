import React from 'react';
import { RundownItem } from '@/hooks/useRundownItems';
import { Column } from '@/hooks/useColumnsManager';
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { ColorPicker } from "@/components/ColorPicker";
import { GripVertical } from 'lucide-react';

interface RundownTableProps {
  items: RundownItem[];
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
  searchTerm?: string;
  caseSensitive?: boolean;
  currentMatchIndex?: number;
  matchCount?: number;
  matches?: any[];
  getColumnWidth: (column: Column) => string;
  updateColumnWidth: (columnId: string, width: number) => void;
  getRowNumber: (index: number) => string;
  getRowStatus: (item: RundownItem) => 'upcoming' | 'current' | 'completed' | 'header';
  getHeaderDuration: (itemId: string) => string;
  onUpdateItem: (id: string, field: string, value: string) => void;
  onCellClick: (itemId: string, field: string) => void;
  onKeyDown: (e: React.KeyboardEvent, itemId: string, field: string, itemIndex: number) => void;
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
  onPasteRows: () => void;
  onClearSelection: () => void;
  onAddRow: () => void;
  onAddHeader: () => void;
  onJumpToHere?: (segmentId: string) => void;
}

const RundownTable = ({
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
  searchTerm = '',
  caseSensitive = false,
  currentMatchIndex = 0,
  matchCount = 0,
  matches = [],
  getColumnWidth,
  updateColumnWidth,
  getRowNumber,
  getRowStatus,
  getHeaderDuration,
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
  onAddHeader,
  onJumpToHere
}: RundownTableProps) => {

  const getSearchMatch = (item: any, columnKey: string, index: number) => {
    if (!searchTerm) return null;

    const itemValue = String(item[columnKey] || '');
    const regex = new RegExp(searchTerm, caseSensitive ? 'g' : 'gi');
    const matchIndices = [];
    let match;

    while ((match = regex.exec(itemValue)) !== null) {
      matchIndices.push({
        index: match.index,
        length: match[0].length
      });
    }

    if (matchIndices.length === 0) return null;

    const currentMatch = matches?.find(m => m.itemId === item.id && m.columnKey === columnKey);
    const isCurrentMatch = currentMatch && currentMatch.index === index;

    return {
      indices: matchIndices,
      isCurrent: isCurrentMatch
    };
  };

  return (
    <Table className="w-full">
      <TableBody>
        {items.map((item, index) => {
          const itemId = item.id;
          const rowStatus = getRowStatus(item);
          const isHeader = rowStatus === 'header';
          const isSelected = selectedRows.has(itemId);
          const isBeingDragged = draggedItemIndex === index;
          const isDropTarget = dropTargetIndex === index;
          const isDragging = draggedItemIndex !== null;
          const isMultipleSelection = selectedRows.size > 1;

          // Determine if this row contains the current segment
          const isCurrentSegment = item.segmentId === currentSegmentId;

          return (
            <TableRow
              key={itemId}
              data-item-id={itemId}
              className={cn(
                "relative data-[state=selected]:bg-muted hover:bg-accent hover:text-accent-foreground",
                isHeader ? "bg-secondary text-secondary-foreground" : "",
                isSelected ? "bg-muted text-muted-foreground" : "",
                isCurrentSegment ? "ring-2 ring-primary" : "",
                isBeingDragged ? "opacity-50" : "",
                isDropTarget ? "bg-primary/50" : "",
                isDragging && !isBeingDragged && !isMultipleSelection ? "opacity-50" : "",
                rowStatus === 'completed' ? 'opacity-50 line-through' : '',
                rowStatus === 'upcoming' ? '' : '',
                rowStatus === 'current' ? 'font-bold' : '',
              )}
              style={{
                cursor: 'grab',
              }}
              draggable={!isHeader}
              onDragStart={(e) => onDragStart(e, index)}
              onDragOver={(e) => onDragOver(e, index)}
              onDragLeave={onDragLeave}
              onDrop={(e) => onDrop(e, index)}
            >
              <TableCell className="p-0 w-2">
                {!isHeader && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="p-0 h-8 w-8"
                    style={{ cursor: 'grab' }}
                  >
                    <GripVertical className="h-4 w-4" />
                  </Button>
                )}
              </TableCell>
              {visibleColumns.map((column, colIndex) => {
                const columnKey = column.key;
                const cellValue = item[columnKey] || '';
                const isEditable = column.isEditable !== false && !isHeader;
                const isColorColumn = columnKey === 'color' && !isHeader;
                const isStartTimeColumn = columnKey === 'startTime' && !isHeader;
                const isDurationColumn = columnKey === 'duration' && !isHeader;
                const isEndTimeColumn = columnKey === 'endTime' && !isHeader;
                const isNotesColumn = columnKey === 'notes' && !isHeader;
                const isScriptColumn = columnKey === 'script' && !isHeader;
                const isTalentColumn = columnKey === 'talent' && !isHeader;
                const isGfxColumn = columnKey === 'gfx' && !isHeader;
                const isVideoColumn = columnKey === 'video' && !isHeader;
                const isImagesColumn = columnKey === 'images' && !isHeader;
                const isSegmentNameColumn = columnKey === 'name' && !isHeader;
                const isFloatColumn = columnKey === 'isFloating' && !isHeader;
                const isNumberColumn = columnKey === 'number' && !isHeader;
                const isElapsedColumn = columnKey === 'elapsedTime' && !isHeader;

                const searchMatch = getSearchMatch(item, columnKey, index);

                return (
                  <TableCell
                    key={`${itemId}-${columnKey}`}
                    className={cn(
                      "p-0 relative",
                      isHeader ? "font-bold" : "",
                      isColorColumn ? "w-12" : "",
                      isFloatColumn ? "w-12" : "",
                      isNumberColumn ? "w-12" : "",
                      isElapsedColumn ? "w-24" : "",
                    )}
                    style={{
                      width: getColumnWidth(column),
                      minWidth: getColumnWidth(column),
                      maxWidth: getColumnWidth(column),
                    }}
                    onClick={(e) => {
                      if (!isHeader) {
                        onCellClick(itemId, columnKey);
                      }
                    }}
                  >
                    {isHeader && columnKey === 'number' && (
                      <span className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
                        #
                      </span>
                    )}
                    {isHeader && columnKey === 'isFloating' && (
                      <span className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
                        Float
                      </span>
                    )}
                    {!isEditable && !isColorColumn && !isFloatColumn && !isNumberColumn && (
                      <div className="px-2 py-1 whitespace-pre-line">
                        {searchMatch ? (
                          <>
                            {searchMatch.indices.map((match, matchIndex) => (
                              <React.Fragment key={matchIndex}>
                                {matchIndex > 0 ? itemValue.substring(searchMatch.indices[matchIndex - 1].index + searchMatch.indices[matchIndex - 1].length, match.index) : itemValue.substring(0, match.index)}
                                <mark className={searchMatch.isCurrent ? 'bg-primary text-primary-foreground' : 'bg-yellow-200'}>
                                  {itemValue.substring(match.index, match.index + match.length)}
                                </mark>
                              </React.Fragment>
                            ))}
                            {itemValue.substring(searchMatch.indices[searchMatch.indices.length - 1].index + searchMatch.indices[searchMatch.indices.length - 1].length)}
                          </>
                        ) : (
                          itemValue
                        )}
                      </div>
                    )}
                    {isSegmentNameColumn && isEditable && (
                      <Input
                        type="text"
                        defaultValue={cellValue}
                        className="h-8 rounded-none border-0 shadow-none focus-visible:ring-0 focus-visible:ring-transparent"
                        ref={(el) => {
                          if (el) {
                            cellRefs.current[`${itemId}-${columnKey}`] = el;
                          }
                        }}
                        onKeyDown={(e) => onKeyDown(e, itemId, columnKey, index)}
                        onBlur={(e) => onUpdateItem(itemId, columnKey, e.target.value)}
                      />
                    )}
                    {isTalentColumn && isEditable && (
                      <Input
                        type="text"
                        defaultValue={cellValue}
                        className="h-8 rounded-none border-0 shadow-none focus-visible:ring-0 focus-visible:ring-transparent"
                        ref={(el) => {
                          if (el) {
                            cellRefs.current[`${itemId}-${columnKey}`] = el;
                          }
                        }}
                         onKeyDown={(e) => onKeyDown(e, itemId, columnKey, index)}
                        onBlur={(e) => onUpdateItem(itemId, columnKey, e.target.value)}
                      />
                    )}
                    {isScriptColumn && isEditable && (
                      <Textarea
                        defaultValue={cellValue}
                        className="h-24 rounded-none border-0 shadow-none focus-visible:ring-0 focus-visible:ring-transparent resize-none"
                        ref={(el) => {
                          if (el) {
                            cellRefs.current[`${itemId}-${columnKey}`] = el;
                          }
                        }}
                         onKeyDown={(e) => onKeyDown(e, itemId, columnKey, index)}
                        onBlur={(e) => onUpdateItem(itemId, columnKey, e.target.value)}
                      />
                    )}
                    {isGfxColumn && isEditable && (
                      <Input
                        type="text"
                        defaultValue={cellValue}
                        className="h-8 rounded-none border-0 shadow-none focus-visible:ring-0 focus-visible:ring-transparent"
                        ref={(el) => {
                          if (el) {
                            cellRefs.current[`${itemId}-${columnKey}`] = el;
                          }
                        }}
                         onKeyDown={(e) => onKeyDown(e, itemId, columnKey, index)}
                        onBlur={(e) => onUpdateItem(itemId, columnKey, e.target.value)}
                      />
                    )}
                    {isVideoColumn && isEditable && (
                      <Input
                        type="text"
                        defaultValue={cellValue}
                        className="h-8 rounded-none border-0 shadow-none focus-visible:ring-0 focus-visible:ring-transparent"
                        ref={(el) => {
                          if (el) {
                            cellRefs.current[`${itemId}-${columnKey}`] = el;
                          }
                        }}
                         onKeyDown={(e) => onKeyDown(e, itemId, columnKey, index)}
                        onBlur={(e) => onUpdateItem(itemId, columnKey, e.target.value)}
                      />
                    )}
                    {isImagesColumn && isEditable && (
                      <Input
                        type="text"
                        defaultValue={cellValue}
                        className="h-8 rounded-none border-0 shadow-none focus-visible:ring-0 focus-visible:ring-transparent"
                        ref={(el) => {
                          if (el) {
                            cellRefs.current[`${itemId}-${columnKey}`] = el;
                          }
                        }}
                         onKeyDown={(e) => onKeyDown(e, itemId, columnKey, index)}
                        onBlur={(e) => onUpdateItem(itemId, columnKey, e.target.value)}
                      />
                    )}
                    {isDurationColumn && isEditable && (
                      <Input
                        type="text"
                        defaultValue={cellValue}
                        className="h-8 rounded-none border-0 shadow-none focus-visible:ring-0 focus-visible:ring-transparent"
                        ref={(el) => {
                          if (el) {
                            cellRefs.current[`${itemId}-${columnKey}`] = el;
                          }
                        }}
                         onKeyDown={(e) => onKeyDown(e, itemId, columnKey, index)}
                        onBlur={(e) => onUpdateItem(itemId, columnKey, e.target.value)}
                      />
                    )}
                    {isStartTimeColumn && isEditable && (
                      <Input
                        type="text"
                        defaultValue={cellValue}
                        className="h-8 rounded-none border-0 shadow-none focus-visible:ring-0 focus-visible:ring-transparent"
                        ref={(el) => {
                          if (el) {
                            cellRefs.current[`${itemId}-${columnKey}`] = el;
                          }
                        }}
                         onKeyDown={(e) => onKeyDown(e, itemId, columnKey, index)}
                        onBlur={(e) => onUpdateItem(itemId, columnKey, e.target.value)}
                      />
                    )}
                    {isEndTimeColumn && isEditable && (
                      <div className="px-2 py-1 whitespace-pre-line">
                        {item.endTime}
                      </div>
                    )}
                    {isNotesColumn && isEditable && (
                      <Textarea
                        defaultValue={cellValue}
                        className="h-24 rounded-none border-0 shadow-none focus-visible:ring-0 focus-visible:ring-transparent resize-none"
                        ref={(el) => {
                          if (el) {
                            cellRefs.current[`${itemId}-${columnKey}`] = el;
                          }
                        }}
                         onKeyDown={(e) => onKeyDown(e, itemId, columnKey, index)}
                        onBlur={(e) => onUpdateItem(itemId, columnKey, e.target.value)}
                      />
                    )}
                    {isColorColumn && (
                      <div className="flex items-center justify-center h-full">
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-8 w-8 rounded-full p-0"
                          style={{ backgroundColor: item.color || 'transparent' }}
                          onClick={() => onToggleColorPicker(itemId)}
                        >
                          {showColorPicker === itemId ? 'Close' : 'Color'}
                        </Button>
                        {showColorPicker === itemId && (
                          <ColorPicker
                            color={item.color || '#ffffff'}
                            onColorSelect={(color) => onColorSelect(itemId, color)}
                            onClose={() => onToggleColorPicker(itemId)}
                          />
                        )}
                      </div>
                    )}
                    {isFloatColumn && (
                      <div className="flex items-center justify-center h-full">
                        <Checkbox
                          checked={item.isFloating || false}
                          onCheckedChange={() => onToggleFloat(itemId)}
                        />
                      </div>
                    )}
                    {isNumberColumn && (
                      <div className="px-2 py-1 whitespace-pre-line">
                        {getRowNumber(index)}
                      </div>
                    )}
                  </TableCell>
                );
              })}
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
};

export default RundownTable;
