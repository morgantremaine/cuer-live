
import React from 'react';
import { Table, TableBody, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import ExternalReviewRow from './ExternalReviewRow';
import { getRowNumber } from '@/utils/sharedRundownUtils';
import { RundownItem } from '@/types/rundown';

interface ExternalReviewTableProps {
  items: RundownItem[];
  visibleColumns: any[];
  currentSegmentId: string | null;
  externalNotes: { [key: string]: string };
  onUpdateExternalNote: (itemId: string, note: string) => void;
}

const ExternalReviewTable = ({
  items,
  visibleColumns,
  currentSegmentId,
  externalNotes,
  onUpdateExternalNote
}: ExternalReviewTableProps) => {
  // Add external notes column if not already present
  const columnsWithExternalNotes = [...visibleColumns];
  if (!columnsWithExternalNotes.find(col => col.key === 'externalNotes')) {
    columnsWithExternalNotes.push({
      id: 'externalNotes',
      name: 'External Notes',
      key: 'externalNotes',
      width: '300px',
      isCustom: false,
      isEditable: true,
      isVisible: true
    });
  }

  return (
    <div className="w-full overflow-auto border rounded-lg">
      <Table>
        <TableHeader>
          <TableRow className="bg-gray-50">
            <TableHead className="w-16 text-center font-semibold">#</TableHead>
            {columnsWithExternalNotes.map((column) => (
              <TableHead 
                key={column.id} 
                className="font-semibold"
                style={{ width: column.width }}
              >
                {column.name}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((item, index) => (
            <ExternalReviewRow
              key={item.id}
              item={item}
              index={index}
              rowNumber={getRowNumber(index, items)}
              columns={columnsWithExternalNotes}
              isCurrentSegment={item.id === currentSegmentId}
              externalNote={externalNotes[item.id] || ''}
              onUpdateExternalNote={(note) => onUpdateExternalNote(item.id, note)}
            />
          ))}
        </TableBody>
      </Table>
    </div>
  );
};

export default ExternalReviewTable;
