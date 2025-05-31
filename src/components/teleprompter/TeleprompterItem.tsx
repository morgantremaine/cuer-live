
import React from 'react';
import { RundownItem, isHeaderItem } from '@/types/rundown';

interface TeleprompterItemProps {
  item: RundownItem & { originalIndex: number };
  fontSize: number;
  getRowNumber: (index: number) => string;
}

const TeleprompterItem = ({ item, fontSize, getRowNumber }: TeleprompterItemProps) => {
  if (isHeaderItem(item)) {
    return (
      <div className="mb-12">
        <h2 
          className="font-bold text-left mb-8"
          style={{ fontSize: `${fontSize + 8}px` }}
        >
          [{getRowNumber(item.originalIndex)} {item.name?.toUpperCase() || 'HEADER'}]
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
        [{getRowNumber(item.originalIndex)} {item.name?.toUpperCase() || 'UNTITLED'}]
      </div>

      {/* Talent */}
      {item.talent && (
        <div 
          className="text-left mb-8 bg-white text-black py-2 px-4 inline-block rounded"
          style={{ fontSize: `${fontSize}px` }}
        >
          {item.talent}
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
        {item.script}
      </div>
    </div>
  );
};

export default TeleprompterItem;
