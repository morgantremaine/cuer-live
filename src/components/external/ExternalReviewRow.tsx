
import React, { useState, useCallback } from 'react';
import { TableCell, TableRow } from '@/components/ui/table';
import { getCellValue } from '@/utils/sharedRundownUtils';
import { RundownItem } from '@/types/rundown';
import { Textarea } from '@/components/ui/textarea';

interface ExternalReviewRowProps {
  item: RundownItem;
  index: number;
  rowNumber: string;
  columns: any[];
  isCurrentSegment: boolean;
  externalNote: string;
  onUpdateExternalNote: (note: string) => void;
}

const ExternalReviewRow = ({
  item,
  index,
  rowNumber,
  columns,
  isCurrentSegment,
  externalNote,
  onUpdateExternalNote
}: ExternalReviewRowProps) => {
  const [noteValue, setNoteValue] = useState(externalNote);

  const handleNoteChange = useCallback((value: string) => {
    setNoteValue(value);
  }, []);

  const handleNoteBlur = useCallback(() => {
    if (noteValue !== externalNote) {
      onUpdateExternalNote(noteValue);
    }
  }, [noteValue, externalNote, onUpdateExternalNote]);

  const isHeader = item.type === 'header';
  
  const rowClasses = [
    isCurrentSegment && !isHeader ? 'bg-blue-50 border-l-4 border-blue-500' : '',
    isHeader ? 'bg-gray-100 font-semibold' : '',
    item.isFloating ? 'bg-yellow-50' : ''
  ].filter(Boolean).join(' ');

  return (
    <TableRow className={rowClasses}>
      <TableCell className="text-center text-sm font-mono w-16">
        {rowNumber}
      </TableCell>
      {columns.map((column) => (
        <TableCell key={column.id} className="p-2" style={{ width: column.width }}>
          {column.key === 'externalNotes' ? (
            <Textarea
              value={noteValue}
              onChange={(e) => handleNoteChange(e.target.value)}
              onBlur={handleNoteBlur}
              placeholder="Add your notes here..."
              className="min-h-[60px] resize-y"
            />
          ) : (
            <div className="p-2 text-sm">
              {getCellValue(item, column)}
            </div>
          )}
        </TableCell>
      ))}
    </TableRow>
  );
};

export default ExternalReviewRow;
