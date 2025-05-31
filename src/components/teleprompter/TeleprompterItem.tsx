
import React from 'react';
import { RundownItem, isHeaderItem } from '@/types/rundown';

interface TeleprompterItemProps {
  item: RundownItem & { originalIndex: number };
  fontSize: number;
  isUppercase: boolean;
  getRowNumber: (index: number) => string;
}

const TeleprompterItem = ({ item, fontSize, isUppercase, getRowNumber }: TeleprompterItemProps) => {
  const formatText = (text: string) => {
    return isUppercase ? text.toUpperCase() : text;
  };

  if (isHeaderItem(item)) {
    return (
      <div className="mb-12">
        <h2 
          className="font-bold text-left mb-8"
          style={{ fontSize: `${fontSize + 8}px` }}
        >
          [{getRowNumber(item.originalIndex)} {formatText((item.segmentName || item.name)?.toUpperCase() || 'HEADER')}]
        </h2>
      </div>
    );
  }

  return (
    <div className="mb-16">
      {/* Segment Title */}
      <div 
        className="text-left mb-6"
        style={{ fontSize: `${fontSize + 4}px` }}
      >
        [{getRowNumber(item.originalIndex)} {formatText((item.segmentName || item.name)?.toUpperCase() || 'UNTITLED')}]
      </div>

      {/* Talent */}
      {item.talent && (
        <div 
          className="text-left mb-8 bg-white text-black py-2 px-4 inline-block rounded"
          style={{ fontSize: `${fontSize}px` }}
        >
          {formatText(item.talent)}
        </div>
      )}

      {/* Script */}
      <div 
        className="leading-relaxed text-left whitespace-pre-wrap"
        style={{ 
          fontSize: `${fontSize}px`,
          lineHeight: '1.6'
        }}
      >
        {formatText(item.script || '')}
      </div>
    </div>
  );
};

export default TeleprompterItem;
