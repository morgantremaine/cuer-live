
import React from 'react';
import { RundownItem } from '@/types/rundown';
import TeleprompterItem from './TeleprompterItem';
import { ChevronRight } from 'lucide-react';

interface TeleprompterContentProps {
  containerRef: React.RefObject<HTMLDivElement>;
  isFullscreen: boolean;
  itemsWithScript: (RundownItem & { originalIndex: number })[];
  fontSize: number;
  isUppercase: boolean;
  getRowNumber: (index: number) => string;
}

const TeleprompterContent = ({
  containerRef,
  isFullscreen,
  itemsWithScript,
  fontSize,
  isUppercase,
  getRowNumber
}: TeleprompterContentProps) => {
  return (
    <div className="relative">
      {/* Speaking Indicator Arrow - Fixed Position */}
      <div 
        className="fixed left-4 z-30 pointer-events-none"
        style={{ 
          top: '25%',
          transform: 'translateY(-50%)'
        }}
      >
        <ChevronRight 
          className="text-white drop-shadow-lg" 
          size={56}
          strokeWidth={3}
        />
      </div>

      <div
        ref={containerRef}
        className="h-screen overflow-y-auto scrollbar-hide ml-20"
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
              isUppercase={isUppercase}
              getRowNumber={getRowNumber}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

export default TeleprompterContent;
