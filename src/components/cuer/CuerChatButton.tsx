
import React, { useState, useEffect, useRef } from 'react';
import { MessageCircle } from 'lucide-react';
import CuerChatPanel from './CuerChatPanel';
import { useDraggable } from '@/hooks/useDraggable';

interface CuerChatButtonProps {
  rundownData?: any;
  modDeps: import('@/hooks/useCuerModifications').CuerModDeps;
}

const CuerChatButton = ({ rundownData, modDeps }: CuerChatButtonProps) => {
  const [isChatOpen, setIsChatOpen] = useState(false);
  const hasInitialized = useRef(false);
  const lastViewportSize = useRef({ width: window.innerWidth, height: window.innerHeight });
  
  const { position, isDragging, dragRef, startDrag, handleClick, resetToBottomRight } = useDraggable({
    initialPosition: { x: window.innerWidth - 120, y: window.innerHeight - 80 },
    storageKey: 'cuerChatButtonPosition'
  });

  // Reset position only on initial rundown load (not on every data change)
  useEffect(() => {
    if (rundownData && !hasInitialized.current) {
      hasInitialized.current = true;
      setTimeout(() => {
        resetToBottomRight();
      }, 100);
    }
  }, [rundownData, resetToBottomRight]);

  // Reset position on viewport changes
  useEffect(() => {
    const handleResize = () => {
      const currentViewport = { width: window.innerWidth, height: window.innerHeight };
      const lastViewport = lastViewportSize.current;
      
      // Only reset if viewport changed significantly (more than 50px in either dimension)
      if (Math.abs(currentViewport.width - lastViewport.width) > 50 || 
          Math.abs(currentViewport.height - lastViewport.height) > 50) {
        resetToBottomRight();
        lastViewportSize.current = currentViewport;
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [resetToBottomRight]);

  return (
    <>
      {/* Floating Chat Button */}
      <div
        ref={dragRef}
        className="fixed z-40 h-12 px-4 rounded-full shadow-lg bg-blue-600 hover:bg-blue-700 flex items-center gap-2 text-white select-none cursor-grab transition-colors"
        style={{ 
          left: position.x,
          top: position.y,
          cursor: isDragging ? 'grabbing' : 'grab'
        }}
        onMouseDown={startDrag}
        onClick={handleClick(() => setIsChatOpen(true))}
      >
        <MessageCircle className="w-5 h-5 text-white" />
        <span className="text-sm font-medium text-white">Cuer AI</span>
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
