
import React from 'react';
import { GripVertical } from 'lucide-react';
import CuerChatPanelContainer from './CuerChatPanel/CuerChatPanelContainer';
import ApiKeySetupSection from './CuerChatPanel/ApiKeySetupSection';
import { useCuerChatPanelLogic } from './CuerChatPanel/useCuerChatPanelLogic';
import { useCuerModifications, CuerModDeps } from '@/hooks/useCuerModifications';
import { useDraggable } from '@/hooks/useDraggable';

interface CuerChatPanelProps {
  isOpen: boolean;
  onClose: () => void;
  rundownData?: any;
  modDeps: CuerModDeps;
}

const CuerChatPanel = ({ isOpen, onClose, rundownData, modDeps }: CuerChatPanelProps) => {
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
  
  const { applyModifications } = useCuerModifications(modDeps);
  
  const { position, isDragging, dragRef, startDrag } = useDraggable({
    initialPosition: { x: window.innerWidth - 400, y: window.innerHeight - 620 },
    storageKey: 'cuerChatPanelPosition'
  });

  if (!isOpen) return null;

  return (
    <div 
      ref={dragRef}
      className="fixed w-96 h-[600px] bg-white border border-gray-200 rounded-lg shadow-xl z-50 flex flex-col"
      style={{ 
        left: position.x,
        top: position.y,
        cursor: isDragging ? 'grabbing' : 'default'
      }}
    >
      {/* Drag Handle */}
      <div 
        className="flex items-center justify-center p-2 border-b border-gray-200 cursor-grab active:cursor-grabbing"
        onMouseDown={startDrag}
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
