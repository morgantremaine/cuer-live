
import React from 'react';
import { RundownItem } from '@/types/rundown';
import TeleprompterItem from './TeleprompterItem';

interface TeleprompterContentProps {
  containerRef: React.RefObject<HTMLDivElement>;
  isFullscreen: boolean;
  itemsWithScript: (RundownItem & { originalIndex: number })[];
  fontSize: number;
  getRowNumber: (index: number) => string;
}

const TeleprompterContent = ({
  containerRef,
  isFullscreen,
  itemsWithScript,
  fontSize,
  getRowNumber
}: TeleprompterContentProps) => {
  return (
    <div
      ref={containerRef}
      className="h-screen overflow-y-auto scrollbar-hide"
      style={{ 
        paddingTop: isFullscreen ? '20vh' : '120px', 
        paddingBottom: '80vh' 
      }}
    >
      <div className="w-full">
        {itemsWithScript.map((item) => (
          <TeleprompterItem
            key={item.id}
            item={item}
            fontSize={fontSize}
            getRowNumber={getRowNumber}
          />
        ))}
      </div>
    </div>
  );
};

export default TeleprompterContent;
