
import React, { useState, useRef, useEffect } from 'react';
import CuerChatPanelContainer from './CuerChatPanel/CuerChatPanelContainer';
import ApiKeySetupSection from './CuerChatPanel/ApiKeySetupSection';
import { useCuerChatPanelLogic } from './CuerChatPanel/useCuerChatPanelLogic';
import { useCuerModifications } from '@/hooks/useCuerModifications';
import { GripVertical } from 'lucide-react';

interface CuerChatPanelProps {
  isOpen: boolean;
  onClose: () => void;
  rundownData?: any;
}

const CuerChatPanel = ({ isOpen, onClose, rundownData }: CuerChatPanelProps) => {
  const [position, setPosition] = useState({ x: window.innerWidth - 400, y: window.innerHeight - 650 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const panelRef = useRef<HTMLDivElement>(null);

  const {
    inputValue,
    setInputValue,
    showApiKeySetup,
    setShowApiKeySetup,
    messages,
    isLoading,
    isConnected,
    needsApiKeySetup,
    handleSendMessage,
    handleKeyDown,
    handleAnalyzeRundown,
    handleSettingsClick,
    clearChat
  } = useCuerChatPanelLogic(isOpen, rundownData);
  
  const { applyModifications } = useCuerModifications();

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!panelRef.current) return;
    
    const rect = panelRef.current.getBoundingClientRect();
    setDragOffset({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    });
    setIsDragging(true);
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (!isDragging) return;
    
    const newX = e.clientX - dragOffset.x;
    const newY = e.clientY - dragOffset.y;
    
    // Keep panel within viewport bounds
    const maxX = window.innerWidth - 384; // 384px = w-96
    const maxY = window.innerHeight - 600; // 600px = panel height
    
    setPosition({
      x: Math.max(0, Math.min(newX, maxX)),
      y: Math.max(0, Math.min(newY, maxY))
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, dragOffset]);

  // Constrain position within viewport on window resize
  useEffect(() => {
    const handleResize = () => {
      const maxX = window.innerWidth - 384;
      const maxY = window.innerHeight - 600;
      
      setPosition(prev => ({
        x: Math.max(0, Math.min(prev.x, maxX)),
        y: Math.max(0, Math.min(prev.y, maxY))
      }));
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  if (!isOpen) return null;

  return (
    <div 
      ref={panelRef}
      className="fixed w-96 h-[600px] bg-white border border-gray-200 rounded-lg shadow-xl z-50 flex flex-col"
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
        cursor: isDragging ? 'grabbing' : 'default'
      }}
    >
      {/* Drag handle */}
      <div 
        className="flex items-center justify-center h-6 bg-gray-50 rounded-t-lg border-b border-gray-200 cursor-grab hover:bg-gray-100 transition-colors"
        onMouseDown={handleMouseDown}
      >
        <GripVertical className="w-4 h-4 text-gray-400" />
      </div>

      {showApiKeySetup && needsApiKeySetup ? (
        <ApiKeySetupSection onClose={() => setShowApiKeySetup(false)} />
      ) : (
        <CuerChatPanelContainer
          isConnected={isConnected}
          needsApiKeySetup={needsApiKeySetup}
          messages={messages}
          inputValue={inputValue}
          setInputValue={setInputValue}
          isLoading={isLoading}
          rundownData={rundownData}
          onSettingsClick={handleSettingsClick}
          onClearChat={clearChat}
          onClose={onClose}
          onSendMessage={handleSendMessage}
          onKeyDown={handleKeyDown}
          onAnalyzeRundown={handleAnalyzeRundown}
          onApplyModifications={applyModifications}
        />
      )}
    </div>
  );
};

export default CuerChatPanel;
