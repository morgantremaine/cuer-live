
import React from 'react';
import { getContrastTextColor } from '@/utils/colorUtils';

interface SharedCellRendererProps {
  column: any;
  item: any;
  currentSegmentId?: string | null;
  backgroundColor?: string;
}

const SharedCellRenderer = ({
  column,
  item,
  currentSegmentId,
  backgroundColor
}: SharedCellRendererProps) => {
  // Get the current value for this cell
  const getCellValue = () => {
    if (column.isCustom) {
      return item.customFields?.[column.key] || '';
    }
    
    switch (column.key) {
      case 'segmentName':
        return item.name || '';
      case 'name':
        return item.name || '';
      case 'duration':
        return item.duration || '';
      case 'startTime':
        return item.calculatedStartTime || item.startTime || '';
      case 'endTime':
        return item.calculatedEndTime || item.endTime || '';
      case 'elapsedTime':
        return item.calculatedElapsedTime || item.elapsedTime || '';
      case 'talent':
        return item.talent || '';
      case 'script':
        return item.script || '';
      case 'notes':
        return item.notes || '';
      case 'gfx':
        return item.gfx || '';
      case 'video':
        return item.video || '';
      case 'images':
        return item.images || '';
      default:
        return (item as any)[column.key] || '';
    }
  };

  const value = getCellValue();

  // Check if this is the current segment and segment name column for showcaller highlighting
  const isCurrentSegmentName = currentSegmentId === item.id && 
    (column.key === 'segmentName' || column.key === 'name');

  // Override colors for showcaller highlighting
  const showcallerBackgroundColor = isCurrentSegmentName ? '#3b82f6' : backgroundColor;
  const showcallerTextColor = isCurrentSegmentName ? '#ffffff' : (backgroundColor ? getContrastTextColor(backgroundColor) : undefined);

  // For showcaller highlighting on segment name, wrap with rounded corners
  if (isCurrentSegmentName) {
    return (
      <div 
        className="absolute inset-1 flex items-center px-3 py-1 rounded-md"
        style={{ 
          backgroundColor: showcallerBackgroundColor,
          color: showcallerTextColor,
          minHeight: 'calc(100% - 8px)',
          height: 'calc(100% - 8px)'
        }}
      >
        <div className="truncate w-full">
          {value}
        </div>
      </div>
    );
  }

  // Regular cell content
  return (
    <div 
      className="px-3 py-2 truncate"
      style={{ 
        backgroundColor: showcallerBackgroundColor,
        color: showcallerTextColor
      }}
    >
      {value}
    </div>
  );
};

export default SharedCellRenderer;
