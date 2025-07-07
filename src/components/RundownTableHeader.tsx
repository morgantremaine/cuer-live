
import React from 'react';
import { DragDropContext, Droppable, Draggable, DropResult } from 'react-beautiful-dnd';
import ResizableColumnHeader from './ResizableColumnHeader';
import { Column } from '@/hooks/useColumnsManager';

interface RundownTableHeaderProps {
  visibleColumns: Column[];
  getColumnWidth: (column: Column) => string;
  updateColumnWidth: (columnId: string, width: number) => void;
  onReorderColumns?: (columns: Column[]) => void;
}

const RundownTableHeader = ({
  visibleColumns,
  getColumnWidth,
  updateColumnWidth,
  onReorderColumns
}: RundownTableHeaderProps) => {
  const handleDragEnd = (result: DropResult) => {
    if (!result.destination || !onReorderColumns) return;
    
    const sourceIndex = result.source.index;
    const destinationIndex = result.destination.index;
    
    if (sourceIndex === destinationIndex) return;
    
    const newColumns = Array.from(visibleColumns);
    const [reorderedColumn] = newColumns.splice(sourceIndex, 1);
    newColumns.splice(destinationIndex, 0, reorderedColumn);
    
    onReorderColumns(newColumns);
  };

  return (
    <thead className="bg-blue-600 dark:bg-blue-700">
      <tr>
        {/* Row number column - static, not draggable */}
        <th 
          className="px-2 py-1 text-left text-sm font-semibold text-white bg-blue-600"
          style={{ 
            width: '64px', 
            minWidth: '64px',
            maxWidth: '64px',
            borderRight: '1px solid hsl(var(--border))'
          }}
        >
          #
        </th>
        
        {/* Draggable columns */}
        <DragDropContext onDragEnd={handleDragEnd}>
          <Droppable droppableId="table-header" direction="horizontal">
            {(provided) => (
              <React.Fragment>
                {visibleColumns.map((column, index) => {
                  const columnWidth = getColumnWidth(column);
                  
                  return (
                    <Draggable 
                      key={column.id} 
                      draggableId={column.id} 
                      index={index}
                      isDragDisabled={!onReorderColumns}
                    >
                      {(provided, snapshot) => (
                        <ResizableColumnHeader
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                          {...provided.dragHandleProps}
                          column={column}
                          width={columnWidth}
                          onWidthChange={(columnId: string, width: number) => updateColumnWidth(columnId, width)}
                          showLeftSeparator={index > 0}
                          isDragging={snapshot.isDragging}
                          style={{
                            ...provided.draggableProps.style,
                          }}
                        >
                          {column.name || column.key}
                        </ResizableColumnHeader>
                      )}
                    </Draggable>
                  );
                })}
                {provided.placeholder}
              </React.Fragment>
            )}
          </Droppable>
        </DragDropContext>
      </tr>
    </thead>
  );
};

export default RundownTableHeader;
