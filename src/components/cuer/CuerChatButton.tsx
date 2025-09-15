
import React, { useState, useEffect } from 'react';
import { MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import CuerChatPanel from './CuerChatPanel';
import { useDraggable } from '@/hooks/useDraggable';

interface CuerChatButtonProps {
  rundownData?: any;
  modDeps: import('@/hooks/useCuerModifications').CuerModDeps;
}

const CuerChatButton = ({ rundownData, modDeps }: CuerChatButtonProps) => {
  const [isChatOpen, setIsChatOpen] = useState(false);
  
  const { position, isDragging, dragRef, startDrag, handleClick, resetToBottomRight } = useDraggable({
    initialPosition: { x: window.innerWidth - 120, y: window.innerHeight - 80 },
    storageKey: 'cuerChatButtonPosition'
  });

  // Reset position when rundown data changes (when a rundown is opened)
  useEffect(() => {
    if (rundownData) {
      // Small delay to ensure DOM is updated
      setTimeout(() => {
        resetToBottomRight();
      }, 100);
    }
  }, [rundownData, resetToBottomRight]);

  return (
    <>
      {/* Floating Chat Button */}
      <div
        ref={dragRef}
        className="fixed z-40"
        style={{ 
          left: position.x,
          top: position.y,
          cursor: isDragging ? 'grabbing' : 'grab'
        }}
        onMouseDown={startDrag}
        onClick={handleClick(() => setIsChatOpen(true))}
      >
        <Button
          className="h-12 px-4 rounded-full shadow-lg bg-blue-600 hover:bg-blue-700 flex items-center gap-2 text-white select-none"
        >
          <MessageCircle className="w-5 h-5 text-white" />
          <span className="text-sm font-medium text-white">Cuer AI</span>
        </Button>
      </div>

      {/* Chat Panel */}
      <CuerChatPanel
        isOpen={isChatOpen}
        onClose={() => setIsChatOpen(false)}
        rundownData={rundownData}
        modDeps={modDeps}
      />
    </>
  );
};

export default CuerChatButton;
