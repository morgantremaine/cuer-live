
import React, { useState, useEffect } from 'react';
import { useCuerChat } from '@/hooks/useCuerChat';
import { useCuerModifications } from '@/hooks/useCuerModifications';
import ApiKeySetup from './ApiKeySetup';
import RundownModificationDialog from './RundownModificationDialog';
import CuerChatHeader from './CuerChatHeader';
import CuerQuickActions from './CuerQuickActions';
import CuerChatMessages from './CuerChatMessages';
import CuerChatInput from './CuerChatInput';

interface CuerChatPanelProps {
  isOpen: boolean;
  onClose: () => void;
  rundownData?: any;
}

const CuerChatPanel = ({ isOpen, onClose, rundownData }: CuerChatPanelProps) => {
  const [inputValue, setInputValue] = useState('');
  const [showApiKeySetup, setShowApiKeySetup] = useState(false);
  
  const {
    messages,
    isLoading,
    isConnected,
    pendingModifications,
    sendMessage,
    analyzeRundown,
    clearChat,
    checkConnection,
    setApiKey,
    hasApiKey,
    clearPendingModifications
  } = useCuerChat();

  const { applyModifications } = useCuerModifications();

  useEffect(() => {
    if (isOpen) {
      checkConnection();
    }
  }, [isOpen, checkConnection]);

  const handleSendMessage = async () => {
    if (!inputValue.trim() || isLoading) return;
    
    await sendMessage(inputValue);
    setInputValue('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleAnalyzeRundown = () => {
    if (rundownData) {
      analyzeRundown(rundownData);
    }
  };

  const handleApiKeySet = (apiKey: string) => {
    setApiKey(apiKey);
    setShowApiKeySetup(false);
  };

  const handleSettingsClick = () => {
    setShowApiKeySetup(true);
  };

  const handleConfirmModifications = () => {
    if (pendingModifications) {
      applyModifications(pendingModifications);
      clearPendingModifications();
    }
  };

  if (!isOpen) return null;

  const needsApiKeySetup = !hasApiKey() && isConnected === false;

  return (
    <>
      <div className="fixed right-4 bottom-4 w-96 h-[600px] bg-white border border-gray-200 rounded-lg shadow-xl z-50 flex flex-col">
        <CuerChatHeader
          isConnected={isConnected}
          needsApiKeySetup={needsApiKeySetup}
          messagesLength={messages.length}
          onSettingsClick={handleSettingsClick}
          onClearChat={clearChat}
          onClose={onClose}
        />

        {showApiKeySetup && needsApiKeySetup && (
          <div className="border-b border-gray-200 bg-white">
            <ApiKeySetup
              onApiKeySet={handleApiKeySet}
              onCancel={() => setShowApiKeySetup(false)}
            />
          </div>
        )}

        {!showApiKeySetup && isConnected === false && (
          <div className="p-3 bg-red-50 border-b border-red-200 text-sm text-red-700">
            {needsApiKeySetup ? 
              '⚠️ Please configure your API key to use Cuer.' :
              '⚠️ Connection failed. Please check your API key configuration.'
            }
          </div>
        )}

        {!showApiKeySetup && (
          <CuerQuickActions
            rundownData={rundownData}
            isConnected={isConnected}
            isLoading={isLoading}
            onAnalyzeRundown={handleAnalyzeRundown}
          />
        )}

        {!showApiKeySetup && (
          <div className="flex-1 flex flex-col min-h-0">
            <CuerChatMessages
              messages={messages}
              isLoading={isLoading}
              isConnected={isConnected}
            />
            
            <CuerChatInput
              inputValue={inputValue}
              setInputValue={setInputValue}
              isConnected={isConnected}
              isLoading={isLoading}
              onSendMessage={handleSendMessage}
              onKeyDown={handleKeyDown}
            />
          </div>
        )}
      </div>

      {pendingModifications && (
        <RundownModificationDialog
          isOpen={true}
          modifications={pendingModifications}
          onConfirm={handleConfirmModifications}
          onCancel={clearPendingModifications}
        />
      )}
    </>
  );
};

export default CuerChatPanel;
