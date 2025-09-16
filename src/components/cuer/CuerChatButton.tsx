
import React, { useState, useEffect, useRef } from 'react';
import { MessageCircle } from 'lucide-react';
import CuerChatPanel from './CuerChatPanel';
import { useDraggable } from '@/hooks/useDraggable';
import { useSubscription } from '@/hooks/useSubscription';
import { useToast } from '@/hooks/use-toast';

interface CuerChatButtonProps {
  rundownData?: any;
  modDeps: import('@/hooks/useCuerModifications').CuerModDeps;
}

const CuerChatButton = ({ rundownData, modDeps }: CuerChatButtonProps) => {
  const [isChatOpen, setIsChatOpen] = useState(false);
  const { subscription_tier, access_type } = useSubscription();
  const { toast } = useToast();
  const hasInitialized = useRef(false);
  const lastViewportSize = useRef({ width: window.innerWidth, height: window.innerHeight });
  
  // Check if user is on free tier
  const isFreeUser = (subscription_tier === 'Free' || subscription_tier === null) && 
                    (access_type === 'free' || access_type === 'none');
  
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

  const handleChatOpen = () => {
    if (isFreeUser) {
      toast({
        title: "Upgrade Required",
        description: "Cuer AI is only available to Pro and Premium users. Upgrade your plan in Account Settings to unlock unlimited access.",
        variant: "destructive"
      });
      return;
    }
    setIsChatOpen(true);
  };

  return (
    <>
      {/* Floating Chat Button */}
      <div
        ref={dragRef}
        className={`fixed z-40 h-12 px-4 rounded-full shadow-lg flex items-center gap-2 text-white select-none cursor-grab transition-colors ${
          isFreeUser 
            ? 'bg-gray-400 hover:bg-gray-500' 
            : 'bg-blue-600 hover:bg-blue-700'
        }`}
        style={{ 
          left: position.x,
          top: position.y,
          cursor: isDragging ? 'grabbing' : 'grab'
        }}
        onMouseDown={startDrag}
        onClick={handleClick(handleChatOpen)}
      >
        <MessageCircle className="w-5 h-5 text-white" />
        <span className="text-sm font-medium text-white">Cuer AI</span>
      </div>

      {/* Chat Panel - only show if not free user */}
      {!isFreeUser && (
        <CuerChatPanel
          isOpen={isChatOpen}
          onClose={() => setIsChatOpen(false)}
          rundownData={rundownData}
          modDeps={modDeps}
        />
      )}
    </>
  );
};

export default CuerChatButton;
